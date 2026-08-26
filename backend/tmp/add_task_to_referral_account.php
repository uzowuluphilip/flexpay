<?php
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
    return ['code' => $code, 'body' => is_array($decoded) ? $decoded : ['raw' => $raw]];
}

$email = 'ref_balance_1786920293@test.local';
$login = request('POST', '/api/auth/login', ['email' => $email, 'password' => 'Password123']);
$token = $login['body']['data']['token'] ?? '';
if ($token === '') throw new RuntimeException('Login failed: ' . json_encode($login['body']));

$tasks = request('GET', '/api/tasks', null, $token);
$list = $tasks['body']['data']['tasks'] ?? [];
$task = null;
foreach ($list as $candidate) {
    if (empty($candidate['completed'])) {
        $task = $candidate;
        break;
    }
}
if ($task === null) throw new RuntimeException('No uncompleted task available: ' . json_encode($list));

$verified = request('POST', '/api/tasks/' . (int) $task['id'] . '/verify', null, $token);
$activity = request('GET', '/api/wallet/activity', null, $token);

$filtered = array_values(array_filter($activity['body']['data']['items'] ?? [], static function (array $item): bool {
    return in_array($item['type'] ?? '', ['task', 'referral'], true);
}));

echo json_encode([
    'account' => $email,
    'task' => $task,
    'verify_http' => $verified['code'],
    'verify_response' => $verified['body'],
    'task_and_referral_activity' => $filtered,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
