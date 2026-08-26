<?php
require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;
use FlexPay\Repositories\ReferralRepository;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

$db = Database::getInstance()->getConnection();
$apiBase = 'http://127.0.0.1:8000';

function api(string $method, string $path, ?array $payload = null, ?string $token = null): array
{
    global $apiBase;
    $ch = curl_init($apiBase . $path);
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
    return [
        'code' => $code,
        'raw' => $raw,
        'body' => is_array($decoded) ? $decoded : ['raw' => $raw],
    ];
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
    $value = $stmt->fetchColumn();
    return $value;
}

function createUser(string $fullName, string $email, string $password, ?string $refCode = null): array
{
    global $db;
    $payload = ['full_name' => $fullName, 'email' => $email, 'password' => $password];
    if ($refCode !== null) {
        $payload['referral_code'] = $refCode;
    }
    $res = api('POST', '/api/auth/register', $payload);
    if (($res['body']['success'] ?? false) !== true) {
        throw new RuntimeException('Register failed: ' . json_encode($res['body']));
    }
    $user = dbOne('SELECT * FROM users WHERE email = ? LIMIT 1', [$email]);
    if ($user === null) {
        throw new RuntimeException('User missing after register: ' . $email);
    }
    return [
        'id' => (int) $user['id'],
        'email' => $email,
        'referral_code' => $user['referral_code'],
        'verification_link' => $res['body']['data']['verification_link'] ?? null,
    ];
}

function verifyEmailByToken(string $verificationLink): void
{
    $parts = parse_url($verificationLink);
    parse_str($parts['query'] ?? '', $query);
    $token = $query['token'] ?? null;
    if ($token === null) {
        throw new RuntimeException('Verification token missing from link: ' . $verificationLink);
    }
    $res = api('POST', '/api/auth/verify-email', ['token' => $token]);
    if (($res['body']['success'] ?? false) !== true) {
        throw new RuntimeException('Verification failed: ' . json_encode($res['body']));
    }
}

function login(string $email, string $password): string
{
    $res = api('POST', '/api/auth/login', ['email' => $email, 'password' => $password]);
    if (($res['body']['success'] ?? false) !== true || empty($res['body']['data']['token'])) {
        throw new RuntimeException('Login failed: ' . json_encode($res['body']));
    }
    return (string) $res['body']['data']['token'];
}

function syncWalletBalance(int $userId): void
{
    global $db;
    $wallet = dbOne('SELECT * FROM wallets WHERE user_id = ? LIMIT 1', [$userId]);
    if ($wallet === null) {
        $db->prepare('INSERT INTO wallets (user_id, balance_kobo, currency, created_at, updated_at) VALUES (?, 0, "NGN", NOW(), NOW())')->execute([$userId]);
        $wallet = dbOne('SELECT * FROM wallets WHERE user_id = ? LIMIT 1', [$userId]);
    }
    $sum = (int) dbValue('SELECT COALESCE(SUM(amount_kobo), 0) FROM transactions WHERE user_id = ? AND status IN ("completed", "pending")', [$userId]);
    $db->prepare('UPDATE wallets SET balance_kobo = ?, updated_at = NOW() WHERE id = ?')->execute([$sum, (int) $wallet['id']]);
}

echo "=== STEP 1: REGISTER A FRESH USER ===\n";
$step1Email = 'localverify_' . time() . '@test.local';
$step1 = createUser('Local Verify User', $step1Email, 'Password123');
$step1UserId = $step1['id'];
$step1Link = $step1['verification_link'];
$step1Log = dbOne('SELECT * FROM email_log WHERE user_id = ? ORDER BY id DESC LIMIT 1', [$step1UserId]);

echo 'User: ' . $step1Email . ' | ID=' . $step1UserId . "\n";
echo 'Verification link: ' . $step1Link . "\n";
echo 'Email log status: ' . ($step1Log['status'] ?? 'none') . "\n";

echo "\n=== STEP 2: VERIFY EMAIL (MANUAL TOKEN) + LOGIN ===\n";
verifyEmailByToken($step1Link);
$step1Token = login($step1Email, 'Password123');
$me = api('GET', '/api/auth/me', null, $step1Token);
echo 'Verify response success: ' . (($me['body']['success'] ?? false) ? 'true' : 'false') . "\n";
echo 'Verified user email: ' . ($me['body']['data']['user']['email'] ?? '') . "\n";

