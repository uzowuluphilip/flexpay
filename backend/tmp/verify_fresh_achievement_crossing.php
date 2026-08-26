<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db = Database::getInstance()->getConnection();
$base = 'http://127.0.0.1:8000';

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

function loginAndVerify(string $email, string $password): string
{
    $login = request('POST', '/api/auth/login', ['email' => $email, 'password' => $password]);
    if (($login['body']['success'] ?? false) !== true) throw new RuntimeException('Login failed: ' . json_encode($login['body']));
    return (string) $login['body']['data']['token'];
}

$referrerEmail = 'achievement_crossing_' . time() . '@test.local';
$register = request('POST', '/api/auth/register', ['full_name' => 'Achievement Referrer', 'email' => $referrerEmail, 'password' => 'Password123']);
$link = $register['body']['data']['verification_link'];
$parts = parse_url($link);
parse_str($parts['query'] ?? '', $query);
request('POST', '/api/auth/verify-email', ['token' => $query['token'] ?? '']);
$referrerToken = loginAndVerify($referrerEmail, 'Password123');
$referrer = dbOne('SELECT id, referral_code FROM users WHERE email = ?', [$referrerEmail]);
$referrerId = (int) $referrer['id'];

$before = [
    'active_referrals' => (int) dbOne('SELECT COUNT(*) AS total FROM referrals WHERE referrer_user_id = ? AND status = "active"', [$referrerId])['total'],
    'user_achievements' => (int) dbOne('SELECT COUNT(*) AS total FROM user_achievements WHERE user_id = ?', [$referrerId])['total'],
    'achievement_activity' => (int) dbOne('SELECT COUNT(*) AS total FROM activity_feed WHERE user_id = ? AND type = "achievement"', [$referrerId])['total'],
];

$referredEmail = 'achievement_referred_' . time() . '@test.local';
$referredRegister = request('POST', '/api/auth/register', [
    'full_name' => 'Achievement Referred',
    'email' => $referredEmail,
    'password' => 'Password123',
    'referral_code' => $referrer['referral_code'],
]);
$referredLink = $referredRegister['body']['data']['verification_link'];
$referredParts = parse_url($referredLink);
parse_str($referredParts['query'] ?? '', $referredQuery);
request('POST', '/api/auth/verify-email', ['token' => $referredQuery['token'] ?? '']);
$referredToken = loginAndVerify($referredEmail, 'Password123');
$checkin = request('POST', '/api/wallet/checkin', null, $referredToken);

$afterActionBeforeApi = [
    'active_referrals' => (int) dbOne('SELECT COUNT(*) AS total FROM referrals WHERE referrer_user_id = ? AND status = "active"', [$referrerId])['total'],
    'user_achievements' => (int) dbOne('SELECT COUNT(*) AS total FROM user_achievements WHERE user_id = ?', [$referrerId])['total'],
    'achievement_activity' => (int) dbOne('SELECT COUNT(*) AS total FROM activity_feed WHERE user_id = ? AND type = "achievement"', [$referrerId])['total'],
];

$achievements = request('GET', '/api/wallet/achievements', null, $referrerToken);
$afterApi = [
    'user_achievements' => (int) dbOne('SELECT COUNT(*) AS total FROM user_achievements WHERE user_id = ?', [$referrerId])['total'],
    'achievement_activity' => (int) dbOne('SELECT COUNT(*) AS total FROM activity_feed WHERE user_id = ? AND type = "achievement"', [$referrerId])['total'],
];
$unlockedRows = $db->prepare('SELECT a.code, a.title, ua.unlocked_at FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id WHERE ua.user_id = ? ORDER BY ua.id');
$unlockedRows->execute([$referrerId]);
$afterApi['unlocked_rows'] = $unlockedRows->fetchAll();

$connector = array_values(array_filter($achievements['body']['data']['list'] ?? [], static fn (array $item): bool => $item['code'] === 'connector'));

unset($afterApi['unlocked_rows']);
echo json_encode([
    'referrer' => ['id' => $referrerId, 'email' => $referrerEmail],
    'before_referral_action' => $before,
    'referred_checkin_http' => $checkin['http'],
    'after_real_referral_action_before_achievements_api' => $afterActionBeforeApi,
    'achievements_api_http' => $achievements['http'],
    'connector_api_result' => $connector,
    'after_achievements_api' => $afterApi,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
