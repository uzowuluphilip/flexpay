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

function showSummary(string $label, string $token): void
{
    $res = api('GET', '/api/wallet/summary', null, $token);
    echo $label . ': ' . json_encode($res['body']['data'] ?? $res['body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

$email = 'balance_chain_' . time() . '@test.local';
$reg = register('Balance Chain', $email, 'Password123');
verifyByLink($reg['data']['verification_link']);
$token = login($email, 'Password123');
showSummary('initial verified balance', $token);
$checkin = api('POST', '/api/wallet/checkin', null, $token);
echo 'after check-in: ' . json_encode($checkin['body']['data'] ?? $checkin['body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
showSummary('balance after check-in', $token);

$refEmail = 'ref_balance_' . time() . '@test.local';
$refReg = register('Referrer User', $refEmail, 'Password123');
verifyByLink($refReg['data']['verification_link']);
$refToken = login($refEmail, 'Password123');
$refCode = $refReg['data']['user']['referral_code'];

$referredEmail = 'referred_balance_' . time() . '@test.local';
$referred = register('Referred User', $referredEmail, 'Password123', $refCode);
verifyByLink($referred['data']['verification_link']);
$referredToken = login($referredEmail, 'Password123');
$referredCheckin = api('POST', '/api/wallet/checkin', null, $referredToken);
echo 'referred check-in: ' . json_encode($referredCheckin['body']['data'] ?? $referredCheckin['body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
showSummary('referrer balance after referral', $refToken);

for ($i = 1; $i <= 9; $i++) {
    $mEmail = 'milestone_balance_' . $i . '_' . time() . '@test.local';
    $m = register('Milestone ' . $i, $mEmail, 'Password123', $refCode);
    verifyByLink($m['data']['verification_link']);
    $mToken = login($mEmail, 'Password123');
    $mCheck = api('POST', '/api/wallet/checkin', null, $mToken);
    echo 'milestone user ' . $i . ' checkin: ' . json_encode($mCheck['body']['data'] ?? $mCheck['body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}
showSummary('referrer balance after milestone', $refToken);
