<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db = Database::getInstance()->getConnection();
$base = 'http://127.0.0.1:8000';
$email = 'topup_approve_1787088001@test.local';

function request(string $method, string $path, ?array $payload = null, ?string $token = null): array
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
    $decoded = json_decode($raw, true);
    return ['http' => $code, 'body' => is_array($decoded) ? $decoded : ['raw' => $raw]];
}

function dbOne(string $sql, array $params = []): ?array
{
    global $db;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

$login = request('POST', '/api/auth/login', ['email' => $email, 'password' => 'Password123']);
$token = $login['body']['data']['token'] ?? '';
$user = dbOne('SELECT id, email FROM users WHERE email = ?', [$email]);
$userId = (int) $user['id'];
$progress = request('GET', '/api/wallet/withdraw-progress', null, $token);
$beforeBalance = (int) dbOne('SELECT balance_kobo FROM wallets WHERE user_id = ?', [$userId])['balance_kobo'];
$amountNaira = 1000;
$withdraw = request('POST', '/api/wallet/withdraw', [
    'amount' => $amountNaira,
    'bank_name' => 'Test Bank',
    'account_number' => '0123456789',
    'account_name' => 'Topup Admin Proof',
], $token);
$transaction = dbOne('SELECT * FROM transactions WHERE user_id = ? AND type = "withdrawal" ORDER BY id DESC LIMIT 1', [$userId]);
$requestRow = dbOne('SELECT * FROM withdrawal_requests WHERE user_id = ? ORDER BY id DESC LIMIT 1', [$userId]);
$afterBalance = (int) dbOne('SELECT balance_kobo FROM wallets WHERE user_id = ?', [$userId])['balance_kobo'];

echo json_encode([
    'user' => $user,
    'progress_http' => $progress['http'],
    'progress' => $progress['body']['data'] ?? $progress['body'],
    'before_balance_kobo' => $beforeBalance,
    'withdraw_http' => $withdraw['http'],
    'withdraw_response' => $withdraw['body'],
    'withdrawal_transaction' => $transaction,
    'withdrawal_request' => $requestRow,
    'after_balance_kobo' => $afterBalance,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
