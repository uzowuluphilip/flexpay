<?php
$conn = new mysqli('127.0.0.1', 'root', '', 'flexpay');
if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error);
}

// Check current balance
$result = $conn->query('SELECT user_id, balance FROM wallets WHERE user_id = 1');
$row = $result->fetch_assoc();
echo "BEFORE: User 1 wallet balance = " . $row['balance'] . " kobo\n";

// Adjust balance by 50000 kobo (₦500) with reason
$response = file_get_contents('http://localhost:8000/api/admin/users/1/adjust-balance', false, stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\nAuthorization: Bearer e608ec1c3baa41def680fa29ddd7ecc0\r\n",
        'content' => json_encode(['amount' => 50000, 'reason' => 'Test adjustment - admin verification'])
    ]
]));

echo "API Response: " . $response . "\n";

// Check balance after
$result = $conn->query('SELECT user_id, balance FROM wallets WHERE user_id = 1');
$row = $result->fetch_assoc();
echo "AFTER: User 1 wallet balance = " . $row['balance'] . " kobo\n";

// Check audit log
$result = $conn->query("SELECT * FROM admin_audit_log WHERE target_type = 'user' AND target_id = 1 ORDER BY created_at DESC LIMIT 1");
$row = $result->fetch_assoc();
echo "\nAUDIT LOG (latest entry):\n";
echo "Admin ID: " . $row['admin_id'] . "\n";
echo "Action: " . $row['action'] . "\n";
echo "Meta: " . $row['meta'] . "\n";
echo "Created: " . $row['created_at'] . "\n";

$conn->close();
?>
