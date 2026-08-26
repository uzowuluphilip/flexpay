<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db = Database::getInstance()->getConnection();
$base = 'http://127.0.0.1:8000';
$userEmail = 'ref_balance_1786920293@test.local';

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

$user = dbOne('SELECT id, email FROM users WHERE email = ? LIMIT 1', [$userEmail]);
$login = request('POST', '/api/auth/login', ['email' => $userEmail, 'password' => 'Password123']);
$token = $login['body']['data']['token'] ?? '';
$userId = (int) $user['id'];
$beforeClaims = $db->query('SELECT COUNT(*) FROM user_achievements WHERE user_id = ' . $userId)->fetchColumn();
$beforeActivity = $db->query("SELECT COUNT(*) FROM activity_feed WHERE user_id = {$userId} AND type = 'achievement'")->fetchColumn();
$beforeReferralCount = $db->query("SELECT COUNT(*) FROM referrals WHERE referrer_user_id = {$userId} AND status = 'active'")->fetchColumn();
$beforeTaskCount = $db->query("SELECT COUNT(*) FROM task_completions WHERE user_id = {$userId}")->fetchColumn();

$api = request('GET', '/api/wallet/achievements', null, $token);
$afterClaims = $db->query('SELECT COUNT(*) FROM user_achievements WHERE user_id = ' . $userId)->fetchColumn();
$afterActivity = $db->query("SELECT COUNT(*) FROM activity_feed WHERE user_id = {$userId} AND type = 'achievement' ORDER BY id DESC")->fetchColumn();
$unlocks = $db->query("SELECT ua.*, a.code, a.title FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id WHERE ua.user_id = {$userId} ORDER BY ua.id ASC")->fetchAll();
$achievementActivity = $db->query("SELECT * FROM activity_feed WHERE user_id = {$userId} AND type = 'achievement' ORDER BY id DESC")->fetchAll();

$list = $api['body']['data']['list'] ?? [];
$selected = array_values(array_filter($list, static fn (array $item): bool => in_array($item['code'], ['connector', 'networker', 'task_master'], true)));

echo json_encode([
    'user' => $user,
    'api_http' => $api['http'],
    'before' => [
        'active_referrals' => (int) $beforeReferralCount,
        'completed_tasks' => (int) $beforeTaskCount,
        'user_achievement_rows' => (int) $beforeClaims,
        'achievement_activity_rows' => (int) $beforeActivity,
    ],
    'api_selected_progress' => $selected,
    'after' => [
        'user_achievement_rows' => (int) $afterClaims,
        'achievement_activity_rows' => (int) $afterActivity,
        'unlocks' => $unlocks,
        'activity' => $achievementActivity,
    ],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
