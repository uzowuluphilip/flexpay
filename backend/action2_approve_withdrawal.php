<?php
$conn = new mysqli('127.0.0.1', 'root', '', 'flexpay');
if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error);
}

echo "=== ACTION 2: APPROVE WITHDRAWAL ===\n\n";

// Find pending withdrawals
$result = $conn->query("SELECT id, user_id, transaction_id, amount_kobo, status FROM withdrawal_requests WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1");
if ($result->num_rows == 0) {
    echo "No pending withdrawals found\n";
    $conn->close();
    exit;
}

$withdrawal = $result->fetch_assoc();
$withdrawalId = $withdrawal['id'];
$transactionId = $withdrawal['transaction_id'];
$userId = $withdrawal['user_id'];
$amountKobo = $withdrawal['amount_kobo'];

echo "Found pending withdrawal:\n";
echo "  Withdrawal ID: " . $withdrawalId . "\n";
echo "  Transaction ID: " . $transactionId . "\n";
echo "  User ID: " . $userId . "\n";
echo "  Amount: " . $amountKobo . " kobo (₦" . ($amountKobo/100) . ")\n";
echo "  Status: " . $withdrawal['status'] . "\n";

// Check related transaction BEFORE approval
echo "\nBEFORE approval - transaction details:\n";
$result = $conn->query("SELECT id, type, amount_kobo, status FROM transactions WHERE id = " . $transactionId);
if ($result->num_rows > 0) {
    $tx = $result->fetch_assoc();
    echo "  Tx ID: " . $tx['id'] . " | Type: " . $tx['type'] . " | Amount: " . $tx['amount_kobo'] . " kobo | Status: " . $tx['status'] . "\n";
}

// Make API call to approve
$ch = curl_init('http://localhost:8000/api/admin/withdrawals/' . $withdrawalId . '/approve');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, '{}');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer e608ec1c3baa41def680fa29ddd7ecc0'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

echo "\nAPI Response:\n";
echo $response . "\n";

// Check withdrawal_requests AFTER
echo "\nAFTER approval - withdrawal_requests:\n";
$result = $conn->query("SELECT id, status, reviewed_by_admin_id, reviewed_at FROM withdrawal_requests WHERE id = " . $withdrawalId);
$wr = $result->fetch_assoc();
echo "  ID: " . $wr['id'] . " | Status: " . $wr['status'] . " | Reviewed by: " . $wr['reviewed_by_admin_id'] . " | At: " . $wr['reviewed_at'] . "\n";

// Check transaction AFTER
echo "\nAFTER approval - transaction details:\n";
$result = $conn->query("SELECT id, type, amount_kobo, status FROM transactions WHERE id = " . $transactionId);
if ($result->num_rows > 0) {
    $tx = $result->fetch_assoc();
    echo "  Tx ID: " . $tx['id'] . " | Type: " . $tx['type'] . " | Amount: " . $tx['amount_kobo'] . " kobo | Status: " . $tx['status'] . "\n";
}

$conn->close();
?>
