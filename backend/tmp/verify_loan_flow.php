<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db = Database::getInstance()->getConnection();
$base = 'http://127.0.0.1:8000';

function request(string $method, string $path, ?array $payload = null, ?string $token = null, array $files = []): array
{
    global $base;
    $headers = ['Origin: http://localhost:5173'];
    if ($token !== null) $headers[] = 'Authorization: Bearer ' . $token;
    $options = [CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers];
    if ($files !== []) {
        $fields = $payload ?? [];
        foreach ($files as $name => $pathValue) $fields[$name] = new CURLFile($pathValue, 'application/pdf', basename($pathValue));
        $options[CURLOPT_POSTFIELDS] = $fields;
    } elseif ($payload !== null) {
        $headers[] = 'Content-Type: application/json';
        $options[CURLOPT_HTTPHEADER] = $headers;
        $options[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_THROW_ON_ERROR);
    }
    $curl = curl_init($base . $path);
    curl_setopt_array($curl, $options);
    $raw = curl_exec($curl);
    $http = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    $decoded = json_decode((string) $raw, true);
    return ['http' => $http, 'body' => is_array($decoded) ? $decoded : ['raw' => $raw]];
}

function row(string $sql, array $params = []): ?array
{
    global $db;
    $statement = $db->prepare($sql);
    $statement->execute($params);
    $value = $statement->fetch();
    return $value === false ? null : $value;
}

function balance(int $userId): int
{
    $wallet = row('SELECT balance_kobo FROM wallets WHERE user_id = ? LIMIT 1', [$userId]);
    return (int) ($wallet['balance_kobo'] ?? 0);
}

function requireSuccess(array $response, string $label): void
{
    if (($response['body']['success'] ?? false) !== true) throw new RuntimeException($label . ' failed: ' . json_encode($response));
}

$stamp = date('YmdHis') . bin2hex(random_bytes(2));
$email = 'loan_evidence_' . $stamp . '@test.local';
$register = request('POST', '/api/auth/register', ['full_name' => 'Loan Evidence User', 'email' => $email, 'password' => 'Password123']);
requireSuccess($register, 'register');
$login = request('POST', '/api/auth/login', ['email' => $email, 'password' => 'Password123']);
requireSuccess($login, 'user login');
$userToken = $login['body']['data']['token'];
$user = row('SELECT id, email FROM users WHERE email = ? LIMIT 1', [$email]);
$userId = (int) $user['id'];
$before = balance($userId);

$idFile = tempnam(sys_get_temp_dir(), 'loan-id-') . '.pdf';
$addressFile = tempnam(sys_get_temp_dir(), 'loan-address-') . '.pdf';
$receiptOne = tempnam(sys_get_temp_dir(), 'loan-repay-one-') . '.pdf';
$receiptTwo = tempnam(sys_get_temp_dir(), 'loan-repay-two-') . '.pdf';
$pdf = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n";
foreach ([$idFile, $addressFile, $receiptOne, $receiptTwo] as $file) file_put_contents($file, $pdf);

$submitRequest = request('POST', '/api/loans/request', [
    'amount' => '10000',
    'purpose' => 'Dummy loan evidence test',
    'employment_status' => 'employed',
    'monthly_income_range' => '₦50,000 - ₦149,999',
], $userToken, ['id_document' => $idFile, 'proof_of_address' => $addressFile]);
requireSuccess($submitRequest, 'loan request');
$requestRow = row('SELECT * FROM loan_requests WHERE user_id = ? ORDER BY id DESC LIMIT 1', [$userId]);
$afterRequest = balance($userId);

$adminLogin = request('POST', '/api/admin/login', ['email' => 'admin@flexpay.local', 'password' => 'Adm1nP@ssw0rd!']);
requireSuccess($adminLogin, 'admin login');
$adminToken = $adminLogin['body']['data']['token'];
$approveRequest = request('POST', '/api/admin/loan-requests/' . (int) $requestRow['id'] . '/approve', null, $adminToken);
requireSuccess($approveRequest, 'loan approval');
$loanRow = row('SELECT * FROM loans WHERE loan_request_id = ? LIMIT 1', [(int) $requestRow['id']]);
$disbursement = row('SELECT * FROM transactions WHERE type = "loan_disbursement" AND user_id = ? ORDER BY id DESC LIMIT 1', [$userId]);
$afterDisbursement = balance($userId);

