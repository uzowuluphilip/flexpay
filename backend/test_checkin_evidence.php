<?php
require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

$email = 'liveguard_1786709677_5032@test.local';
$password = 'Password123';
$apiBase = 'http://localhost:8000';

echo "========================================\n";
echo "STEP 1: LOGIN\n";
echo "========================================\n";

$ch = curl_init("$apiBase/api/auth/login");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Origin: http://localhost:5175'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['email' => $email, 'password' => $password]));

$loginResponse = curl_exec($ch);
$loginData = json_decode($loginResponse, true);
$token = $loginData['data']['token'] ?? null;

echo "LOGIN RESPONSE:\n";
echo json_encode($loginData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n\n";

if (!$token) {
    die("ERROR: No token received\n");
}

echo "Token: $token\n\n";

echo "========================================\n";
echo "STEP 2: CHECK-IN STATUS BEFORE CHECK-IN\n";
echo "========================================\n";

$ch = curl_init("$apiBase/api/wallet/checkin-status");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $token,
    'Content-Type: application/json'
]);

$beforeResponse = curl_exec($ch);
$beforeData = json_decode($beforeResponse, true);

echo "BEFORE CHECK-IN:\n";
echo json_encode($beforeData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n\n";

$dayBefore = $beforeData['data']['currentDay'] ?? 0;
echo "Current Day Before: $dayBefore\n\n";

echo "========================================\n";
echo "STEP 3: PERFORM CHECK-IN\n";
echo "========================================\n";

$ch = curl_init("$apiBase/api/wallet/checkin");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $token,
    'Content-Type: application/json'
]);

$checkinResponse = curl_exec($ch);
$checkinData = json_decode($checkinResponse, true);

echo "CHECK-IN RESPONSE:\n";
echo json_encode($checkinData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n\n";

$dayAfterCheckin = $checkinData['data']['currentDay'] ?? 0;
$claimedToday = $checkinData['data']['claimedToday'] ?? 0;
echo "Current Day After Check-In: $dayAfterCheckin\n";
echo "Claimed Today: $claimedToday\n\n";

echo "========================================\n";
echo "STEP 4: CHECK-IN STATUS AFTER CHECK-IN\n";
echo "========================================\n";

$ch = curl_init("$apiBase/api/wallet/checkin-status");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $token,
    'Content-Type: application/json'
]);

$afterResponse = curl_exec($ch);
$afterData = json_decode($afterResponse, true);

echo "AFTER CHECK-IN:\n";
echo json_encode($afterData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n\n";

$dayAfter = $afterData['data']['currentDay'] ?? 0;
echo "Current Day After: $dayAfter\n\n";

echo "========================================\n";
echo "SUMMARY\n";
echo "========================================\n";
echo "Day Changed: $dayBefore → $dayAfter\n";
echo "Claims Today: $claimedToday\n";
echo "Unlocked Days: " . implode(', ', $afterData['data']['unlockedDays'] ?? []) . "\n";
