<?php
$conn = new mysqli('127.0.0.1', 'root', '', 'flexpay');
if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error);
}

echo "=== ACTION 3: CREATE AND REJECT WITHDRAWAL ===\n\n";

// Get user's current wallet balance
$result = $conn->query("SELECT balance_kobo FROM wallets WHERE user_id = 1");
$wallet = $result->fetch_assoc();
$balanceBeforeWithdrawal = $wallet['balance_kobo'];
echo "User 1 wallet BEFORE creating withdrawal: " . $balanceBeforeWithdrawal . " kobo (₦" . ($balanceBeforeWithdrawal/100) . ")\n";

// Create a new withdrawal request via API
$withdrawalAmount = 200000; // ₦2000
$withdrawalData = [
    'amount_naira' => $withdrawalAmount / 100,
    'bank_name' => 'GTBank',
    'account_number' => '9876543210',
    'account_name' => 'Node Test User'
];

$ch = curl_init('http://localhost:8000/api/wallets/withdraw');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($withdrawalData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . (getenv('TEST_TOKEN') ?: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHBpcmVzIjoxNjkyMDAwMDAwLCJ1c2VyX2lkIjoxfQ.test')
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

echo "\nCreate withdrawal API response:\n";
echo $response . "\n";

// Parse response to get withdrawal ID
$responseData = json_decode($response, true);
if (!isset($responseData['data']['withdrawal_id'])) {
    // Try to get it from database instead
    $result = $conn->query("SELECT id FROM withdrawal_requests WHERE user_id = 1 ORDER BY created_at DESC LIMIT 1");
    if ($result->num_rows == 0) {
        echo "ERROR: Could not create withdrawal\n";
        $conn->close();
        exit;
    }
    $wr = $result->fetch_assoc();
    $newWithdrawalId = $wr['id'];
} else {
    $newWithdrawalId = $responseData['data']['withdrawal_id'];
}

echo "\nCreated withdrawal ID: " . $newWithdrawalId . "\n";

// Get the transaction ID for this withdrawal
$result = $conn->query("SELECT transaction_id, amount_kobo, status FROM withdrawal_requests WHERE id = " . $newWithdrawalId);
$wr = $result->fetch_assoc();
$transactionId = $wr['transaction_id'];
$withdrawalAmountActual = $wr['amount_kobo'];

echo "Withdrawal details:\n";
echo "  Amount: " . $withdrawalAmountActual . " kobo (₦" . ($withdrawalAmountActual/100) . ")\n";
echo "  Transaction ID: " . $transactionId . "\n";
echo "  Status: " . $wr['status'] . "\n";

// Check transaction before rejection
echo "\nBEFORE rejection - transaction:\n";
$result = $conn->query("SELECT id, type, amount_kobo, status FROM transactions WHERE id = " . $transactionId);
$tx = $result->fetch_assoc();
echo "  Type: " . $tx['type'] . " | Amount: " . $tx['amount_kobo'] . " kobo | Status: " . $tx['status'] . "\n";

// Check wallet before rejection
$result = $conn->query("SELECT balance_kobo FROM wallets WHERE user_id = 1");
$wallet = $result->fetch_assoc();
$balanceBeforeRejection = $wallet['balance_kobo'];
echo "  Wallet balance: " . $balanceBeforeRejection . " kobo (₦" . ($balanceBeforeRejection/100) . ")\n";

// Reject the withdrawal via admin API
$rejectData = ['reason' => 'Insufficient funds verification required'];
$ch = curl_init('http://localhost:8000/api/admin/withdrawals/' . $newWithdrawalId . '/reject');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($rejectData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer e608ec1c3baa41def680fa29ddd7ecc0'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

echo "\nReject withdrawal API response:\n";
echo $response . "\n";

// Check withdrawal after rejection
echo "\nAFTER rejection - withdrawal_requests:\n";
$result = $conn->query("SELECT id, status, rejection_reason FROM withdrawal_requests WHERE id = " . $newWithdrawalId);
$wr = $result->fetch_assoc();
echo "  Status: " . $wr['status'] . "\n";
echo "  Rejection reason: " . $wr['rejection_reason'] . "\n";

// Check transaction after rejection
echo "\nAFTER rejection - transaction:\n";
$result = $conn->query("SELECT id, type, amount_kobo, status FROM transactions WHERE id = " . $transactionId);
$tx = $result->fetch_assoc();
echo "  Type: " . $tx['type'] . " | Amount: " . $tx['amount_kobo'] . " kobo | Status: " . $tx['status'] . "\n";

// Check if reversal transaction was created
echo "\nAFTER rejection - check for reversal transaction:\n";
$result = $conn->query("SELECT id, type, amount_kobo, status FROM transactions WHERE user_id = 1 AND type = 'withdrawal' AND status = 'reversed' ORDER BY created_at DESC LIMIT 1");
if ($result->num_rows > 0) {
    $reversalTx = $result->fetch_assoc();
    echo "  Found reversal: Tx ID: " . $reversalTx['id'] . " | Amount: " . $reversalTx['amount_kobo'] . " kobo | Status: " . $reversalTx['status'] . "\n";
}

// Check wallet after rejection
$result = $conn->query("SELECT balance_kobo FROM wallets WHERE user_id = 1");
$wallet = $result->fetch_assoc();
$balanceAfterRejection = $wallet['balance_kobo'];
echo "\nWallet balance progression:\n";
echo "  BEFORE withdrawal: " . $balanceBeforeWithdrawal . " kobo\n";
echo "  AFTER withdrawal created: " . $balanceBeforeRejection . " kobo\n";
echo "  AFTER rejection: " . $balanceAfterRejection . " kobo\n";
echo "  Reversal amount: " . ($balanceAfterRejection - $balanceBeforeRejection) . " kobo (should be +". $withdrawalAmountActual . ")\n";

$conn->close();
?>
