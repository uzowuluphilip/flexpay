<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db = Database::getInstance()->getConnection();
$base = 'http://127.0.0.1:8000';

function httpRequest(string $method, string $path, ?array $payload = null, ?string $token = null, ?string $filePath = null): array
{
    global $base;
    $ch = curl_init($base . $path);
    $headers = ['Origin: http://localhost:5175'];
    if ($token !== null) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    $options = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
    ];
    if ($filePath !== null) {
        $options[CURLOPT_POSTFIELDS] = [
            'amount' => '10000',
            'receipt' => new CURLFile($filePath, 'application/pdf', 'receipt.pdf'),
        ];
    } elseif ($payload !== null) {
        $headers[] = 'Content-Type: application/json';
        $options[CURLOPT_HTTPHEADER] = $headers;
        $options[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_UNESCAPED_SLASHES);
    }
    curl_setopt_array($ch, $options);
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $body = json_decode($raw, true);
    return ['http' => $status, 'body' => is_array($body) ? $body : ['raw' => $raw]];
}

function dbRow(string $sql, array $params = []): ?array
{
    global $db;
    $statement = $db->prepare($sql);
    $statement->execute($params);
    $row = $statement->fetch();
    return $row === false ? null : $row;
}

function balance(int $userId): int
{
    global $db;
    $statement = $db->prepare('SELECT balance_kobo FROM wallets WHERE user_id = ? LIMIT 1');
    $statement->execute([$userId]);
    return (int) $statement->fetchColumn();
}

$email = 'topup_chain_' . time() . '@test.local';
$register = httpRequest('POST', '/api/auth/register', [
    'full_name' => 'Topup Balance Chain',
    'email' => $email,
    'password' => 'Password123',
]);
if (($register['body']['success'] ?? false) !== true) {
    throw new RuntimeException('Register failed: ' . json_encode($register['body']));
}

$link = $register['body']['data']['verification_link'];
$parts = parse_url($link);
parse_str($parts['query'] ?? '', $query);
$verify = httpRequest('POST', '/api/auth/verify-email', ['token' => $query['token'] ?? '']);
if (($verify['body']['success'] ?? false) !== true) {
    throw new RuntimeException('Verify failed: ' . json_encode($verify['body']));
}

$login = httpRequest('POST', '/api/auth/login', ['email' => $email, 'password' => 'Password123']);
$token = $login['body']['data']['token'] ?? '';
if ($token === '') {
    throw new RuntimeException('Login failed: ' . json_encode($login['body']));
}

$user = dbRow('SELECT id, email FROM users WHERE email = ? LIMIT 1', [$email]);
$userId = (int) $user['id'];
$before = balance($userId);

$receiptPath = sys_get_temp_dir() . '/flexpay-chain-' . bin2hex(random_bytes(4)) . '.pdf';
file_put_contents($receiptPath, "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");
$submit = httpRequest('POST', '/api/wallet/topup/submit-receipt', null, $token, $receiptPath);
$reference = $submit['body']['data']['reference'] ?? '';
$pendingTransaction = dbRow('SELECT * FROM transactions WHERE reference = ? LIMIT 1', [$reference]);
$pendingReceipt = dbRow('SELECT * FROM topup_receipts WHERE transaction_id = ? LIMIT 1', [(int) ($pendingTransaction['id'] ?? 0)]);
$afterUpload = balance($userId);

$adminLogin = httpRequest('POST', '/api/admin/login', [
    'email' => 'admin@flexpay.local',
    'password' => 'Adm1nP@ssw0rd!',
]);
$adminToken = $adminLogin['body']['data']['token'] ?? '';
$approve = httpRequest('POST', '/api/admin/topups/' . (int) $pendingReceipt['id'] . '/approve', null, $adminToken);
$completedTransaction = dbRow('SELECT * FROM transactions WHERE id = ? LIMIT 1', [(int) $pendingTransaction['id']]);
$approvedReceipt = dbRow('SELECT * FROM topup_receipts WHERE id = ? LIMIT 1', [(int) $pendingReceipt['id']]);
$afterApproval = balance($userId);
$activity = dbRow('SELECT * FROM activity_feed WHERE user_id = ? AND type = "top_up" ORDER BY id DESC LIMIT 1', [$userId]);
$audit = dbRow('SELECT * FROM admin_audit_log WHERE action = "topup.approve" AND target_id = ? ORDER BY id DESC LIMIT 1', [(int) $pendingReceipt['id']]);

@unlink($receiptPath);

echo json_encode([
    'same_account' => [
        'user_id' => $userId,
        'email' => $email,
        'reference' => $reference,
    ],
    'step_1_before_any_topup' => [
        'balance_kobo' => $before,
        'balance_naira' => $before / 100,
    ],
    'step_2_after_receipt_upload' => [
        'submit_http' => $submit['http'],
        'balance_kobo' => $afterUpload,
        'balance_naira' => $afterUpload / 100,
        'transaction' => $pendingTransaction,
        'receipt' => $pendingReceipt,
    ],
    'step_3_after_admin_approval' => [
        'approve_http' => $approve['http'],
        'approve_response' => $approve['body'],
        'balance_kobo' => $afterApproval,
        'balance_naira' => $afterApproval / 100,
        'completed_transaction' => $completedTransaction,
        'approved_receipt' => $approvedReceipt,
        'activity_feed' => $activity,
        'admin_audit' => $audit,
    ],
    'math' => [
        'claimed_amount_kobo' => 1000000,
        'fee_kobo' => 20000,
        'expected_credit_kobo' => 980000,
        'observed_increase_kobo' => $afterApproval - $afterUpload,
    ],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
