<?php
$conn = new mysqli('127.0.0.1', 'root', '', 'flexpay');
if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error);
}

echo "=== ACTION 1: ADJUST USER BALANCE ===\n\n";

// Check current balance
$result = $conn->query('SELECT user_id, balance_kobo FROM wallets WHERE user_id = 1');
$row = $result->fetch_assoc();
$beforeBalance = $row['balance_kobo'];
echo "BEFORE: User 1 wallet balance = " . $beforeBalance . " kobo (₦" . ($beforeBalance/100) . ")\n";

// Make API call to adjust balance
$adjustAmount = 50000; // 500 naira
$reason = 'Test adjustment - admin verification';

$curlUrl = 'http://localhost:8000/api/admin/users/1/adjust-balance';
$curlData = json_encode(['amount' => $adjustAmount, 'reason' => $reason]);

$ch = curl_init($curlUrl);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $curlData);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer e608ec1c3baa41def680fa29ddd7ecc0'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

echo "\nAPI Response:\n";
echo $response . "\n";

// Check balance after
$result = $conn->query('SELECT user_id, balance_kobo FROM wallets WHERE user_id = 1');
$row = $result->fetch_assoc();
$afterBalance = $row['balance_kobo'];
echo "\nAFTER: User 1 wallet balance = " . $afterBalance . " kobo (₦" . ($afterBalance/100) . ")\n";
echo "Change: " . ($afterBalance - $beforeBalance) . " kobo (₦" . (($afterBalance - $beforeBalance)/100) . ")\n";

// Check audit log
$result = $conn->query("SELECT * FROM admin_audit_log WHERE target_type = 'user' AND target_id = 1 ORDER BY created_at DESC LIMIT 1");
if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    echo "\nAUDIT LOG (latest entry for user 1):\n";
    echo "  Admin ID: " . $row['admin_id'] . "\n";
    echo "  Action: " . $row['action'] . "\n";
    echo "  Target Type: " . $row['target_type'] . "\n";
    echo "  Target ID: " . $row['target_id'] . "\n";
    echo "  Meta: " . $row['meta'] . "\n";
    echo "  Created: " . $row['created_at'] . "\n";
}

$conn->close();
?>
