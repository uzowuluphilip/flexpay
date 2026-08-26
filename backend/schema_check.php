<?php
$conn = new mysqli('127.0.0.1', 'root', '', 'flexpay');
if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error);
}

echo "Transactions table structure:\n";
$result = $conn->query('DESC transactions');
while ($row = $result->fetch_assoc()) {
    echo "  " . $row['Field'] . " (" . $row['Type'] . ")\n";
}

echo "\nWithdrawal_requests table structure:\n";
$result = $conn->query('DESC withdrawal_requests');
while ($row = $result->fetch_assoc()) {
    echo "  " . $row['Field'] . " (" . $row['Type'] . ")\n";
}

echo "\nSample transaction row:\n";
$result = $conn->query('SELECT * FROM transactions LIMIT 1');
if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    foreach ($row as $key => $value) {
        echo "  $key: $value\n";
    }
}

$conn->close();
?>
