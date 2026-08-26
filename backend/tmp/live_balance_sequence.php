<?php
$base = 'http://127.0.0.1:8000';

function api(string $method, string $path, ?array $payload = null, ?string $token = null): array
{
    global $base;
    $ch = curl_init($base . $path);
    $headers = ['Content-Type: application/json', 'Origin: http://localhost:5175'];
    if ($token !== null && $token !== '') {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CUSTOMREQUEST => $method,
    ]);
    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_SLASHES));
    }
    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $decoded = json_decode($raw, true);
    return ['code' => $code, 'body' => is_array($decoded) ? $decoded : ['raw' => $raw]];
}

function register(string $name, string $email, string $pw, ?string $ref = null): array
{
    $payload = ['full_name' => $name, 'email' => $email, 'password' => $pw];
    if ($ref !== null && $ref !== '') {
        $payload['referral_code'] = $ref;
    }
    $res = api('POST', '/api/auth/register', $payload);
    if (($res['body']['success'] ?? false) !== true) {
        throw new RuntimeException('register failed: ' . json_encode($res['body']));
    }
    return $res['body'];
}

function verifyByLink(string $link): void
{
    $parts = parse_url($link);
    parse_str($parts['query'] ?? '', $query);
    $token = $query['token'] ?? null;
    if ($token === null) {
        throw new RuntimeException('missing token in verification link');
    }
    $res = api('POST', '/api/auth/verify-email', ['token' => $token]);
    if (($res['body']['success'] ?? false) !== true) {
        throw new RuntimeException('verify failed: ' . json_encode($res['body']));
    }
}

function login(string $email, string $pw): string
{
    $res = api('POST', '/api/auth/login', ['email' => $email, 'password' => $pw]);
    if (($res['body']['success'] ?? false) !== true || empty($res['body']['data']['token'])) {
        throw new RuntimeException('login failed: ' . json_encode($res['body']));
    }
    return (string) $res['body']['data']['token'];
}

function summary(string $label, string $token): void
{
    $res = api('GET', '/api/wallet/summary', null, $token);
    echo $label . ': ' . json_encode($res['body']['data'] ?? $res['body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

$accountEmail = 'balance_seq_' . time() . '@test.local';
$account = register('Balance Sequence User', $accountEmail, 'Password123');
verifyByLink($account['data']['verification_link']);
$token = login($accountEmail, 'Password123');
summary('after verification', $token);
$checkin = api('POST', '/api/wallet/checkin', null, $token);
echo 'after check-in response: ' . json_encode($checkin['body']['data'] ?? $checkin['body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
summary('after check-in', $token);

$referrerEmail = 'ref_balance_' . time() . '@test.local';
$referrer = register('Referrer User', $referrerEmail, 'Password123');
verifyByLink($referrer['data']['verification_link']);
$refToken = login($referrerEmail, 'Password123');
$refCode = $referrer['data']['user']['referral_code'];

$referredEmail = 'referred_balance_' . time() . '@test.local';
$referred = register('Referred User', $referredEmail, 'Password123', $refCode);
verifyByLink($referred['data']['verification_link']);
$referredToken = login($referredEmail, 'Password123');
$referredCheckin = api('POST', '/api/wallet/checkin', null, $referredToken);
echo 'referred check-in response: ' . json_encode($referredCheckin['body']['data'] ?? $referredCheckin['body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
summary('referrer after referral activation', $refToken);

for ($i = 1; $i <= 9; $i++) {
    $mEmail = 'milestone_balance_' . $i . '_' . time() . '@test.local';
    $m = register('Milestone ' . $i, $mEmail, 'Password123', $refCode);
    verifyByLink($m['data']['verification_link']);
    $mToken = login($mEmail, 'Password123');
    $mCheck = api('POST', '/api/wallet/checkin', null, $mToken);
    echo 'milestone user ' . $i . ' checkin response: ' . json_encode($mCheck['body']['data'] ?? $mCheck['body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}
summary('referrer after milestone', $refToken);
