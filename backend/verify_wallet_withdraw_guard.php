<?php
require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;
use FlexPay\Repositories\SessionRepository;
use FlexPay\Services\TokenService;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

$db = Database::getInstance()->getConnection();

function createFreshUser(PDO $db): array
{
    $fullName = 'Wallet Guard Test';
    $email = 'walletguard_' . time() . '_' . random_int(1000, 9999) . '@test.local';
    $passwordHash = password_hash('Password123', PASSWORD_BCRYPT);
    $referralCode = strtoupper(bin2hex(random_bytes(4)));

    $stmt = $db->prepare(
        'INSERT INTO users (full_name, email, password_hash, referral_code, email_verified_at, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, "active", NOW(), NOW())'
    );
    $stmt->execute([$fullName, $email, $passwordHash, $referralCode]);
    $userId = (int) $db->lastInsertId();

    $walletStmt = $db->prepare('SELECT * FROM wallets WHERE user_id = ? LIMIT 1');
    $walletStmt->execute([$userId]);
    if ($walletStmt->fetch() === false) {
        $db->prepare('INSERT INTO wallets (user_id, balance_kobo, currency, created_at, updated_at) VALUES (?, 0, "NGN", NOW(), NOW())')->execute([$userId]);
    }

    $token = TokenService::generateRandomToken(32);
    $sessionRepo = new SessionRepository();
    $sessionRepo->create($userId, TokenService::hashToken($token), 'php-cli-wallet-verify', '127.0.0.1', 24);

    return [$userId, $email, $token];
}

function invokeWithdrawal(string $token, array $payload): array
{
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES);
    $scriptPath = __DIR__ . '/run_wallet_withdraw_case.php';
    $command = sprintf('php %s %s', escapeshellarg($scriptPath), escapeshellarg($token));

    $descriptor = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];

    $process = proc_open($command, $descriptor, $pipes);
    if (!is_resource($process)) {
        return ['raw' => '', 'body' => ['success' => false, 'code' => 'proc_open_failed']];
    }

    fwrite($pipes[0], $json);
    fclose($pipes[0]);

    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exitCode = proc_close($process);

    $decoded = json_decode((string) $stdout, true);

    return [
        'raw' => trim((string) $stdout),
        'stderr' => trim((string) $stderr),
        'exit' => $exitCode,
        'body' => is_array($decoded) ? $decoded : ['raw' => trim((string) $stdout)],
    ];
}

function getBalanceKobo(PDO $db, int $userId): int
{
    $stmt = $db->prepare('SELECT COALESCE(SUM(amount_kobo), 0) FROM transactions WHERE user_id = ? AND status IN ("completed", "pending")');
    $stmt->execute([$userId]);
    return (int) $stmt->fetchColumn();
}

[$userId, $email, $token] = createFreshUser($db);
$beforeBalanceKobo = getBalanceKobo($db, $userId);
$beforeRows = (int) $db->query('SELECT COUNT(*) FROM withdrawal_requests WHERE user_id = ' . $userId)->fetchColumn();

echo "=== SCENARIO 1: OVER-BALANCE WITHDRAWAL SHOULD FAIL ===\n";
echo 'Fresh user: ' . $email . ' (ID ' . $userId . ")\n";
echo 'Before balance: ₦' . number_format($beforeBalanceKobo / 100, 2) . ' (' . $beforeBalanceKobo . " kobo)\n";
echo 'Withdrawal requests before: ' . $beforeRows . "\n";

$attempt = invokeWithdrawal($token, [
    'amount' => 5000,
    'bank_name' => 'Test Bank',
    'account_number' => '1234567890',
    'account_name' => 'Wallet Guard Test',
]);

echo 'Attempt response: ' . trim($attempt['raw']) . "\n";

$afterBalanceKobo = getBalanceKobo($db, $userId);
$afterRows = (int) $db->query('SELECT COUNT(*) FROM withdrawal_requests WHERE user_id = ' . $userId)->fetchColumn();

echo 'After balance: ₦' . number_format($afterBalanceKobo / 100, 2) . ' (' . $afterBalanceKobo . " kobo)\n";
echo 'Withdrawal requests after: ' . $afterRows . "\n\n";

if (($attempt['body']['success'] ?? true) !== false || ($attempt['body']['code'] ?? '') !== 'insufficient_balance') {
    fwrite(STDERR, "Scenario 1 failed: over-balance withdrawal was not rejected correctly\n");
    exit(1);
}
if ($afterRows !== $beforeRows) {
    fwrite(STDERR, "Scenario 1 failed: withdrawal_requests row was created even though balance was insufficient\n");
    exit(1);
}

$db->prepare('INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at) VALUES (?, ?, "top_up", ?, "completed", ?, ?, NOW(), NOW())')->execute([
    $userId,
    (int) $db->query('SELECT id FROM wallets WHERE user_id = ' . $userId)->fetchColumn(),
    100000,
    'seed_' . $userId . '_' . time(),
    json_encode(['seed' => 'fresh-guard-balance'])
]);
$thisWalletId = (int) $db->query('SELECT id FROM wallets WHERE user_id = ' . $userId)->fetchColumn();
$db->prepare('UPDATE wallets SET balance_kobo = 100000, updated_at = NOW() WHERE id = ?')->execute([$thisWalletId]);
$walletBeforeValid = getBalanceKobo($db, $userId);

echo "=== SCENARIO 2: VALID WITHDRAWAL WITHIN BALANCE SHOULD SUCCEED ===\n";
echo 'Balance before valid withdrawal: ₦' . number_format($walletBeforeValid / 100, 2) . ' (' . $walletBeforeValid . " kobo)\n";

$valid = invokeWithdrawal($token, [
    'amount' => 500,
    'bank_name' => 'Test Bank',
    'account_number' => '1234567890',
    'account_name' => 'Wallet Guard Test',
]);

echo 'Valid withdrawal response: ' . trim($valid['raw']) . "\n";

$finalBalanceKobo = getBalanceKobo($db, $userId);
$finalRows = (int) $db->query('SELECT COUNT(*) FROM withdrawal_requests WHERE user_id = ' . $userId)->fetchColumn();

echo 'After valid withdrawal: ₦' . number_format($finalBalanceKobo / 100, 2) . ' (' . $finalBalanceKobo . " kobo)\n";
echo 'Withdrawal requests total after valid withdrawal: ' . $finalRows . "\n";

if (($valid['body']['success'] ?? false) !== true) {
    fwrite(STDERR, "Scenario 2 failed: valid withdrawal was rejected unexpectedly\n");
    exit(1);
}
if ($finalBalanceKobo !== 50000) {
    fwrite(STDERR, "Scenario 2 failed: valid withdrawal did not leave 50000 kobo (₦500.00) in the wallet\n");
    exit(1);
}

echo "\n=== PASS SUMMARY ===\n";
echo "Scenario 1: rejected safely before insert; balance remained unchanged\n";
echo "Scenario 2: valid withdrawal succeeded and wallet ended at ₦500.00 (50,000 kobo)\n";
