<?php
$conn = new mysqli('127.0.0.1', 'root', '', 'flexpay');
if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error);
}

echo "=== USER 1 BALANCE RECONCILIATION ===\n\n";

// Get wallet balance
$result = $conn->query("SELECT balance_kobo FROM wallets WHERE user_id = 1");
$wallet = $result->fetch_assoc();
$balanceKobo = $wallet['balance_kobo'];
echo "Wallet balance_kobo: " . $balanceKobo . " (" . ($balanceKobo/100) . " Naira)\n";

// Sum all transactions for user 1
$result = $conn->query("SELECT SUM(amount_kobo) as total FROM transactions WHERE user_id = 1");
$row = $result->fetch_assoc();
$txSum = $row['total'] ?: 0;
echo "SUM(amount_kobo) from transactions: " . $txSum . " (" . ($txSum/100) . " Naira)\n";

// Difference
$diff = $balanceKobo - $txSum;
echo "\nDifference (Wallet - Transaction Sum): " . $diff . " (" . ($diff/100) . " Naira)\n";
echo (abs($diff) < 1 ? "✓ BALANCED" : "✗ OUT OF BALANCE BY " . abs($diff/100) . " Naira") . "\n";

// Show all transactions for user 1
echo "\n=== ALL TRANSACTIONS FOR USER 1 ===\n";
$result = $conn->query("SELECT id, type, amount_kobo, status, created_at FROM transactions WHERE user_id = 1 ORDER BY created_at ASC");
$runningTotal = 0;
while ($tx = $result->fetch_assoc()) {
    $runningTotal += $tx['amount_kobo'];
    echo sprintf("ID %2d: %20s %12s kobo (%-9s) Running Total: %12s\n", 
        $tx['id'], 
        $tx['type'], 
        $tx['amount_kobo'], 
        $tx['status'],
        $runningTotal
    );
}
echo "Final running total: " . $runningTotal . " (" . ($runningTotal/100) . " Naira)\n";

$conn->close();
?>
