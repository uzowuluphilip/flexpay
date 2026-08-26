<?php
$conn = new mysqli('127.0.0.1', 'root', '', 'flexpay');
if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error);
}

// Check table structure
$result = $conn->query('DESC wallets');
echo "Wallets table structure:\n";
while ($row = $result->fetch_assoc()) {
    echo $row['Field'] . " (" . $row['Type'] . ")\n";
}

// Check a row
$result = $conn->query('SELECT * FROM wallets WHERE user_id = 1 LIMIT 1');
if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    echo "\nWallet for user 1:\n";
    print_r($row);
}

$conn->close();
?>