echo "\n=== STEP 3: CHECK-IN REWARD (REAL DAY-BASED AMOUNT) ===\n";
$statusBefore = api('GET', '/api/wallet/checkin-status', null, $step1Token);
$checkin = api('POST', '/api/wallet/checkin', null, $step1Token);
$statusAfter = api('GET', '/api/wallet/checkin-status', null, $step1Token);
$checkInRow = dbOne('SELECT * FROM check_ins WHERE user_id = ? ORDER BY id DESC LIMIT 1', [$step1UserId]);
$bonusTx = dbOne('SELECT * FROM transactions WHERE user_id = ? AND type = "check_in_bonus" ORDER BY id DESC LIMIT 1', [$step1UserId]);

echo 'Status before: ' . json_encode($statusBefore['body']['data'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
echo 'Check-in response: ' . json_encode($checkin['body']['data'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
echo 'Status after: ' . json_encode($statusAfter['body']['data'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
echo 'DB check_in row: ' . json_encode($checkInRow, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
echo 'DB check_in bonus tx: ' . json_encode($bonusTx, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";

$referrerEmail = 'referrer_' . time() . '@test.local';
$referrer = createUser('Referral Referrer', $referrerEmail, 'Password123');
$referrerId = $referrer['id'];
$referrerCode = $referrer['referral_code'];

echo "\n=== STEP 4: REFERRAL ACTIVATION ONLY ON FIRST REAL ACTION ===\n";
$referredUser = createUser('Referred User', 'referred_' . time() . '@test.local', 'Password123', $referrerCode);
$referredId = $referredUser['id'];
$pendingReferral = dbOne('SELECT * FROM referrals WHERE referred_user_id = ? LIMIT 1', [$referredId]);
$verifyReferred = verifyEmailByToken($referredUser['verification_link']);
$referralAfterVerification = dbOne('SELECT * FROM referrals WHERE referred_user_id = ? LIMIT 1', [$referredId]);
$referredLogin = login($referredUser['email'], 'Password123');
$referredCheckin = api('POST', '/api/wallet/checkin', null, $referredLogin);
$referralAfterAction = dbOne('SELECT * FROM referrals WHERE referred_user_id = ? LIMIT 1', [$referredId]);
$referrerBonusTx = dbOne('SELECT * FROM transactions WHERE user_id = ? AND type = "referral_bonus" ORDER BY id DESC LIMIT 1', [$referrerId]);
$referrerActivity = dbOne('SELECT * FROM activity_feed WHERE user_id = ? AND type = "referral" ORDER BY id DESC LIMIT 1', [$referrerId]);

echo 'Pending referral row after register: ' . json_encode($pendingReferral, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
echo 'Referral status after email verification: ' . json_encode($referralAfterVerification, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
echo 'Check-in response for referred user: ' . json_encode($referredCheckin['body']['data'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
echo 'Referral status after first action: ' . json_encode($referralAfterAction, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
echo 'Referrer bonus tx: ' . json_encode($referrerBonusTx, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
echo 'Referrer activity row: ' . json_encode($referrerActivity, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";

$repo = new ReferralRepository();

echo "\n=== STEP 5: MILESTONE CROSSING + EXACTLY-ONCE GUARD ===\n";
for ($i = 1; $i <= 9; $i++) {
    $user = createUser('Milestone Friend ' . $i, 'milestone_' . time() . '_' . $i . '@test.local', 'Password123', $referrerCode);
    verifyEmailByToken($user['verification_link']);
    $token = login($user['email'], 'Password123');
    $api = api('POST', '/api/wallet/checkin', null, $token);
    if (($api['body']['success'] ?? false) !== true) {
        throw new RuntimeException('Check-in failed during milestone setup: ' . json_encode($api['body']));
    }
}
$beforeSecondRun = (int) dbValue('SELECT COUNT(*) FROM referral_milestone_claims WHERE user_id = ? AND milestone = 10', [$referrerId]);
$repo->ensureMilestoneBonusesForUser($referrerId);
$afterSecondRun = (int) dbValue('SELECT COUNT(*) FROM referral_milestone_claims WHERE user_id = ? AND milestone = 10', [$referrerId]);
$milestoneTx = dbOne('SELECT * FROM transactions WHERE user_id = ? AND type = "referral_bonus" AND meta LIKE "%\"milestone\":10%" ORDER BY id DESC LIMIT 1', [$referrerId]);

echo 'Count before re-run: ' . $beforeSecondRun . "\n";
echo 'Count after re-run: ' . $afterSecondRun . "\n";
echo 'Milestone tx row: ' . json_encode($milestoneTx, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";

$lockUserEmail = 'lockuser_' . time() . '@test.local';
$db->prepare('INSERT INTO users (full_name, email, password_hash, referral_code, email_verified_at, status, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), "active", NOW(), NOW())')->execute([
    'Lock User',
    $lockUserEmail,
    password_hash('Password123', PASSWORD_BCRYPT),
    strtoupper(bin2hex(random_bytes(4)))
]);
$lockUserId = (int) $db->lastInsertId();
$walletId = (int) $db->query('SELECT id FROM wallets WHERE user_id = ' . $lockUserId)->fetchColumn();
if ($walletId === 0 || $walletId === false) {
    $db->prepare('INSERT INTO wallets (user_id, balance_kobo, currency, created_at, updated_at) VALUES (?, 0, "NGN", NOW(), NOW())')->execute([$lockUserId]);
    $walletId = (int) $db->query('SELECT id FROM wallets WHERE user_id = ' . $lockUserId)->fetchColumn();
}
$db->prepare('INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at) VALUES (?, ?, "top_up", ?, "completed", ?, ?, NOW(), NOW())')->execute([
    $lockUserId,
    $walletId,
    2000000,
    'seed_lock_' . $lockUserId . '_' . time(),
    json_encode(['seed' => 'lock-test'])
]);
syncWalletBalance($lockUserId);
$beforeLock = (int) dbValue('SELECT balance_kobo FROM wallets WHERE user_id = ?', [$lockUserId]);
$lockToken = login($lockUserEmail, 'Password123');
$lockRequest = api('POST', '/api/invest/lock', ['amount' => 20000], $lockToken);
$lockRow = dbOne('SELECT * FROM fund_locks WHERE user_id = ? ORDER BY id DESC LIMIT 1', [$lockUserId]);
$lockHoldTx = dbOne('SELECT * FROM transactions WHERE user_id = ? AND type = "lock_hold" ORDER BY id DESC LIMIT 1', [$lockUserId]);

$db->prepare('UPDATE fund_locks SET unlocks_at = DATE_SUB(NOW(), INTERVAL 1 DAY) WHERE user_id = ? AND status = "active"')->execute([$lockUserId]);
$summaryAfterLock = api('GET', '/api/wallet/summary', null, $lockToken);
$releasedLockRow = dbOne('SELECT * FROM fund_locks WHERE user_id = ? ORDER BY id DESC LIMIT 1', [$lockUserId]);
$lockReleaseTx = dbOne('SELECT * FROM transactions WHERE user_id = ? AND type = "lock_release" ORDER BY id DESC LIMIT 1', [$lockUserId]);
$afterReleaseBalance = (int) dbValue('SELECT balance_kobo FROM wallets WHERE user_id = ?', [$lockUserId]);

echo "\n=== STEP 6: FUND LOCK CREATION + AUTO RELEASE ===\n";
echo 'Before lock balance: ' . $beforeLock . ' kobo | ₦' . number_format($beforeLock / 100, 2) . "\n";
echo 'Lock API response: ' . json_encode($lockRequest['body']['data'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
echo 'DB lock row: ' . json_encode($lockRow, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
echo 'DB lock_hold tx: ' . json_encode($lockHoldTx, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
echo 'Summary after auto-release: ' . json_encode($summaryAfterLock['body']['data'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
echo 'DB released lock row: ' . json_encode($releasedLockRow, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
echo 'DB lock_release tx: ' . json_encode($lockReleaseTx, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
echo 'Final wallet balance after release: ' . $afterReleaseBalance . ' kobo | ₦' . number_format($afterReleaseBalance / 100, 2) . "\n";

echo "\n=== ALL STEPS COMPLETED ===\n";
