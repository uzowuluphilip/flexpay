<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db = Database::getInstance()->getConnection();
$base = 'http://127.0.0.1:8000';

function request(string $method, string $path, ?array $payload = null): array
{
    global $base;
    $ch = curl_init($base . $path);
    $headers = ['Content-Type: application/json', 'Origin: http://localhost:5175'];
    $options = [CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers];
    if ($payload !== null) $options[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_UNESCAPED_SLASHES);
    curl_setopt_array($ch, $options);
    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $decoded = json_decode($raw, true);
    return ['code' => $code, 'body' => is_array($decoded) ? $decoded : ['raw' => $raw]];
}

$email = 'status_empty_' . time() . '@test.local';
$register = request('POST', '/api/auth/register', ['full_name' => 'Status Empty User', 'email' => $email, 'password' => 'Password123']);
$link = $register['body']['data']['verification_link'];
$parts = parse_url($link);
parse_str($parts['query'] ?? '', $query);
$verify = request('POST', '/api/auth/verify-email', ['token' => $query['token'] ?? '']);
$login = request('POST', '/api/auth/login', ['email' => $email, 'password' => 'Password123']);
$user = $db->prepare('SELECT id, email, email_verified_at FROM users WHERE email = ? LIMIT 1');
$user->execute([$email]);
$userRow = $user->fetch();
$activity = $db->prepare('SELECT COUNT(*) FROM activity_feed WHERE user_id = ?');
$activity->execute([(int) $userRow['id']]);
$transactions = $db->prepare('SELECT COUNT(*) FROM transactions WHERE user_id = ? AND status = "completed"');
$transactions->execute([(int) $userRow['id']]);

echo json_encode([
    'email' => $email,
    'password' => 'Password123',
    'user' => $userRow,
    'verification_http' => $verify['code'],
    'login_http' => $login['code'],
    'completed_transaction_count' => (int) $transactions->fetchColumn(),
    'activity_count' => (int) $activity->fetchColumn(),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