$partial = request('POST', '/api/loans/' . (int) $loanRow['id'] . '/repay', ['amount' => '5000'], $userToken, ['receipt' => $receiptOne]);
requireSuccess($partial, 'partial repayment submission');
$partialRow = row('SELECT * FROM loan_repayments WHERE loan_id = ? ORDER BY id DESC LIMIT 1', [(int) $loanRow['id']]);
$beforePartialApproval = balance($userId);
$approvePartial = request('POST', '/api/admin/loan-repayments/' . (int) $partialRow['id'] . '/approve', null, $adminToken);
requireSuccess($approvePartial, 'partial repayment approval');
$loanAfterPartial = row('SELECT * FROM loans WHERE id = ? LIMIT 1', [(int) $loanRow['id']]);
$afterPartialApproval = balance($userId);

$final = request('POST', '/api/loans/' . (int) $loanRow['id'] . '/repay', ['amount' => '5500'], $userToken, ['receipt' => $receiptTwo]);
requireSuccess($final, 'final repayment submission');
$finalRow = row('SELECT * FROM loan_repayments WHERE loan_id = ? ORDER BY id DESC LIMIT 1', [(int) $loanRow['id']]);
$approveFinal = request('POST', '/api/admin/loan-repayments/' . (int) $finalRow['id'] . '/approve', null, $adminToken);
requireSuccess($approveFinal, 'final repayment approval');
$loanAfterFinal = row('SELECT * FROM loans WHERE id = ? LIMIT 1', [(int) $loanRow['id']]);
$afterFinalApproval = balance($userId);
$repaymentTransactions = $db->prepare('SELECT * FROM transactions WHERE type = "loan_repayment" AND user_id = ? ORDER BY id ASC');
$repaymentTransactions->execute([$userId]);
$audit = $db->prepare('SELECT action, target_type, target_id, meta FROM admin_audit_log WHERE admin_id = (SELECT id FROM admin_users WHERE email = "admin@flexpay.local") AND target_type IN ("loan_request", "loan_repayment") ORDER BY id DESC LIMIT 5');
$audit->execute();

foreach ([$idFile, $addressFile, $receiptOne, $receiptTwo] as $file) @unlink($file);

echo json_encode([
    'same_account' => ['user_id' => $userId, 'email' => $email],
    'request' => ['http' => $submitRequest['http'], 'db' => $requestRow, 'balance_before_kobo' => $before, 'balance_after_request_kobo' => $afterRequest],
    'disbursement' => ['http' => $approveRequest['http'], 'loan' => $loanRow, 'transaction' => $disbursement, 'balance_after_kobo' => $afterDisbursement, 'expected_increase_kobo' => 1000000, 'observed_increase_kobo' => $afterDisbursement - $afterRequest],
    'partial_repayment' => ['submit_http' => $partial['http'], 'approve_http' => $approvePartial['http'], 'repayment' => $partialRow, 'loan_after' => $loanAfterPartial, 'wallet_before_kobo' => $beforePartialApproval, 'wallet_after_kobo' => $afterPartialApproval, 'wallet_change_kobo' => $afterPartialApproval - $beforePartialApproval],
    'final_repayment' => ['submit_http' => $final['http'], 'approve_http' => $approveFinal['http'], 'repayment' => $finalRow, 'loan_after' => $loanAfterFinal, 'wallet_after_kobo' => $afterFinalApproval],
    'repayment_transactions' => $repaymentTransactions->fetchAll(),
    'audit_rows' => $audit->fetchAll(),
    'math' => ['principal_kobo' => 1000000, 'fee_kobo' => 50000, 'total_repayable_kobo' => 1050000, 'partial_kobo' => 500000, 'final_kobo' => 550000],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), PHP_EOL;
