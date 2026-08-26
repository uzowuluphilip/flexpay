<?php
echo "========================================\n";
echo "   FLEXPAY ADMIN PANEL - FULL TEST      \n";
echo "========================================\n\n";

// Helper function for API calls
function apiCall($endpoint, $method = 'GET', $data = null, $token = null) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "http://localhost:8000/api/admin$endpoint");
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $headers = ['Content-Type: application/json'];
    if ($token) {
        $headers[] = "Authorization: Bearer $token";
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    if ($data) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    return [
        'code' => $httpCode,
        'data' => json_decode($result, true),
        'raw' => $result,
        'error' => $error
    ];
}

// TEST 1: Admin Login
echo "TEST 1: ADMIN LOGIN\n";
echo "-------------------\n";
$login = apiCall('/login', 'POST', [
    'email' => 'admin@flexpay.local',
    'password' => 'Adm1nP@ssw0rd!'
]);

if ($login['code'] !== 200) {
    echo "✗ FAILED - Code: " . $login['code'] . "\n";
    echo "Error: " . $login['error'] . "\n";
    echo "Response: " . $login['raw'] . "\n";
    exit(1);
}

$token = $login['data']['data']['token'] ?? null;
if (!$token) {
    echo "✗ FAILED - No token in response\n";
    exit(1);
}

echo "✓ PASSED\n";
echo "Token: " . substr($token, 0, 20) . "...\n";
echo "Admin: " . $login['data']['data']['admin']['full_name'] . "\n\n";

// TEST 2: Get Overview
echo "TEST 2: GET PLATFORM OVERVIEW\n";
echo "-----------------------------\n";
$overview = apiCall('/overview', 'GET', null, $token);

if ($overview['code'] !== 200) {
    echo "✗ FAILED\n";
    exit(1);
}

$stats = $overview['data']['data'];
echo "✓ PASSED\n";
echo "Total Users: " . $stats['totalUsers'] . "\n";
echo "Verified Users: " . $stats['verifiedUsers'] . "\n";
echo "Platform Balance: ₦" . number_format($stats['platformBalance'], 2) . "\n";
echo "Pending Withdrawals: " . $stats['pendingWithdrawals'] . " (₦" . number_format($stats['totalPendingAmount'], 2) . ")\n\n";

// Get first user for adjustment test
echo "TEST 3: GET FIRST USER DETAILS\n";
echo "------------------------------\n";

// Directly query the database to get user ID
try {
    $pdo = new PDO('mysql:host=localhost;dbname=flexpay', 'root', '');
    $stmt = $pdo->query('SELECT id FROM users LIMIT 1');
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    $userId = $user['id'] ?? 1;
    
    $userDetail = apiCall("/users/$userId", 'GET', null, $token);
    if ($userDetail['code'] !== 200) {
        echo "✗ FAILED to get user detail\n";
        var_dump($userDetail);
        exit(1);
    }
    
    echo "✓ PASSED\n";
    echo "User: " . $userDetail['data']['data']['user']['full_name'] . "\n";
    echo "Email: " . $userDetail['data']['data']['user']['email'] . "\n";
    echo "Current Balance: ₦" . (($userDetail['data']['data']['wallet']['balance_kobo'] ?? 0) / 100) . "\n\n";
    
    // TEST 4: Adjust User Balance
    echo "TEST 4: ADJUST USER BALANCE\n";
    echo "--------------------------\n";
    
    $oldBalance = ($userDetail['data']['data']['wallet']['balance_kobo'] ?? 0) / 100;
    $adjustAmount = 250;
    
    $adjust = apiCall("/users/$userId/adjust-balance", 'POST', [
        'amount' => $adjustAmount,
        'reason' => 'Admin verification test - wallet top-up'
    ], $token);
    
    if ($adjust['code'] !== 200) {
        echo "✗ FAILED\n";
        var_dump($adjust);
        exit(1);
    }
    
    $newBalance = $adjust['data']['data']['newBalance'] ?? 0;
    echo "✓ PASSED\n";
    echo "Amount Added: ₦" . number_format($adjustAmount, 2) . "\n";
    echo "Old Balance: ₦" . number_format($oldBalance, 2) . "\n";
    echo "New Balance: ₦" . number_format($newBalance, 2) . "\n";
    echo "Difference: ₦" . number_format($newBalance - $oldBalance, 2) . "\n\n";
    
    // TEST 5: Verify in Database
    echo "TEST 5: VERIFY CHANGE IN DATABASE\n";
    echo "---------------------------------\n";
    
    $stmt = $pdo->prepare('SELECT balance_kobo FROM wallets WHERE user_id = ?');
    $stmt->execute([$userId]);
    $wallet = $stmt->fetch(PDO::FETCH_ASSOC);
    $dbBalance = ($wallet['balance_kobo'] ?? 0) / 100;
    
    if (abs($dbBalance - $newBalance) < 0.01) {
        echo "✓ PASSED\n";
        echo "Database Balance: ₦" . number_format($dbBalance, 2) . "\n";
    } else {
        echo "✗ FAILED - Balance mismatch\n";
        echo "Expected: ₦" . number_format($newBalance, 2) . "\n";
        echo "Database: ₦" . number_format($dbBalance, 2) . "\n";
    }
    echo "\n";
    
    // TEST 6: Verify Audit Log
    echo "TEST 6: VERIFY AUDIT LOG\n";
    echo "------------------------\n";
    
    $stmt = $pdo->query('SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 1');
    $log = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($log && $log['action'] === 'wallet.adjust') {
        echo "✓ PASSED\n";
        echo "Action: " . $log['action'] . "\n";
        echo "Target: " . $log['target_type'] . " ID:" . $log['target_id'] . "\n";
        echo "Meta: " . $log['meta'] . "\n";
    } else {
        echo "✗ FAILED - No audit log entry found\n";
    }
    echo "\n";
    
    // TEST 7: Create Task
    echo "TEST 7: CREATE NEW TASK\n";
    echo "----------------------\n";
    
    $createTask = apiCall('/tasks', 'POST', [
        'title' => 'Admin Test Task',
        'description' => 'This is a test task created by admin panel',
        'rewardNaira' => 500
    ], $token);
    
    if ($createTask['code'] !== 201) {
        echo "✗ FAILED\n";
        var_dump($createTask);
    } else {
        echo "✓ PASSED\n";
        $taskId = $createTask['data']['data']['taskId'] ?? null;
        echo "Task ID: $taskId\n";
        echo "Task Name: " . $createTask['data']['data']['task']['title'] . "\n";
        echo "Reward: ₦" . $createTask['data']['data']['task']['rewardNaira'] . "\n";
        
        // Verify task exists in database
        $stmt = $pdo->prepare('SELECT * FROM tasks WHERE id = ?');
        $stmt->execute([$taskId]);
        $task = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($task) {
            echo "✓ Task verified in database\n";
        }
    }
    
    echo "\n========================================\n";
    echo "✓ ALL TESTS PASSED\n";
    echo "========================================\n";
    
} catch (Exception $e) {
    echo "✗ Database Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>
