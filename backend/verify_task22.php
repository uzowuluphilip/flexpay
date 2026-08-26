<?php
$conn = new mysqli('127.0.0.1', 'root', '', 'flexpay');
if ($conn->connect_error) {
    die('Connection failed: ' . $conn->connect_error);
}

echo "=== VERIFY TASK 22 IN DATABASE ===\n\n";

// Check table structure
echo "Tasks table structure:\n";
$result = $conn->query('DESC tasks');
while ($row = $result->fetch_assoc()) {
    echo "  " . $row['Field'] . " (" . $row['Type'] . ")\n";
}

echo "\nTask 22 details:\n";
$result = $conn->query("SELECT * FROM tasks WHERE id = 22");
if ($result->num_rows > 0) {
    $task = $result->fetch_assoc();
    foreach ($task as $key => $value) {
        echo "  $key: $value\n";
    }
} else {
    echo "  Task not found\n";
}

echo "\n=== ACTION 5: CHECK ACTUAL TASK COUNT ===\n\n";

// Count all tasks
$result = $conn->query("SELECT COUNT(*) as count FROM tasks");
$row = $result->fetch_assoc();
echo "Total tasks in database: " . $row['count'] . "\n";

// Count active tasks
$result = $conn->query("SELECT COUNT(*) as count FROM tasks WHERE is_active = 1");
$row = $result->fetch_assoc();
echo "Active tasks (is_active=1): " . $row['count'] . "\n";

// List all tasks by ID
echo "\nAll tasks by ID:\n";
$result = $conn->query("SELECT id, title, is_active FROM tasks ORDER BY id ASC");
$taskIds = [];
while ($task = $result->fetch_assoc()) {
    $taskIds[] = $task['id'];
    $status = $task['is_active'] == 1 ? "active" : "inactive";
    echo "  ID " . $task['id'] . ": " . $task['title'] . " (" . $status . ")\n";
}

echo "\nTask count reconciliation:\n";
echo "  Database reports: " . count($taskIds) . " total tasks\n";
echo "  User reported earlier: '6+'\n";
echo "  Wallet backend showed: 21 tasks\n";
echo "  Current after creation: " . (count($taskIds)) . " tasks\n";

$conn->close();
?>
