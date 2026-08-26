<?php
$conn = new mysqli('127.0.0.1', 'root', '', 'flexpay');
if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error);
}

echo "=== CHECK TASKS API ENDPOINT ===\n\n";

// Get a valid session token for user 1
$result = $conn->query("SELECT token FROM sessions WHERE user_id = 1 ORDER BY created_at DESC LIMIT 1");
if ($result->num_rows == 0) {
    echo "No session found for user 1. Let me check sessions table structure:\n";
    $result = $conn->query("DESC sessions");
    while ($row = $result->fetch_assoc()) {
        echo "  " . $row['Field'] . "\n";
    }
    echo "\nSessions for user 1:\n";
    $result = $conn->query("SELECT * FROM sessions WHERE user_id = 1 LIMIT 1");
    while ($row = $result->fetch_assoc()) {
        print_r($row);
    }
    $conn->close();
    exit;
}

$session = $result->fetch_assoc();
$token = $session['token'];

echo "Using token for user 1: " . substr($token, 0, 20) . "...\n";

// Call the tasks API endpoint
$ch = curl_init('http://localhost:8000/api/tasks');
curl_setopt($ch, CURLOPT_GET, 1);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $token
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

echo "\nAPI Response (data section):\n";
if (isset($data['data']['tasks'])) {
    echo "Total tasks returned: " . count($data['data']['tasks']) . "\n\n";
    echo "Last 3 tasks:\n";
    $tasks = $data['data']['tasks'];
    foreach (array_slice($tasks, -3) as $task) {
        echo "  - " . $task['title'] . " (ID: " . $task['id'] . ", Reward: " . ($task['reward_kobo'] / 100) . " Naira)\n";
    }
} else {
    echo "Error or unexpected format:\n";
    echo $response . "\n";
}

$conn->close();
?>
