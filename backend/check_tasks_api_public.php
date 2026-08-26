<?php
$conn = new mysqli('127.0.0.1', 'root', '', 'flexpay');
if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error);
}

echo "Sessions table structure:\n";
$result = $conn->query("DESC sessions");
while ($row = $result->fetch_assoc()) {
    echo "  " . $row['Field'] . " (" . $row['Type'] . ")\n";
}

echo "\nCheck tasks API directly with curl (PHP):\n";
$ch = curl_init('http://localhost:8000/api/tasks');
curl_setopt($ch, CURLOPT_GET, 1);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
echo "\nAPI Response:\n";
if (isset($data['data']['tasks'])) {
    echo "Total tasks returned: " . count($data['data']['tasks']) . "\n\n";
    echo "Last 3 tasks:\n";
    $tasks = $data['data']['tasks'];
    foreach (array_slice($tasks, -3) as $task) {
        echo "  - " . $task['title'] . " (ID: " . $task['id'] . ")\n";
    }
} else {
    echo "Response: " . substr($response, 0, 200) . "\n";
}

$conn->close();
?>
