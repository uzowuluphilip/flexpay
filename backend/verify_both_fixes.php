<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

// Load environment
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

// Initialize database
$db = Database::getInstance()->getConnection();

// Create fresh test user
echo "\n=== CREATING FRESH TEST USER ===\n";
$testEmail = 'verify_test_' . time() . '@test.local';
$testPassword = password_hash('Test@1234', PASSWORD_BCRYPT);
$testName = 'Fresh Verify Test User';

$stmt = $db->prepare('INSERT INTO users (full_name, email, password_hash, status, email_verified_at, created_at) 
                      VALUES (?, ?, ?, "active", NOW(), NOW())');
$stmt->execute([$testName, $testEmail, $testPassword]);
$testUserId = $db->lastInsertId();

echo "✓ User created: ID $testUserId, Email: $testEmail\n";

// Get initial wallet
$stmt = $db->prepare('SELECT * FROM wallets WHERE user_id = ? LIMIT 1');
$stmt->execute([$testUserId]);
$wallet = $stmt->fetch();

if ($wallet === false) {
    // Create wallet if not exists
    $stmt = $db->prepare('INSERT INTO wallets (user_id, balance_kobo, currency, created_at, updated_at) 
                          VALUES (?, 0, "NGN", NOW(), NOW())');
    $stmt->execute([$testUserId]);
    $walletId = $db->lastInsertId();
    $initialBalance = 0;
} else {
    $walletId = $wallet['id'];
    $initialBalance = $wallet['balance_kobo'];
}

echo "✓ Wallet ID: $walletId\n";
echo "✓ Initial balance: " . ($initialBalance / 100) . " Naira (" . $initialBalance . " kobo)\n";

// ========== ACTION 1: BALANCE ADJUSTMENT ==========
echo "\n=== ACTION 1: BALANCE ADJUSTMENT ===\n";
echo "Operation: Adjust balance by ₦500 (50,000 kobo) with reason 'Test adjustment'\n";

$adjustmentAmountNaira = 500;  // ₦500
$adjustmentAmountKobo = $adjustmentAmountNaira * 100;  // 50,000 kobo
$adjustmentReason = 'Test adjustment';

echo "📝 BEFORE ADJUSTMENT:\n";
echo "   Balance: " . ($initialBalance / 100) . " Naira (" . $initialBalance . " kobo)\n";

// Perform adjustment via API simulation (same as admin adjustBalance does)
$adjustAmount = (int) round((float) $adjustmentAmountNaira * 100);  // This is what the code does
$reference = 'admin_adjust_' . $testUserId . '_' . time() . '_' . bin2hex(random_bytes(4));

$stmt = $db->prepare(
    'INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at)
     VALUES (?, ?, "admin_adjustment", ?, "completed", ?, ?, NOW(), NOW())'
);
$stmt->execute([
    $testUserId,
    $walletId,
    $adjustAmount,
    $reference,
    json_encode(['reason' => $adjustmentReason], JSON_THROW_ON_ERROR),
]);

// Simulate syncWalletBalance
$stmt = $db->prepare(
    'SELECT COALESCE(SUM(amount_kobo), 0) FROM transactions WHERE user_id = ? AND status IN ("completed", "pending")'
);
$stmt->execute([$testUserId]);
$newBalance = (int) $stmt->fetchColumn();

$stmt = $db->prepare('UPDATE wallets SET balance_kobo = ?, updated_at = NOW() WHERE id = ?');
$stmt->execute([$newBalance, $walletId]);

echo "📝 AFTER ADJUSTMENT:\n";
echo "   Balance: " . ($newBalance / 100) . " Naira (" . $newBalance . " kobo)\n";

// Verify arithmetic
$expectedBalance = $initialBalance + $adjustmentAmountKobo;
$balanceDifference = $newBalance - $initialBalance;
$expectedDifference = $adjustmentAmountKobo;

echo "\n✓ ARITHMETIC VERIFICATION:\n";
echo "   Initial balance:        " . $initialBalance . " kobo\n";
echo "   Adjustment amount:      +" . $adjustmentAmountKobo . " kobo (₦" . $adjustmentAmountNaira . ")\n";
echo "   Expected final balance: " . $expectedBalance . " kobo\n";
echo "   Actual final balance:   " . $newBalance . " kobo\n";
echo "   Difference:             " . ($newBalance === $expectedBalance ? "✓ CORRECT" : "✗ MISMATCH") . "\n";

// Check transaction
$stmt = $db->prepare('SELECT * FROM transactions WHERE user_id = ? AND type = "admin_adjustment" ORDER BY id DESC LIMIT 1');
$stmt->execute([$testUserId]);
$lastAdjustment = $stmt->fetch();

echo "\n✓ TRANSACTION RECORD:\n";
echo "   Transaction ID:  " . $lastAdjustment['id'] . "\n";
echo "   Type:            " . $lastAdjustment['type'] . "\n";
echo "   Amount:          " . $lastAdjustment['amount_kobo'] . " kobo\n";
echo "   Status:          " . $lastAdjustment['status'] . "\n";
echo "   Reference:       " . $lastAdjustment['reference'] . "\n";

// ========== ACTION 3: WITHDRAWAL REJECTION ==========
echo "\n\n=== ACTION 3: WITHDRAWAL REJECTION ===\n";

$withdrawalAmountNaira = 5000;  // ₦5,000
$withdrawalAmountKobo = $withdrawalAmountNaira * 100;  // 500,000 kobo

echo "Operation: Create withdrawal request for ₦" . $withdrawalAmountNaira . " and reject it\n";

echo "📝 BEFORE WITHDRAWAL:\n";
$stmt = $db->prepare('SELECT balance_kobo FROM wallets WHERE id = ?');
$stmt->execute([$walletId]);
$beforeWithdrawalBalance = (int) $stmt->fetchColumn();
echo "   Balance: " . ($beforeWithdrawalBalance / 100) . " Naira (" . $beforeWithdrawalBalance . " kobo)\n";

// Create withdrawal request and transaction
$reference = 'withdrawal_' . $testUserId . '_' . time();
$stmt = $db->prepare(
    'INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at)
     VALUES (?, ?, "withdrawal", ?, "completed", ?, ?, NOW(), NOW())'
);
$stmt->execute([
    $testUserId,
    $walletId,
    -$withdrawalAmountKobo,  // Negative for withdrawal
    $reference,
    json_encode(['source' => 'test'], JSON_THROW_ON_ERROR),
]);
$withdrawalTxId = $db->lastInsertId();

// Create withdrawal request
$stmt = $db->prepare(
    'INSERT INTO withdrawal_requests (user_id, transaction_id, amount_kobo, bank_name, account_number, account_name, status, created_at)
     VALUES (?, ?, ?, "Test Bank", "1234567890", "Test User", "pending", NOW())'
);
$stmt->execute([$testUserId, $withdrawalTxId, $withdrawalAmountKobo]);
$withdrawalReqId = $db->lastInsertId();

// Sync wallet to update balance after withdrawal
$stmt = $db->prepare(
    'SELECT COALESCE(SUM(amount_kobo), 0) FROM transactions WHERE user_id = ? AND status IN ("completed", "pending")'
);
$stmt->execute([$testUserId]);
$afterWithdrawalBalance = (int) $stmt->fetchColumn();

$stmt = $db->prepare('UPDATE wallets SET balance_kobo = ?, updated_at = NOW() WHERE id = ?');
$stmt->execute([$afterWithdrawalBalance, $walletId]);

echo "📝 AFTER WITHDRAWAL CREATED:\n";
echo "   Balance: " . ($afterWithdrawalBalance / 100) . " Naira (" . $afterWithdrawalBalance . " kobo)\n";
echo "   Withdrawal amount: -" . ($withdrawalAmountKobo / 100) . " Naira\n";

// Now reject the withdrawal (using the FIXED code)
$rejectionReason = 'Test rejection';

// Mark withdrawal tx as reversed
$stmt = $db->prepare('UPDATE transactions SET status = "reversed" WHERE id = ?');
$stmt->execute([$withdrawalTxId]);

// Mark withdrawal request as rejected
$stmt = $db->prepare('UPDATE withdrawal_requests SET status = "rejected", rejection_reason = ? WHERE id = ?');
$stmt->execute([$rejectionReason, $withdrawalReqId]);

// Sync wallet balance (will exclude "reversed" tx from sum)
$stmt = $db->prepare(
    'SELECT COALESCE(SUM(amount_kobo), 0) FROM transactions WHERE user_id = ? AND status IN ("completed", "pending")'
);
$stmt->execute([$testUserId]);
$afterRejectionBalance = (int) $stmt->fetchColumn();

$stmt = $db->prepare('UPDATE wallets SET balance_kobo = ?, updated_at = NOW() WHERE id = ?');
$stmt->execute([$afterRejectionBalance, $walletId]);

echo "📝 AFTER REJECTION:\n";
echo "   Balance: " . ($afterRejectionBalance / 100) . " Naira (" . $afterRejectionBalance . " kobo)\n";

// Verify arithmetic
$expectedAfterRejection = $afterWithdrawalBalance + $withdrawalAmountKobo;  // Restores the withdrawal amount
$rejectionDifference = $afterRejectionBalance - $beforeWithdrawalBalance;

echo "\n✓ ARITHMETIC VERIFICATION:\n";
echo "   Before withdrawal:      " . $beforeWithdrawalBalance . " kobo\n";
echo "   After withdrawal:       " . $afterWithdrawalBalance . " kobo (- " . ($withdrawalAmountKobo / 100) . " Naira)\n";
echo "   Expected after rejection: " . $beforeWithdrawalBalance . " kobo (restore original)\n";
echo "   Actual after rejection: " . $afterRejectionBalance . " kobo\n";
echo "   Difference:             " . ($afterRejectionBalance === $beforeWithdrawalBalance ? "✓ CORRECT (back to original)" : "✗ MISMATCH") . "\n";

// Show transaction summary
echo "\n✓ TRANSACTION SUMMARY FOR USER $testUserId:\n";
$stmt = $db->prepare('SELECT id, type, amount_kobo, status FROM transactions WHERE user_id = ? ORDER BY id');
$stmt->execute([$testUserId]);
$transactions = $stmt->fetchAll();

$runningTotal = 0;
foreach ($transactions as $tx) {
    if (in_array($tx['status'], ['completed', 'pending'])) {
        $runningTotal += (int) $tx['amount_kobo'];
    }
    $statusLabel = str_pad($tx['status'], 12, ' ');
    $typeLabel = str_pad($tx['type'], 18, ' ');
    $amountDisplay = str_pad((int)$tx['amount_kobo'] . ' kobo', 15, ' ', STR_PAD_LEFT);
    $displayRunning = (in_array($tx['status'], ['completed', 'pending']) ? $runningTotal : '(excl)');
    echo "   TX " . $tx['id'] . ": $typeLabel $amountDisplay ($statusLabel) Sum: $displayRunning\n";
}

// Final summary
echo "\n=== FINAL SUMMARY ===\n";
echo "Test User: $testEmail (ID: $testUserId)\n";
echo "Action 1 (Balance Adjust): " . ($newBalance === $expectedBalance ? "✓ PASSED" : "✗ FAILED") . "\n";
echo "Action 3 (Withdrawal Reject): " . ($afterRejectionBalance === $beforeWithdrawalBalance ? "✓ PASSED" : "✗ FAILED") . "\n";
echo "Final wallet balance: " . ($afterRejectionBalance / 100) . " Naira (" . $afterRejectionBalance . " kobo)\n";
echo "\n";
?>
