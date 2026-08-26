<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost:8000/api/admin/login');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'email' => 'admin@flexpay.local',
    'password' => 'Adm1nP@ssw0rd!'
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$result = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response: $result\n";

if ($httpCode === 200) {
    $data = json_decode($result, true);
    echo "\n✓ Admin Login SUCCESS\n";
    echo "Token: " . substr($data['token'], 0, 20) . "...\n";
    echo "Admin: " . $data['admin']['full_name'] . " (" . $data['admin']['email'] . ")\n";
} else {
    echo "\n✗ Admin Login FAILED\n";
}
?>
