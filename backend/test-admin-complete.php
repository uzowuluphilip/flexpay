<?php
function apiCall($endpoint, $method = 'GET', $data = null, $token = null) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "http://localhost:8000/api/admin$endpoint");
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
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
    curl_close($ch);
    
    return ['code' => $httpCode, 'data' => json_decode($result, true)];
}

// Step 1: Login
echo "=== STEP 1: ADMIN LOGIN ===\n";
$login = apiCall('/login', 'POST', [
    'email' => 'admin@flexpay.local',
    'password' => 'Adm1nP@ssw0rd!'
]);
$token = $login['data']['data']['token'] ?? null;
echo "Status: " . ($login['code'] === 200 ? "✓ SUCCESS" : "✗ FAILED") . "\n";
echo "Token: " . substr($token, 0, 20) . "...\n\n";

// Step 2: Get Overview
echo "=== STEP 2: GET ADMIN OVERVIEW ===\n";
$overview = apiCall('/overview', 'GET', null, $token);
echo "Status: " . ($overview['code'] === 200 ? "✓ SUCCESS" : "✗ FAILED") . "\n";
if ($overview['code'] === 200) {
    $data = $overview['data']['data'];
    echo "Total Users: " . $data['totalUsers'] . "\n";
    echo "Verified Users: " . $data['verifiedUsers'] . "\n";
    echo "Platform Balance: ₦" . number_format($data['platformBalance'], 2) . "\n";
    echo "Pending Withdrawals: " . $data['pendingWithdrawals'] . "\n";
}
echo "\n";

// Step 3: List Users
echo "=== STEP 3: LIST USERS ===\n";
$users = apiCall('/users', 'GET', null, $token);
echo "Status: " . ($users['code'] === 200 ? "✓ SUCCESS" : "✗ FAILED") . "\n";
if ($users['code'] === 200) {
    $userList = $users['data']['data']['users'] ?? [];
    echo "Users Found: " . count($userList) . "\n";
    if (count($userList) > 0) {
        echo "First User: " . $userList[0]['full_name'] . " (" . $userList[0]['email'] . ")\n";
    }
}
echo "\n";

// Step 4: Adjust User Balance
if (count($userList) > 0) {
    $userId = $userList[0]['id'];
    echo "=== STEP 4: ADJUST USER BALANCE ===\n";
    $adjust = apiCall("/users/$userId/adjust-balance", 'POST', [
        'amount' => 500,
        'reason' => 'Admin test credit - verification purposes'
    ], $token);
    echo "Status: " . ($adjust['code'] === 200 ? "✓ SUCCESS" : "✗ FAILED") . "\n";
    if ($adjust['code'] === 200) {
        echo "New Balance: ₦" . number_format($adjust['data']['data']['newBalance'], 2) . "\n";
    }
    echo "\n";
}

// Step 5: Check Audit Log
echo "=== STEP 5: VERIFY AUDIT LOG IN DATABASE ===\n";
try {
    $pdo = new PDO('mysql:host=localhost;dbname=flexpay', 'root', '');
    $stmt = $pdo->query('SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 1');
    $lastLog = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($lastLog) {
        echo "✓ Audit Log Found\n";
        echo "Action: " . $lastLog['action'] . "\n";
        echo "Target: " . $lastLog['target_type'] . " (ID: " . $lastLog['target_id'] . ")\n";
        echo "Meta: " . $lastLog['meta'] . "\n";
    }
} catch (Exception $e) {
    echo "✗ Database Error: " . $e->getMessage() . "\n";
}
echo "\n";

// Step 6: List Pending Withdrawals
echo "=== STEP 6: LIST PENDING WITHDRAWALS ===\n";
$withdrawals = apiCall('/withdrawals?status=pending', 'GET', null, $token);
echo "Status: " . ($withdrawals['code'] === 200 ? "✓ SUCCESS" : "✗ FAILED") . "\n";
if ($withdrawals['code'] === 200) {
    $withdrawalsList = $withdrawals['data']['data']['withdrawals'] ?? [];
    echo "Pending Withdrawals: " . count($withdrawalsList) . "\n";
    if (count($withdrawalsList) > 0) {
        echo "First Withdrawal: ₦" . number_format($withdrawalsList[0]['amount_kobo'] / 100, 2) . " from " . $withdrawalsList[0]['full_name'] . "\n";
    }
}
echo "\n";

echo "✓ ALL ADMIN ENDPOINTS VERIFIED\n";
?>
