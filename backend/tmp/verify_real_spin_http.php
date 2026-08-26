<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db = Database::getInstance()->getConnection();
$base = 'http://127.0.0.1:8000';

function httpRequest(string $method, string $path, ?array $payload = null, ?string $token = null): array
{
    global $base;
    $ch = curl_init($base . $path);
    $headers = ['Content-Type: application/json', 'Origin: http://localhost:5175'];
    if ($token !== null) $headers[] = 'Authorization: Bearer ' . $token;
    $options = [CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers];
    if ($payload !== null) $options[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_UNESCAPED_SLASHES);
    curl_setopt_array($ch, $options);
    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $body = json_decode($raw, true);
    return ['http' => $code, 'body' => is_array($body) ? $body : ['raw' => $raw]];
}

function dbValue(string $sql, array $params = []): mixed
{
    global $db;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchColumn();
}

function dbRow(string $sql, array $params = []): ?array
{
    global $db;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

$email = 'spin_proof_' . time() . '@test.local';
$password = 'Password123';
$db->prepare('INSERT INTO users (full_name, email, password_hash, referral_code, email_verified_at, status, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), "active", NOW(), NOW())')->execute([
    'Spin Proof User',
    $email,
    password_hash($password, PASSWORD_BCRYPT),
    strtoupper(bin2hex(random_bytes(4))),
]);
$userId = (int) $db->lastInsertId();
$wallet = dbRow('SELECT * FROM wallets WHERE user_id = ?', [$userId]);
$walletId = (int) ($wallet['id'] ?? 0);
if ($walletId === 0) {
    $db->prepare('INSERT INTO wallets (user_id, balance_kobo, currency, created_at, updated_at) VALUES (?, 0, "NGN", NOW(), NOW())')->execute([$userId]);
    $walletId = (int) $db->lastInsertId();
}
$db->prepare('INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at) VALUES (?, ?, "admin_adjustment", ?, "completed", ?, ?, NOW(), NOW())')->execute([
    $userId,
    $walletId,
    100000000,
    'spin_seed_' . $userId . '_' . time(),
    json_encode(['test_seed' => true]),
]);
$db->prepare('UPDATE wallets SET balance_kobo = 100000000 WHERE id = ?')->execute([$walletId]);

$login = httpRequest('POST', '/api/auth/login', ['email' => $email, 'password' => $password]);
$token = $login['body']['data']['token'] ?? '';
if ($token === '') throw new RuntimeException('Login failed: ' . json_encode($login['body']));

$before = (int) dbValue('SELECT balance_kobo FROM wallets WHERE user_id = ?', [$userId]);
$outcomes = [];
$targetOutcomes = ['win' => false, 'lose' => false, 'try_again' => false];
for ($attempt = 1; $attempt <= 30 && count(array_filter($targetOutcomes)) < 3; $attempt++) {
    $beforeSpin = (int) dbValue('SELECT balance_kobo FROM wallets WHERE user_id = ?', [$userId]);
    $response = httpRequest('POST', '/api/spin/play', ['stake' => 25000], $token);
    if (($response['body']['success'] ?? false) !== true) {
        throw new RuntimeException('Spin failed on attempt ' . $attempt . ': ' . json_encode($response['body']));
    }
    $data = $response['body']['data'];
    $afterSpin = (int) dbValue('SELECT balance_kobo FROM wallets WHERE user_id = ?', [$userId]);
    $spin = dbRow('SELECT * FROM spins WHERE user_id = ? ORDER BY id DESC LIMIT 1', [$userId]);
    $transaction = dbRow('SELECT * FROM transactions WHERE user_id = ? AND reference = ? LIMIT 1', [$userId, $data['spinId'] ? dbValue('SELECT reference FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 1', [$userId]) : '']);
    $outcome = (string) $data['outcome'];
    $targetOutcomes[$outcome] = true;
    $outcomes[] = [
        'attempt' => $attempt,
        'outcome' => $outcome,
        'before_balance_kobo' => $beforeSpin,
        'result_kobo' => (int) $data['resultKobo'],
        'after_balance_kobo' => $afterSpin,
        'observed_delta_kobo' => $afterSpin - $beforeSpin,
        'api' => $data,
        'spin_row' => $spin,
        'transaction' => $transaction,
    ];
}
$final = (int) dbValue('SELECT balance_kobo FROM wallets WHERE user_id = ?', [$userId]);

echo json_encode([
    'user' => ['id' => $userId, 'email' => $email],
    'initial_balance_kobo' => $before,
    'outcomes_seen' => array_keys(array_filter($targetOutcomes)),
    'outcomes' => $outcomes,
    'final_balance_kobo' => $final,
    'spin_count' => (int) dbValue('SELECT COUNT(*) FROM spins WHERE user_id = ?', [$userId]),
    'spin_transaction_count' => (int) dbValue('SELECT COUNT(*) FROM transactions WHERE user_id = ? AND type IN ("spin_win", "spin_loss", "spin_try")', [$userId]),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
