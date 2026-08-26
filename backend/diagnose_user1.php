<?php
$conn = new mysqli('127.0.0.1', 'root', '', 'flexpay');
if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error);
}

echo "=== DIAGNOSTIC: USER 1 WITHDRAWAL & TRANSACTION STATE ===\n\n";

// Check wallet
$result = $conn->query("SELECT balance_kobo FROM wallets WHERE user_id = 1");
$wallet = $result->fetch_assoc();
echo "Current wallet balance: " . $wallet['balance_kobo'] . " kobo (₦" . ($wallet['balance_kobo']/100) . ")\n\n";

// All withdrawal requests for user 1
echo "ALL WITHDRAWAL REQUESTS FOR USER 1:\n";
$result = $conn->query("SELECT id, transaction_id, amount_kobo, status, rejection_reason, created_at FROM withdrawal_requests WHERE user_id = 1 ORDER BY created_at ASC");
while ($wr = $result->fetch_assoc()) {
    echo "  ID: " . $wr['id'] . " | Tx: " . $wr['transaction_id'] . " | Amount: " . $wr['amount_kobo'] . " kobo (₦" . ($wr['amount_kobo']/100) . ") | Status: " . $wr['status'] . " | Reason: " . ($wr['rejection_reason'] ?? 'null') . " | Created: " . $wr['created_at'] . "\n";
}

// All transactions for user 1
echo "\nALL TRANSACTIONS FOR USER 1:\n";
$result = $conn->query("SELECT id, type, amount_kobo, status, meta, created_at FROM transactions WHERE user_id = 1 ORDER BY created_at ASC");
while ($tx = $result->fetch_assoc()) {
    echo "  ID: " . $tx['id'] . " | Type: " . $tx['type'] . " | Amount: " . $tx['amount_kobo'] . " kobo | Status: " . $tx['status'] . " | Created: " . $tx['created_at'] . "\n";
}

$conn->close();
?>
