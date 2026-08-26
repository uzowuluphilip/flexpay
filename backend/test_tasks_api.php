<?php
echo "=== CHECK TASKS API ===\n\n";

$ch = curl_init('http://localhost:8000/api/tasks');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

if (isset($data['data']['tasks'])) {
    $count = count($data['data']['tasks']);
    echo "Total tasks from API: $count\n\n";
    
    echo "Last 3 tasks:\n";
    $tasks = $data['data']['tasks'];
    foreach (array_slice($tasks, -3) as $task) {
        echo "  ID " . $task['id'] . ": " . $task['title'] . " (₦" . ($task['reward_kobo']/100) . ")\n";
    }
    
    // Check if new task is in the list
    $newTaskIds = array_filter($tasks, fn($t) => strpos($t['title'], 'Admin Test Task') !== false);
    echo "\nNew 'Admin Test Task' in list: " . (count($newTaskIds) > 0 ? "YES ✓" : "NO ✗") . "\n";
} else {
    echo "Error: " . $response . "\n";
}
?>
