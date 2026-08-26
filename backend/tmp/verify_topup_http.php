<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db = Database::getInstance()->getConnection();
$base = 'http://127.0.0.1:8000';

function request(string $method, string $path, ?array $payload = null, ?string $token = null, ?array $files = null): array
{
    global $base;
    $ch = curl_init($base . $path);
    $headers = ['Origin: http://localhost:5175'];
    if ($token !== null) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    $options = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
    ];
    if ($files !== null) {
        $form = $payload ?? [];
        foreach ($files as $key => $file) {
            $form[$key] = new CURLFile($file['path'], $file['type'], $file['name']);
        }
        $options[CURLOPT_POSTFIELDS] = $form;
    } elseif ($payload !== null) {
        $headers[] = 'Content-Type: application/json';
        $options[CURLOPT_HTTPHEADER] = $headers;
        $options[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_UNESCAPED_SLASHES);
    }
    curl_setopt_array($ch, $options);
    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $decoded = json_decode($raw, true);
    return ['code' => $code, 'body' => is_array($decoded) ? $decoded : ['raw' => $raw]];
}

function verifyLink(string $link): void
{
    $parts = parse_url($link);
    parse_str($parts['query'] ?? '', $query);
    $result = request('POST', '/api/auth/verify-email', ['token' => $query['token'] ?? '']);
    if (($result['body']['success'] ?? false) !== true) {
        throw new RuntimeException('Verification failed: ' . json_encode($result['body']));
    }
}

function dbOne(string $sql, array $params = []): ?array
{
    global $db;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

function dbValue(string $sql, array $params = []): mixed
{
    global $db;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchColumn();
}

$email = 'topup_http_' . time() . '@test.local';
$register = request('POST', '/api/auth/register', ['full_name' => 'Topup HTTP User', 'email' => $email, 'password' => 'Password123']);
if (($register['body']['success'] ?? false) !== true) {
    throw new RuntimeException('Registration failed: ' . json_encode($register['body']));
}
verifyLink($register['body']['data']['verification_link']);
$login = request('POST', '/api/auth/login', ['email' => $email, 'password' => 'Password123']);
$token = $login['body']['data']['token'] ?? '';
if ($token === '') {
    throw new RuntimeException('Login failed: ' . json_encode($login['body']));
}
$user = dbOne('SELECT * FROM users WHERE email = ?', [$email]);
$userId = (int) $user['id'];
$config = request('GET', '/api/wallet/topup-config', null, $token);
$before = (int) dbValue('SELECT balance_kobo FROM wallets WHERE user_id = ?', [$userId]);

$dir = sys_get_temp_dir() . '/flexpay-topup-test-' . bin2hex(random_bytes(4));
mkdir($dir, 0700, true);
$validPath = $dir . '/receipt.pdf';
$wrongPath = $dir . '/receipt.txt';
$largePath = $dir . '/receipt.jpg';
file_put_contents($validPath, "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");
file_put_contents($wrongPath, 'not an allowed receipt format');
$largeHandle = fopen($largePath, 'wb');
for ($i = 0; $i < 6 * 1024 * 1024; $i += 1024) {
    fwrite($largeHandle, str_repeat('x', 1024));
}
fclose($largeHandle);

$wrong = request('POST', '/api/wallet/topup/submit-receipt', ['amount' => '10000'], $token, ['receipt' => ['path' => $wrongPath, 'type' => 'text/plain', 'name' => 'receipt.txt']]);
$large = request('POST', '/api/wallet/topup/submit-receipt', ['amount' => '10000'], $token, ['receipt' => ['path' => $largePath, 'type' => 'image/jpeg', 'name' => 'receipt.jpg']]);
$valid = request('POST', '/api/wallet/topup/submit-receipt', ['amount' => '10000'], $token, ['receipt' => ['path' => $validPath, 'type' => 'application/pdf', 'name' => 'receipt.pdf']]);
$reference = $valid['body']['data']['reference'] ?? '';
$transaction = dbOne('SELECT * FROM transactions WHERE reference = ?', [$reference]);
$receipt = dbOne('SELECT * FROM topup_receipts WHERE transaction_id = ?', [(int) ($transaction['id'] ?? 0)]);
$afterPending = (int) dbValue('SELECT balance_kobo FROM wallets WHERE user_id = ?', [$userId]);

foreach ([$validPath, $wrongPath, $largePath] as $path) {
    @unlink($path);
}
@rmdir($dir);

echo json_encode([
    'user_id' => $userId,
    'config_http_code' => $config['code'],
    'config' => $config['body']['data'] ?? $config['body'],
    'before_balance_kobo' => $before,
    'wrong_type' => $wrong,
    'oversized' => $large,
    'valid_submit' => $valid,
    'pending_transaction' => $transaction,
    'pending_receipt' => $receipt,
    'after_pending_balance_kobo' => $afterPending,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
