$ProgressPreference = 'SilentlyContinue'

$email = 'liveguard_1786709677_5032@test.local'
$password = 'Password123'
$apiBase = 'http://localhost:8000'

Write-Output "========================================"
Write-Output "STEP 1: LOGIN"
Write-Output "========================================"
Write-Output ""

$headers = @{'Content-Type'='application/json'; 'Origin'='http://localhost:5175'}
$body = ConvertTo-Json @{email=$email; password=$password}
$loginResp = Invoke-RestMethod -Uri "$apiBase/api/auth/login" -Method Post -Headers $headers -Body $body

Write-Output "LOGIN RESPONSE:"
$loginResp | ConvertTo-Json -Depth 10
Write-Output ""

$token = $loginResp.data.token
Write-Output "Token: $token"
Write-Output ""

Write-Output "========================================"
Write-Output "STEP 2: CHECK-IN STATUS BEFORE"
Write-Output "========================================"
Write-Output ""

$beforeResp = Invoke-RestMethod -Uri "$apiBase/api/wallet/checkin-status" `
  -Headers @{'Authorization'="Bearer $token"; 'Content-Type'='application/json'} `
  -Method Get

Write-Output "BEFORE CHECK-IN RESPONSE:"
$beforeResp | ConvertTo-Json -Depth 10
Write-Output ""

$dayBefore = $beforeResp.data.currentDay
$unlockedBefore = $beforeResp.data.unlockedDays
Write-Output "Current Day Before: $dayBefore"
Write-Output "Unlocked Days Before: $(($unlockedBefore | ConvertTo-Json -Compress))"
Write-Output ""

Write-Output "========================================"
Write-Output "STEP 3: PERFORM CHECK-IN"
Write-Output "========================================"
Write-Output ""

$checkinResp = Invoke-RestMethod -Uri "$apiBase/api/wallet/checkin" `
  -Method Post `
  -Headers @{'Authorization'="Bearer $token"; 'Content-Type'='application/json'} `
  -Body '{}'

Write-Output "CHECK-IN RESPONSE:"
$checkinResp | ConvertTo-Json -Depth 10
Write-Output ""

$dayAfterCheckin = $checkinResp.data.currentDay
$claimedToday = $checkinResp.data.claimedToday
Write-Output "Current Day After Check-In: $dayAfterCheckin"
Write-Output "Claimed Today: $claimedToday"
Write-Output ""

Write-Output "========================================"
Write-Output "STEP 4: CHECK-IN STATUS AFTER"
Write-Output "========================================"
Write-Output ""

$afterResp = Invoke-RestMethod -Uri "$apiBase/api/wallet/checkin-status" `
  -Headers @{'Authorization'="Bearer $token"; 'Content-Type'='application/json'} `
  -Method Get

Write-Output "AFTER CHECK-IN RESPONSE:"
$afterResp | ConvertTo-Json -Depth 10
Write-Output ""

$dayAfter = $afterResp.data.currentDay
$unlockedAfter = $afterResp.data.unlockedDays
Write-Output "Current Day After: $dayAfter"
Write-Output "Unlocked Days After: $(($unlockedAfter | ConvertTo-Json -Compress))"
Write-Output ""

Write-Output "========================================"
Write-Output "EVIDENCE SUMMARY"
Write-Output "========================================"
Write-Output "Streak Changed: Day $dayBefore → Day $dayAfter"
Write-Output "Check-In Success: $(if ($dayAfter -gt $dayBefore) {'YES - Streak incremented'} else {'NO - No change'})"
Write-Output "Claims Today: $claimedToday"
Write-Output "Unlocked Days: $(($unlockedAfter | ConvertTo-Json -Compress))"
