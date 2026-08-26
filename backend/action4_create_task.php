<?php
$conn = new mysqli('127.0.0.1', 'root', '', 'flexpay');
if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error);
}

echo "=== ACTION 4: CREATE TASK THROUGH ADMIN API ===\n\n";

// Count tasks before
$result = $conn->query("SELECT COUNT(*) as count FROM tasks WHERE is_active = 1");
$row = $result->fetch_assoc();
$taskCountBefore = $row['count'];
echo "Tasks in database BEFORE creation: " . $taskCountBefore . "\n";

// Get highest task ID before
$result = $conn->query("SELECT MAX(id) as max_id FROM tasks");
$row = $result->fetch_assoc();
$maxIdBefore = $row['max_id'] ?: 0;
echo "Highest task ID before: " . $maxIdBefore . "\n\n";

// Create new task via admin API
$newTaskTitle = "Admin Test Task - " . date('Y-m-d H:i:s');
$newTaskData = [
    'title' => $newTaskTitle,
    'description' => 'This task was created by the admin API to verify task creation works through the admin panel.',
    'rewardNaira' => 750
];

$ch = curl_init('http://localhost:8000/api/admin/tasks');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($newTaskData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer e608ec1c3baa41def680fa29ddd7ecc0'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

echo "Create task API response:\n";
echo $response . "\n\n";

// Parse the response
$responseData = json_decode($response, true);
$createdTaskId = $responseData['data']['taskId'] ?? null;

if (!$createdTaskId) {
    // Try to find it by looking for the newest task
    $result = $conn->query("SELECT id FROM tasks ORDER BY created_at DESC LIMIT 1");
    $row = $result->fetch_assoc();
    $createdTaskId = $row['id'];
}

echo "Created task ID: " . $createdTaskId . "\n\n";

// Verify in database
echo "Verify task in database:\n";
$result = $conn->query("SELECT id, title, description, reward_naira, is_active, created_at FROM tasks WHERE id = " . $createdTaskId);
if ($result->num_rows > 0) {
    $task = $result->fetch_assoc();
    echo "  ID: " . $task['id'] . "\n";
    echo "  Title: " . $task['title'] . "\n";
    echo "  Description: " . $task['description'] . "\n";
    echo "  Reward: " . $task['reward_naira'] . " Naira\n";
    echo "  Active: " . $task['is_active'] . "\n";
    echo "  Created: " . $task['created_at'] . "\n";
} else {
    echo "  ERROR: Task not found in database!\n";
}

// Count tasks after
$result = $conn->query("SELECT COUNT(*) as count FROM tasks WHERE is_active = 1");
$row = $result->fetch_assoc();
$taskCountAfter = $row['count'];
echo "\nTasks in database AFTER creation: " . $taskCountAfter . "\n";
echo "Difference: " . ($taskCountAfter - $taskCountBefore) . " (should be +1)\n";

// Check audit log for this action
echo "\nAudit log entry for task creation:\n";
$result = $conn->query("SELECT action, target_id, meta FROM admin_audit_log WHERE action = 'task.create' ORDER BY created_at DESC LIMIT 1");
if ($result->num_rows > 0) {
    $audit = $result->fetch_assoc();
    echo "  Action: " . $audit['action'] . "\n";
    echo "  Target ID: " . $audit['target_id'] . "\n";
    echo "  Meta: " . $audit['meta'] . "\n";
}

$conn->close();
?>
