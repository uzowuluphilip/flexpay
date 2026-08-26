<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db = Database::getInstance()->getConnection();
$base = 'http://127.0.0.1:8000';

function request(string $method, string $path, ?array $payload = null, ?string $token = null, ?string $filePath = null): array
{
    global $base;
    $ch = curl_init($base . $path);
    $headers = ['Origin: http://localhost:5175'];
    if ($token !== null) $headers[] = 'Authorization: Bearer ' . $token;
    $options = [CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers];
    if ($filePath !== null) {
        $options[CURLOPT_POSTFIELDS] = ['amount' => '10000', 'receipt' => new CURLFile($filePath, 'application/pdf', 'receipt.pdf')];
    } elseif ($payload !== null) {
        $headers[] = 'Content-Type: application/json';
        $options[CURLOPT_HTTPHEADER] = $headers;
        $options[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_UNESCAPED_SLASHES);
    }
    curl_setopt_array($ch, $options);
    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);
    $decoded = json_decode($raw, true);
    return ['code' => $code, 'content_type' => $contentType, 'body' => is_array($decoded) ? $decoded : ['raw_length' => strlen((string) $raw)]];
}

function dbOne(string $sql, array $params = []): ?array
{
    global $db;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

function dbValue(string $sql, array $params = []): mixed
{
    global $db;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchColumn();
}

function createVerifiedUser(string $email): array
{
    $register = request('POST', '/api/auth/register', ['full_name' => 'Topup Admin Proof', 'email' => $email, 'password' => 'Password123']);
    $link = $register['body']['data']['verification_link'];
    $parts = parse_url($link);
    parse_str($parts['query'] ?? '', $query);
    request('POST', '/api/auth/verify-email', ['token' => $query['token'] ?? '']);
    $login = request('POST', '/api/auth/login', ['email' => $email, 'password' => 'Password123']);
    return [$login['body']['data']['token'], $register['body']['data']['user'] ?? []];
}

$receiptPath = sys_get_temp_dir() . '/flexpay-admin-proof-' . bin2hex(random_bytes(4)) . '.pdf';
file_put_contents($receiptPath, "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");

[$userToken, $user] = createVerifiedUser('topup_approve_' . time() . '@test.local');
$userId = (int) $user['id'];
$beforeApprove = (int) dbValue('SELECT balance_kobo FROM wallets WHERE user_id = ?', [$userId]);
$submitted = request('POST', '/api/wallet/topup/submit-receipt', null, $userToken, $receiptPath);
$approveReference = $submitted['body']['data']['reference'];
$approveTransaction = dbOne('SELECT * FROM transactions WHERE reference = ?', [$approveReference]);
$approveReceipt = dbOne('SELECT * FROM topup_receipts WHERE transaction_id = ?', [(int) $approveTransaction['id']]);

$adminLogin = request('POST', '/api/admin/login', ['email' => 'admin@flexpay.local', 'password' => 'Adm1nP@ssw0rd!']);
$adminToken = $adminLogin['body']['data']['token'];
$list = request('GET', '/api/admin/topups?status=pending', null, $adminToken);
$receiptView = request('GET', '/api/admin/topups/' . $approveReceipt['id'] . '/receipt', null, $adminToken);
$approved = request('POST', '/api/admin/topups/' . $approveReceipt['id'] . '/approve', null, $adminToken);
$approvedTransaction = dbOne('SELECT * FROM transactions WHERE id = ?', [(int) $approveTransaction['id']]);
$approvedReceipt = dbOne('SELECT * FROM topup_receipts WHERE id = ?', [(int) $approveReceipt['id']]);
$afterApprove = (int) dbValue('SELECT balance_kobo FROM wallets WHERE user_id = ?', [$userId]);
$activity = dbOne('SELECT * FROM activity_feed WHERE user_id = ? AND type = "top_up" ORDER BY id DESC LIMIT 1', [$userId]);
$audit = dbOne('SELECT * FROM admin_audit_log WHERE action = "topup.approve" AND target_id = ? ORDER BY id DESC LIMIT 1', [(int) $approveReceipt['id']]);

[$rejectUserToken, $rejectUser] = createVerifiedUser('topup_reject_' . time() . '@test.local');
$rejectUserId = (int) $rejectUser['id'];
$beforeReject = (int) dbValue('SELECT balance_kobo FROM wallets WHERE user_id = ?', [$rejectUserId]);
$rejectSubmitted = request('POST', '/api/wallet/topup/submit-receipt', null, $rejectUserToken, $receiptPath);
$rejectReference = $rejectSubmitted['body']['data']['reference'];
$rejectTransaction = dbOne('SELECT * FROM transactions WHERE reference = ?', [$rejectReference]);
$rejectReceipt = dbOne('SELECT * FROM topup_receipts WHERE transaction_id = ?', [(int) $rejectTransaction['id']]);
$rejected = request('POST', '/api/admin/topups/' . $rejectReceipt['id'] . '/reject', ['reason' => 'Receipt amount could not be matched.'], $adminToken);
$rejectedTransaction = dbOne('SELECT * FROM transactions WHERE id = ?', [(int) $rejectTransaction['id']]);
$rejectedReceipt = dbOne('SELECT * FROM topup_receipts WHERE id = ?', [(int) $rejectReceipt['id']]);
$afterReject = (int) dbValue('SELECT balance_kobo FROM wallets WHERE user_id = ?', [$rejectUserId]);
$rejectAudit = dbOne('SELECT * FROM admin_audit_log WHERE action = "topup.reject" AND target_id = ? ORDER BY id DESC LIMIT 1', [(int) $rejectReceipt['id']]);

@unlink($receiptPath);

echo json_encode([
    'admin_login_http' => $adminLogin['code'],
    'queue_http' => $list['code'],
    'queue_contains_submitted_receipt' => count(array_filter($list['body']['data']['topups'] ?? [], static fn (array $row): bool => (int) $row['id'] === (int) $approveReceipt['id'])) === 1,
    'receipt_view' => ['http_code' => $receiptView['code'], 'content_type' => $receiptView['content_type'], 'body' => $receiptView['body']],
    'approve' => [
        'before_balance_kobo' => $beforeApprove,
        'submit_response' => $submitted,
        'pending_transaction' => $approveTransaction,
        'pending_receipt' => $approveReceipt,
        'approve_response' => $approved,
        'completed_transaction' => $approvedTransaction,
        'approved_receipt' => $approvedReceipt,
        'after_balance_kobo' => $afterApprove,
        'activity_feed' => $activity,
        'admin_audit' => $audit,
    ],
    'reject' => [
        'before_balance_kobo' => $beforeReject,
        'submit_response' => $rejectSubmitted,
        'reject_response' => $rejected,
        'failed_transaction' => $rejectedTransaction,
        'rejected_receipt' => $rejectedReceipt,
        'after_balance_kobo' => $afterReject,
        'admin_audit' => $rejectAudit,
    ],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
