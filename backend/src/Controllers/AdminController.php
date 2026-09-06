<?php

declare(strict_types=1);

namespace FlexPay\Controllers;

use FlexPay\Config\Database;
use FlexPay\Http\Request;
use FlexPay\Http\Response;
use FlexPay\Repositories\AdminSessionRepository;
use FlexPay\Repositories\AdminUserRepository;
use FlexPay\Services\TokenService;
use FlexPay\Services\NotificationService;
use PDO;

final class AdminController
{
    private PDO $db;
    private AdminUserRepository $admins;
    private AdminSessionRepository $sessions;
    private NotificationService $notifications;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
        $this->admins = new AdminUserRepository();
        $this->sessions = new AdminSessionRepository();
        $this->notifications = new NotificationService();
    }

    public function overview(Request $request): void
    {
        $admin = $this->requireAdmin($request);

        $totalUsers = (int) $this->db->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $verifiedUsers = (int) $this->db->query('SELECT COUNT(*) FROM users WHERE email_verified_at IS NOT NULL')->fetchColumn();
        $bannedUsers = (int) $this->db->query('SELECT COUNT(*) FROM users WHERE status IN ("banned", "suspended")')->fetchColumn();
        $platformBalance = (int) $this->db->query('SELECT COALESCE(SUM(balance_kobo), 0) FROM wallets')->fetchColumn();
        $pendingTransactions = (int) $this->db->query('SELECT COUNT(DISTINCT id) FROM transactions WHERE status = "pending"')->fetchColumn();
        $approvedWithdrawals = (int) $this->db->query('SELECT COUNT(*) FROM withdrawal_requests WHERE status IN ("approved", "paid")')->fetchColumn();
        $rejectedWithdrawals = (int) $this->db->query('SELECT COUNT(*) FROM withdrawal_requests WHERE status = "rejected"')->fetchColumn();
        $totalPendingAmount = (int) $this->db->query('SELECT COALESCE(SUM(amount_kobo), 0) FROM transactions WHERE status = "pending"')->fetchColumn();
        $todaySignups = (int) $this->db->query('SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURDATE()')->fetchColumn();
        $todayTaskCompletions = (int) $this->db->query('SELECT COUNT(*) FROM task_completions WHERE DATE(completed_at) = CURDATE()')->fetchColumn();

        Response::success([
            'totalUsers' => $totalUsers,
            'verifiedUsers' => $verifiedUsers,
            'bannedUsers' => $bannedUsers,
            'platformBalance' => $platformBalance / 100,
            'pendingTransactions' => $pendingTransactions,
            'pendingWithdrawals' => $pendingTransactions,
            'approvedWithdrawals' => $approvedWithdrawals,
            'rejectedWithdrawals' => $rejectedWithdrawals,
            'totalPendingAmount' => $totalPendingAmount / 100,
            'todaySignups' => $todaySignups,
            'todayTaskCompletions' => $todayTaskCompletions,
        ]);
    }

    public function listUsers(Request $request): void
    {
        $admin = $this->requireAdmin($request);

        $search = trim((string) ($request->query('search') ?? ''));
        $status = trim((string) ($request->query('status') ?? ''));
        $limit = min(100, (int) ($request->query('limit') ?? 50));
        $offset = (int) ($request->query('offset') ?? 0);

        $query = 'SELECT id, full_name, email, status, email_verified_at, created_at FROM users';
        $params = [];
        $conditions = [];

        if ($search !== '') {
            $conditions[] = '(full_name LIKE ? OR email LIKE ?)';
            $pattern = '%' . $search . '%';
            $params = [$pattern, $pattern];
        }

        if ($status === 'banned') {
            $conditions[] = 'status IN ("banned", "suspended")';
        } elseif (in_array($status, ['active', 'suspended', 'banned'], true)) {
            $conditions[] = 'status = ?';
            $params[] = $status;
        }

        if ($conditions !== []) {
            $query .= ' WHERE ' . implode(' AND ', $conditions);
        }

        $query .= ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $users = $stmt->fetchAll();

        Response::success(['users' => $users]);
    }

    public function userDetail(Request $request, array $params = []): void
    {
        $admin = $this->requireAdmin($request);
        $userId = (int) ($params['id'] ?? 0);

        if ($userId <= 0) {
            Response::error('User not found.', 404);
        }

        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if ($user === false) {
            Response::error('User not found.', 404);
        }

        $walletStmt = $this->db->prepare('SELECT * FROM wallets WHERE user_id = ? LIMIT 1');
        $walletStmt->execute([$userId]);
        $wallet = $walletStmt->fetch();

        $referralCount = (int) $this->db->query("SELECT COUNT(*) FROM referrals WHERE referrer_user_id = {$userId} AND status = 'active'")->fetchColumn();

        $transactionStmt = $this->db->prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10');
        $transactionStmt->execute([$userId]);
        $transactions = $transactionStmt->fetchAll();

        Response::success([
            'user' => $user,
            'wallet' => $wallet ?: null,
            'referralCount' => $referralCount,
            'recentTransactions' => $transactions,
        ]);
    }

    public function suspendUser(Request $request, array $params = []): void
    {
        $admin = $this->requireAdmin($request);
        $userId = (int) ($params['id'] ?? 0);

        if ($userId <= 0) {
            Response::error('User not found.', 404);
        }

        $stmt = $this->db->prepare('UPDATE users SET status = "suspended" WHERE id = ?');
        $stmt->execute([$userId]);

        $this->logAudit((int) $admin['id'], 'user.suspend', 'user', $userId, ['reason' => 'Admin suspension']);

        Response::success(['suspended' => true]);
    }

    public function reactivateUser(Request $request, array $params = []): void
    {
        $admin = $this->requireAdmin($request);
        $userId = (int) ($params['id'] ?? 0);

        if ($userId <= 0) {
            Response::error('User not found.', 404);
        }

        $stmt = $this->db->prepare('UPDATE users SET status = "active" WHERE id = ?');
        $stmt->execute([$userId]);

        $this->logAudit((int) $admin['id'], 'user.reactivate', 'user', $userId, ['reason' => 'Admin reactivation']);

        Response::success(['reactivated' => true]);
    }

    public function adjustBalance(Request $request, array $params = []): void
    {
        $admin = $this->requireAdmin($request);
        $userId = (int) ($params['id'] ?? 0);
        $payload = $request->json();

        if ($userId <= 0) {
            Response::error('User not found.', 404);
        }

        $amount = (int) round((float) ($payload['amount'] ?? 0) * 100);
        $reason = trim((string) ($payload['reason'] ?? ''));

        if ($amount === 0 || $reason === '') {
            Response::error('Amount and reason are required.', 422);
        }

        $wallet = $this->getOrCreateWallet($userId);

        $reference = 'admin_adjust_' . $userId . '_' . time() . '_' . bin2hex(random_bytes(4));
        $this->db->prepare(
            'INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at)
             VALUES (?, ?, "admin_adjustment", ?, "completed", ?, ?, NOW(), NOW())'
        )->execute([
            $userId,
            (int) $wallet['id'],
            $amount,
            $reference,
            json_encode(['reason' => $reason], JSON_THROW_ON_ERROR),
        ]);

        $this->syncWalletBalance($userId);

        $this->logAudit((int) $admin['id'], 'wallet.adjust', 'user', $userId, ['amount_kobo' => $amount, 'reason' => $reason]);

        Response::success([
            'adjusted' => true,
            'newBalance' => $this->getBalanceKobo($userId) / 100,
        ]);
    }

    public function listWithdrawals(Request $request): void
    {
        $admin = $this->requireAdmin($request);

        $status = trim((string) ($request->query('status') ?? 'pending'));
        $limit = min(100, (int) ($request->query('limit') ?? 50));
        $offset = (int) ($request->query('offset') ?? 0);

        $query = 'SELECT wr.*, u.full_name, u.email FROM withdrawal_requests wr JOIN users u ON wr.user_id = u.id';
        $params = [];

        if ($status !== '') {
            $query .= ' WHERE wr.status = ?';
            $params[] = $status;
        }

        $query .= ' ORDER BY wr.created_at DESC LIMIT ? OFFSET ?';
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $withdrawals = $stmt->fetchAll();

        Response::success(['withdrawals' => $withdrawals]);
    }

    public function approveWithdrawal(Request $request, array $params = []): void
    {
        $admin = $this->requireAdmin($request);
        $withdrawalId = (int) ($params['id'] ?? 0);

        if ($withdrawalId <= 0) {
            Response::error('Withdrawal not found.', 404);
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('SELECT * FROM withdrawal_requests WHERE id = ? FOR UPDATE');
            $stmt->execute([$withdrawalId]);
            $withdrawal = $stmt->fetch();

            if ($withdrawal === false) {
                $this->db->rollBack();
                Response::error('Withdrawal not found.', 404);
            }

            if ($withdrawal['status'] !== 'pending') {
                $this->db->rollBack();
                Response::error('Only pending withdrawals can be approved.', 422);
            }

            $walletLock = $this->db->prepare('SELECT id FROM wallets WHERE user_id = ? FOR UPDATE');
            $walletLock->execute([(int) $withdrawal['user_id']]);
            $balanceStmt = $this->db->prepare('SELECT COALESCE(SUM(amount_kobo), 0) FROM transactions WHERE user_id = ? AND status = "completed"');
            $balanceStmt->execute([(int) $withdrawal['user_id']]);
            if ((int) $balanceStmt->fetchColumn() < (int) $withdrawal['amount_kobo']) {
                $this->db->rollBack();
                Response::error('Insufficient balance to approve this withdrawal.', 422, 'insufficient_balance');
            }

            $this->db->prepare('UPDATE withdrawal_requests SET status = "approved", reviewed_by_admin_id = ?, reviewed_at = NOW() WHERE id = ?')->execute([(int) $admin['id'], $withdrawalId]);
            $this->db->prepare('UPDATE transactions SET status = "completed", updated_at = NOW() WHERE id = ? AND status = "pending"')->execute([(int) $withdrawal['transaction_id']]);
            $this->db->commit();
            $this->syncWalletBalance((int) $withdrawal['user_id']);
        } catch (\Throwable $throwable) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $throwable;
        }

        $this->logAudit((int) $admin['id'], 'withdrawal.approve', 'withdrawal_request', $withdrawalId, ['amount_kobo' => $withdrawal['amount_kobo']]);
        $this->sendPush((int) $withdrawal['user_id'], 'Withdrawal approved!', '₦' . number_format(((int) $withdrawal['amount_kobo']) / 100, 2) . ' is on its way.', '/withdraw');

        Response::success(['approved' => true]);
    }

    public function rejectWithdrawal(Request $request, array $params = []): void
    {
        $admin = $this->requireAdmin($request);
        $withdrawalId = (int) ($params['id'] ?? 0);
        $payload = $request->json();
        $reason = trim((string) ($payload['reason'] ?? ''));

        if ($withdrawalId <= 0) {
            Response::error('Withdrawal not found.', 404);
        }

        if ($reason === '') {
            Response::error('Rejection reason is required.', 422);
        }

        $stmt = $this->db->prepare('SELECT * FROM withdrawal_requests WHERE id = ? LIMIT 1');
        $stmt->execute([$withdrawalId]);
        $withdrawal = $stmt->fetch();

        if ($withdrawal === false) {
            Response::error('Withdrawal not found.', 404);
        }

        if ($withdrawal['status'] !== 'pending') {
            Response::error('Only pending withdrawals can be rejected.', 422);
        }

        $this->db->prepare('UPDATE withdrawal_requests SET status = "rejected", rejection_reason = ?, reviewed_by_admin_id = ?, reviewed_at = NOW() WHERE id = ?')->execute([$reason, (int) $admin['id'], $withdrawalId]);
        if (!empty($withdrawal['transaction_id'])) {
            $this->db->prepare('UPDATE transactions SET status = "reversed", updated_at = NOW() WHERE id = ? AND status = "pending"')->execute([(int) $withdrawal['transaction_id']]);
        }
        $this->syncWalletBalance((int) $withdrawal['user_id']);

        $this->logAudit((int) $admin['id'], 'withdrawal.reject', 'withdrawal_request', $withdrawalId, ['amount_kobo' => $withdrawal['amount_kobo'], 'reason' => $reason]);
        $this->sendPush((int) $withdrawal['user_id'], 'Withdrawal update', 'Your request needs attention.', '/withdraw');

        Response::success(['rejected' => true]);
    }

    public function listTopups(Request $request): void
    {
        $this->requireAdmin($request);
        $status = trim((string) ($request->query('status') ?? 'pending'));
        $limit = min(100, max(1, (int) ($request->query('limit') ?? 50)));
        $offset = max(0, (int) ($request->query('offset') ?? 0));
        $query = 'SELECT tr.*, COALESCE(JSON_UNQUOTE(JSON_EXTRACT(t.meta, "$.claimed_amount_kobo")), t.amount_kobo) AS claimed_amount_kobo, t.reference, t.created_at AS transaction_created_at, u.full_name, u.email
                  FROM topup_receipts tr JOIN transactions t ON t.id = tr.transaction_id JOIN users u ON u.id = tr.user_id';
        $params = [];
        if ($status !== '') {
            $query .= ' WHERE tr.status = ?';
            $params[] = $status;
        }
        $query .= ' ORDER BY tr.created_at DESC LIMIT ? OFFSET ?';
        $params[] = $limit;
        $params[] = $offset;
        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        Response::success(['topups' => $stmt->fetchAll()]);
    }

    public function listPendingTransactions(Request $request): void
    {
        $this->requireAdmin($request);
        $stmt = $this->db->query(
            'SELECT t.id, t.type, t.amount_kobo, t.status, t.reference, t.meta, t.created_at,
                    u.full_name, u.email, tr.id AS receipt_id, wr.id AS withdrawal_id, wr.bank_name,
                    wr.account_number, wr.account_name
             FROM transactions t
             JOIN users u ON u.id = t.user_id
             LEFT JOIN topup_receipts tr ON tr.transaction_id = t.id
             LEFT JOIN withdrawal_requests wr ON wr.transaction_id = t.id
             WHERE t.status = "pending"
             ORDER BY t.created_at DESC'
        );
        Response::success(['transactions' => $stmt->fetchAll()]);
    }

    public function approveTransaction(Request $request, array $params = []): void
    {
        $admin = $this->requireAdmin($request);
        $transactionId = (int) ($params['id'] ?? 0);
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('SELECT t.*, wr.id AS withdrawal_id FROM transactions t LEFT JOIN withdrawal_requests wr ON wr.transaction_id = t.id WHERE t.id = ? FOR UPDATE');
            $stmt->execute([$transactionId]);
            $transaction = $stmt->fetch();
            if ($transaction === false || $transaction['status'] !== 'pending') {
                $this->db->rollBack();
                Response::error('Pending transaction not found.', 404);
            }
            $transactionMeta = json_decode((string) ($transaction['meta'] ?? '{}'), true) ?: [];

            if ($transaction['type'] === 'top_up') {
                $meta = json_decode((string) ($transaction['meta'] ?? '{}'), true) ?: [];
                $claimedKobo = (int) ($meta['claimed_amount_kobo'] ?? $transaction['amount_kobo']);
                $feeKobo = (int) round($claimedKobo * 0.02);
                $this->db->prepare('UPDATE transactions SET amount_kobo = ?, status = "completed", meta = JSON_SET(COALESCE(meta, JSON_OBJECT()), "$.fee_kobo", ?, "$.credited_amount_kobo", ?), updated_at = NOW() WHERE id = ?')->execute([$claimedKobo - $feeKobo, $feeKobo, $claimedKobo - $feeKobo, $transactionId]);
                $this->db->prepare('UPDATE topup_receipts SET status = "approved", reviewed_by_admin_id = ?, reviewed_at = NOW() WHERE transaction_id = ? AND status = "pending"')->execute([(int) $admin['id'], $transactionId]);
            } elseif ($transaction['type'] === 'withdrawal') {
                $balanceStmt = $this->db->prepare('SELECT COALESCE(SUM(amount_kobo), 0) FROM transactions WHERE user_id = ? AND status = "completed"');
                $balanceStmt->execute([(int) $transaction['user_id']]);
                if ((int) $balanceStmt->fetchColumn() < abs((int) $transaction['amount_kobo'])) {
                    $this->db->rollBack();
                    Response::error('Insufficient balance to approve this withdrawal.', 422, 'insufficient_balance');
                }
                $this->db->prepare('UPDATE withdrawal_requests SET status = "approved", reviewed_by_admin_id = ?, reviewed_at = NOW() WHERE transaction_id = ?')->execute([(int) $admin['id'], $transactionId]);
            } elseif ($transaction['type'] === 'lock_hold') {
                $balanceStmt = $this->db->prepare('SELECT COALESCE(SUM(amount_kobo), 0) FROM transactions WHERE user_id = ? AND status = "completed"');
                $balanceStmt->execute([(int) $transaction['user_id']]);
                if ((int) $balanceStmt->fetchColumn() < abs((int) $transaction['amount_kobo'])) {
                    $this->db->rollBack();
                    Response::error('Insufficient balance to approve this investment.', 422, 'insufficient_balance');
                }
            }

            if ($transaction['type'] !== 'top_up') {
                $this->db->prepare('UPDATE transactions SET status = "completed", updated_at = NOW() WHERE id = ?')->execute([$transactionId]);
            }
            if ($transaction['type'] === 'upgrade_fee') {
                $this->applyApprovedReferralTier((int) $transaction['user_id'], (string) ($transactionMeta['tier'] ?? ''));
                $this->db->prepare('UPDATE topup_receipts SET status = "approved", reviewed_by_admin_id = ?, reviewed_at = NOW() WHERE transaction_id = ? AND status = "pending"')->execute([(int) $admin['id'], $transactionId]);
            }
            $this->syncWalletBalance((int) $transaction['user_id']);
            $this->db->commit();
        } catch (\Throwable $throwable) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $throwable;
        }
        Response::success(['approved' => true]);
    }

    public function rejectTransaction(Request $request, array $params = []): void
    {
        $admin = $this->requireAdmin($request);
        $transactionId = (int) ($params['id'] ?? 0);
        $reason = trim((string) ($request->json()['reason'] ?? ''));
        if ($reason === '') Response::error('Rejection reason is required.', 422);
        $stmt = $this->db->prepare('SELECT * FROM transactions WHERE id = ? AND status = "pending" LIMIT 1');
        $stmt->execute([$transactionId]);
        $transaction = $stmt->fetch();
        if ($transaction === false) Response::error('Pending transaction not found.', 404);
        $this->db->prepare('UPDATE transactions SET status = "reversed", meta = JSON_SET(COALESCE(meta, JSON_OBJECT()), "$.rejection_reason", ?), updated_at = NOW() WHERE id = ? AND status = "pending"')->execute([$reason, $transactionId]);
        $this->db->prepare('UPDATE withdrawal_requests SET status = "rejected", rejection_reason = ?, reviewed_by_admin_id = ?, reviewed_at = NOW() WHERE transaction_id = ? AND status = "pending"')->execute([$reason, (int) $admin['id'], $transactionId]);
        $this->db->prepare('UPDATE topup_receipts SET status = "rejected", rejection_reason = ?, reviewed_by_admin_id = ?, reviewed_at = NOW() WHERE transaction_id = ? AND status = "pending"')->execute([$reason, (int) $admin['id'], $transactionId]);
        if ($transaction['type'] === 'lock_hold') {
            $this->db->prepare('UPDATE fund_locks SET status = "cancelled", released_at = NOW() WHERE user_id = ? AND amount_kobo = ? AND status = "active" ORDER BY id DESC LIMIT 1')->execute([(int) $transaction['user_id'], abs((int) $transaction['amount_kobo'])]);
        }
        Response::success(['rejected' => true]);
    }

    public function approveTopup(Request $request, array $params = []): void
    {
        $admin = $this->requireAdmin($request);
        $receiptId = (int) ($params['id'] ?? 0);
        $stmt = $this->db->prepare('SELECT tr.*, t.amount_kobo, t.wallet_id, t.reference, t.type, t.meta FROM topup_receipts tr JOIN transactions t ON t.id = tr.transaction_id WHERE tr.id = ? LIMIT 1');
        $stmt->execute([$receiptId]);
        $receipt = $stmt->fetch();
        if ($receipt === false) {
            Response::error('Top-up receipt not found.', 404);
        }
        if ($receipt['status'] !== 'pending') {
            Response::success(['alreadyProcessed' => true, 'status' => $receipt['status']]);
        }
        $claimedKobo = (int) $receipt['amount_kobo'];
        $transactionMeta = json_decode((string) ($receipt['meta'] ?? '{}'), true) ?: [];
        if ($receipt['type'] === 'upgrade_fee') {
            $claimedKobo = (int) ($transactionMeta['claimed_amount_kobo'] ?? 0);
        }
        $feeKobo = (int) round($claimedKobo * 0.02);
        $creditKobo = $receipt['type'] === 'upgrade_fee' ? 0 : $claimedKobo - $feeKobo;
        $this->db->beginTransaction();
        try {
            $this->db->prepare('UPDATE transactions SET amount_kobo = ?, status = "completed", meta = JSON_SET(COALESCE(meta, JSON_OBJECT()), "$.claimed_amount_kobo", ?, "$.fee_kobo", ?, "$.credited_amount_kobo", ?) WHERE id = ? AND status = "pending"')->execute([$creditKobo, $claimedKobo, $feeKobo, $creditKobo, (int) $receipt['transaction_id']]);
            $this->db->prepare('UPDATE topup_receipts SET status = "approved", reviewed_by_admin_id = ?, reviewed_at = NOW() WHERE id = ? AND status = "pending"')->execute([(int) $admin['id'], $receiptId]);
            if ($receipt['type'] === 'upgrade_fee') {
                $this->applyApprovedReferralTier((int) $receipt['user_id'], (string) ($transactionMeta['tier'] ?? ''));
            }
            if ($receipt['type'] !== 'upgrade_fee') {
                $this->db->prepare('INSERT INTO activity_feed (user_id, type, description, amount_kobo, created_at) VALUES (?, "top_up", ?, ?, NOW())')->execute([(int) $receipt['user_id'], 'Top-up approved after receipt review', $creditKobo]);
                $this->syncWalletBalance((int) $receipt['user_id']);
            }
            $this->logAudit((int) $admin['id'], 'topup.approve', 'topup_receipt', $receiptId, ['claimed_amount_kobo' => $claimedKobo, 'fee_kobo' => $feeKobo, 'credited_amount_kobo' => $creditKobo]);
            $this->db->commit();
        } catch (\Throwable $throwable) {
            $this->db->rollBack();
            throw $throwable;
        }
        $this->sendPush((int) $receipt['user_id'], $receipt['type'] === 'upgrade_fee' ? 'Upgrade payment confirmed!' : 'Top-up confirmed!', $receipt['type'] === 'upgrade_fee' ? 'Your upgrade payment was approved for manual processing.' : '₦' . number_format($creditKobo / 100, 2) . ' has been added to your wallet.', '/history');
        Response::success(['approved' => true, 'creditedAmountKobo' => $creditKobo]);
    }

    public function rejectTopup(Request $request, array $params = []): void
    {
        $admin = $this->requireAdmin($request);
        $receiptId = (int) ($params['id'] ?? 0);
        $reason = trim((string) ($request->json()['reason'] ?? ''));
        if ($reason === '') {
            Response::error('Rejection reason is required.', 422);
        }
        $stmt = $this->db->prepare('SELECT * FROM topup_receipts WHERE id = ? LIMIT 1');
        $stmt->execute([$receiptId]);
        $receipt = $stmt->fetch();
        if ($receipt === false) {
            Response::error('Top-up receipt not found.', 404);
        }
        if ($receipt['status'] !== 'pending') {
            Response::success(['alreadyProcessed' => true, 'status' => $receipt['status']]);
        }
        $this->db->beginTransaction();
        try {
            $this->db->prepare('UPDATE topup_receipts SET status = "rejected", rejection_reason = ?, reviewed_by_admin_id = ?, reviewed_at = NOW() WHERE id = ?')->execute([$reason, (int) $admin['id'], $receiptId]);
            $this->db->prepare('UPDATE transactions SET status = "failed", meta = JSON_SET(COALESCE(meta, JSON_OBJECT()), "$.rejection_reason", ?) WHERE id = ?')->execute([$reason, (int) $receipt['transaction_id']]);
            $this->logAudit((int) $admin['id'], 'topup.reject', 'topup_receipt', $receiptId, ['reason' => $reason]);
            $this->db->commit();
        } catch (\Throwable $throwable) {
            $this->db->rollBack();
            throw $throwable;
        }
        Response::success(['rejected' => true]);
    }

    public function topupReceipt(Request $request, array $params = []): void
    {
        $this->requireAdmin($request);
        $stmt = $this->db->prepare('SELECT file_path, receipt_data, receipt_mime FROM topup_receipts WHERE id = ? LIMIT 1');
        $stmt->execute([(int) ($params['id'] ?? 0)]);
        $receipt = $stmt->fetch();
        if ($receipt === false) {
            Response::error('Receipt not found.', 404);
        }

        if ($receipt['receipt_data'] !== null && $receipt['receipt_data'] !== '') {
            header('Content-Type: ' . ((string) $receipt['receipt_mime'] ?: 'application/octet-stream'));
            header('Content-Length: ' . strlen($receipt['receipt_data']));
            echo $receipt['receipt_data'];
            exit;
        }

        $fileName = $receipt['file_path'];
        $filePath = dirname(__DIR__, 2) . '/storage/topup-receipts/' . basename((string) $fileName);
        if (!$fileName || !is_file($filePath)) {
            Response::error('Receipt file not found.', 404);
        }
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($filePath) ?: 'application/octet-stream';
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
        exit;
    }

    public function transactionReceipt(Request $request, array $params = []): void
    {
        $this->requireAdmin($request);
        $stmt = $this->db->prepare(
            'SELECT tr.file_path, tr.receipt_data, tr.receipt_mime
             FROM topup_receipts tr
             JOIN transactions t ON t.id = tr.transaction_id
             WHERE t.id = ? LIMIT 1'
        );
        $stmt->execute([(int) ($params['id'] ?? 0)]);
        $receipt = $stmt->fetch();
        if ($receipt === false) {
            Response::error('Receipt not found for this transaction.', 404);
        }

        if ($receipt['receipt_data'] !== null && $receipt['receipt_data'] !== '') {
            header('Content-Type: ' . ((string) $receipt['receipt_mime'] ?: 'application/octet-stream'));
            header('Content-Length: ' . strlen($receipt['receipt_data']));
            echo $receipt['receipt_data'];
            exit;
        }

        $filePath = dirname(__DIR__, 2) . '/storage/topup-receipts/' . basename((string) $receipt['file_path']);
        if (!is_file($filePath)) {
            Response::error('Receipt file is unavailable for this transaction.', 404);
        }
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($filePath) ?: 'application/octet-stream';
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
        exit;
    }

    public function listLoanRequests(Request $request): void
    {
        $this->requireAdmin($request);
        $status = trim((string) ($request->query('status') ?? 'pending'));
        $query = 'SELECT lr.*, u.full_name, u.email FROM loan_requests lr JOIN users u ON u.id = lr.user_id';
        $params = [];
        if ($status !== '') { $query .= ' WHERE lr.status = ?'; $params[] = $status; }
        $query .= ' ORDER BY lr.created_at DESC LIMIT 100';
        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        Response::success(['requests' => $stmt->fetchAll()]);
    }

    public function approveLoanRequest(Request $request, array $params = []): void
    {
        $admin = $this->requireAdmin($request);
        $requestId = (int) ($params['id'] ?? 0);
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('SELECT * FROM loan_requests WHERE id = ? FOR UPDATE');
            $stmt->execute([$requestId]);
            $loanRequest = $stmt->fetch();
            if ($loanRequest === false) { $this->db->rollBack(); Response::error('Loan request not found.', 404); }
            if ($loanRequest['status'] !== 'pending') { $this->db->rollBack(); Response::error('Only pending loan requests can be approved.', 422); }
            $existing = $this->db->prepare('SELECT id FROM loans WHERE loan_request_id = ? LIMIT 1');
            $existing->execute([$requestId]);
            if ($existing->fetchColumn() !== false) { $this->db->rollBack(); Response::error('This loan request has already been disbursed.', 422); }
            $wallet = $this->getOrCreateWallet((int) $loanRequest['user_id']);
            $this->db->prepare('UPDATE loan_requests SET status = "approved", reviewed_by_admin_id = ?, reviewed_at = NOW() WHERE id = ?')->execute([(int) $admin['id'], $requestId]);
            $this->db->prepare('INSERT INTO loans (user_id, loan_request_id, principal_kobo, fee_kobo, total_repayable_kobo, amount_repaid_kobo, status, disbursed_at) VALUES (?, ?, ?, ?, ?, 0, "active", NOW())')->execute([(int) $loanRequest['user_id'], $requestId, (int) $loanRequest['amount_kobo'], (int) $loanRequest['fee_kobo'], (int) $loanRequest['total_repayable_kobo']]);
            $loanId = (int) $this->db->lastInsertId();
            $reference = 'loan_disbursement_' . $loanId . '_' . bin2hex(random_bytes(6));
            $this->db->prepare('INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at) VALUES (?, ?, "loan_disbursement", ?, "completed", ?, ?, NOW(), NOW())')->execute([(int) $loanRequest['user_id'], (int) $wallet['id'], (int) $loanRequest['amount_kobo'], $reference, json_encode(['loan_id' => $loanId, 'loan_request_id' => $requestId, 'principal_kobo' => (int) $loanRequest['amount_kobo'], 'fee_kobo' => (int) $loanRequest['fee_kobo']], JSON_THROW_ON_ERROR)]);
            $this->db->prepare('INSERT INTO activity_feed (user_id, type, description, amount_kobo, created_at) VALUES (?, "loan", ?, ?, NOW())')->execute([(int) $loanRequest['user_id'], 'Loan approved and disbursed', (int) $loanRequest['amount_kobo']]);
            $this->syncWalletBalance((int) $loanRequest['user_id']);
            $this->logAudit((int) $admin['id'], 'loan.approve', 'loan_request', $requestId, ['loan_id' => $loanId, 'principal_kobo' => (int) $loanRequest['amount_kobo'], 'total_repayable_kobo' => (int) $loanRequest['total_repayable_kobo']]);
            $this->db->commit();
        } catch (\Throwable $throwable) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $throwable;
        }
        Response::success(['approved' => true, 'loanId' => $loanId, 'creditedPrincipalKobo' => (int) $loanRequest['amount_kobo']]);
    }

    public function rejectLoanRequest(Request $request, array $params = []): void
    {
        $admin = $this->requireAdmin($request);
        $requestId = (int) ($params['id'] ?? 0);
        $reason = trim((string) ($request->json()['reason'] ?? ''));
        if ($reason === '') Response::error('Rejection reason is required.', 422);
        $stmt = $this->db->prepare('UPDATE loan_requests SET status = "rejected", rejection_reason = ?, reviewed_by_admin_id = ?, reviewed_at = NOW() WHERE id = ? AND status = "pending"');
        $stmt->execute([$reason, (int) $admin['id'], $requestId]);
        if ($stmt->rowCount() === 0) Response::error('Pending loan request not found.', 404);
        $this->logAudit((int) $admin['id'], 'loan.reject', 'loan_request', $requestId, ['reason' => $reason]);
        Response::success(['rejected' => true]);
    }

    public function loanRequestDocument(Request $request, array $params = []): void
    {
        $this->requireAdmin($request);
        $document = trim((string) ($request->query('type') ?? 'id')) === 'address' ? 'proof_of_address_path' : 'id_document_path';
        $stmt = $this->db->prepare("SELECT {$document} AS file_path FROM loan_requests WHERE id = ? LIMIT 1");
        $stmt->execute([(int) ($params['id'] ?? 0)]);
        $row = $stmt->fetch();
        if ($row === false) Response::error('Loan document not found.', 404);
        $this->streamLoanDocument((string) $row['file_path']);
    }

    public function listLoanRepayments(Request $request): void
    {
        $this->requireAdmin($request);
        $status = trim((string) ($request->query('status') ?? 'pending'));
        $query = 'SELECT lr.*, l.principal_kobo, l.total_repayable_kobo, l.amount_repaid_kobo, l.status AS loan_status, u.full_name, u.email FROM loan_repayments lr JOIN loans l ON l.id = lr.loan_id JOIN users u ON u.id = lr.user_id';
        $params = [];
        if ($status !== '') { $query .= ' WHERE lr.status = ?'; $params[] = $status; }
        $query .= ' ORDER BY lr.created_at DESC LIMIT 100';
        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        Response::success(['repayments' => $stmt->fetchAll()]);
    }

    public function approveLoanRepayment(Request $request, array $params = []): void
    {
        $admin = $this->requireAdmin($request);
        $repaymentId = (int) ($params['id'] ?? 0);
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('SELECT lr.*, l.total_repayable_kobo, l.amount_repaid_kobo, l.status AS loan_status FROM loan_repayments lr JOIN loans l ON l.id = lr.loan_id WHERE lr.id = ? FOR UPDATE');
            $stmt->execute([$repaymentId]);
            $repayment = $stmt->fetch();
            if ($repayment === false) { $this->db->rollBack(); Response::error('Loan repayment not found.', 404); }
            if ($repayment['status'] !== 'pending' || $repayment['loan_status'] !== 'active') { $this->db->rollBack(); Response::error('Only pending repayments for active loans can be approved.', 422); }
            $newRepaid = (int) $repayment['amount_repaid_kobo'] + (int) $repayment['amount_kobo'];
            if ($newRepaid > (int) $repayment['total_repayable_kobo']) { $this->db->rollBack(); Response::error('Repayment exceeds the remaining loan balance.', 422); }
            $this->db->prepare('UPDATE loan_repayments SET status = "approved", reviewed_by_admin_id = ?, reviewed_at = NOW() WHERE id = ?')->execute([(int) $admin['id'], $repaymentId]);
            $loanStatus = $newRepaid >= (int) $repayment['total_repayable_kobo'] ? 'repaid' : 'active';
            $this->db->prepare('UPDATE loans SET amount_repaid_kobo = ?, status = ? WHERE id = ?')->execute([$newRepaid, $loanStatus, (int) $repayment['loan_id']]);
            $wallet = $this->getOrCreateWallet((int) $repayment['user_id']);
            $reference = 'loan_repayment_' . $repaymentId . '_' . bin2hex(random_bytes(6));
            $this->db->prepare('INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at) VALUES (?, ?, "loan_repayment", 0, "completed", ?, ?, NOW(), NOW())')->execute([(int) $repayment['user_id'], (int) $wallet['id'], $reference, json_encode(['loan_id' => (int) $repayment['loan_id'], 'repayment_id' => $repaymentId, 'amount_repaid_kobo' => (int) $repayment['amount_kobo'], 'wallet_impact_kobo' => 0], JSON_THROW_ON_ERROR)]);
            $this->logAudit((int) $admin['id'], 'loan.repayment.approve', 'loan_repayment', $repaymentId, ['loan_id' => (int) $repayment['loan_id'], 'amount_repaid_kobo' => (int) $repayment['amount_kobo'], 'loan_status' => $loanStatus]);
            $this->db->commit();
        } catch (\Throwable $throwable) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $throwable;
        }
        Response::success(['approved' => true, 'loanStatus' => $loanStatus, 'amountRepaidKobo' => (int) $repayment['amount_kobo']]);
    }

    public function rejectLoanRepayment(Request $request, array $params = []): void
    {
        $admin = $this->requireAdmin($request);
        $repaymentId = (int) ($params['id'] ?? 0);
        $reason = trim((string) ($request->json()['reason'] ?? ''));
        if ($reason === '') Response::error('Rejection reason is required.', 422);
        $stmt = $this->db->prepare('UPDATE loan_repayments SET status = "rejected", rejection_reason = ?, reviewed_by_admin_id = ?, reviewed_at = NOW() WHERE id = ? AND status = "pending"');
        $stmt->execute([$reason, (int) $admin['id'], $repaymentId]);
        if ($stmt->rowCount() === 0) Response::error('Pending loan repayment not found.', 404);
        $this->logAudit((int) $admin['id'], 'loan.repayment.reject', 'loan_repayment', $repaymentId, ['reason' => $reason]);
        Response::success(['rejected' => true]);
    }

    public function loanRepaymentReceipt(Request $request, array $params = []): void
    {
        $this->requireAdmin($request);
        $stmt = $this->db->prepare('SELECT file_path FROM loan_repayments WHERE id = ? LIMIT 1');
        $stmt->execute([(int) ($params['id'] ?? 0)]);
        $row = $stmt->fetch();
        if ($row === false) Response::error('Loan repayment receipt not found.', 404);
        $this->streamLoanDocument((string) $row['file_path']);
    }

    private function streamLoanDocument(string $fileName): void
    {
        $safeName = basename($fileName);
        $path = dirname(__DIR__, 2) . '/storage/loan-documents/' . $safeName;
        if (!is_file($path)) Response::error('Loan document file is unavailable.', 404);
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($path) ?: 'application/octet-stream';
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($path));
        readfile($path);
        exit;
    }

    public function listTasks(Request $request): void
    {
        $admin = $this->requireAdmin($request);

        $stmt = $this->db->prepare('SELECT * FROM tasks ORDER BY id ASC');
        $stmt->execute();
        $tasks = $stmt->fetchAll();

        Response::success(['tasks' => $tasks]);
    }

    public function createTask(Request $request): void
    {
        $admin = $this->requireAdmin($request);
        $payload = $request->json();

        $title = trim((string) ($payload['title'] ?? ''));
        $description = trim((string) ($payload['description'] ?? ''));
        $rewardNaira = (int) ($payload['rewardNaira'] ?? 0);

        if ($title === '' || $rewardNaira <= 0) {
            Response::error('Title and reward amount are required.', 422);
        }

        $rewardKobo = $rewardNaira * 100;
        $this->db->prepare(
            'INSERT INTO tasks (title, description, reward_kobo, is_active, created_at)
             VALUES (?, ?, ?, 1, NOW())'
        )->execute([$title, $description, $rewardKobo]);

        $taskId = (int) $this->db->lastInsertId();

        $this->logAudit((int) $admin['id'], 'task.create', 'task', $taskId, ['title' => $title, 'reward_kobo' => $rewardKobo]);

        Response::success(['taskId' => $taskId, 'task' => compact('title', 'description', 'rewardNaira')], 201);
    }

    public function updateTask(Request $request, array $params = []): void
    {
        $admin = $this->requireAdmin($request);
        $taskId = (int) ($params['id'] ?? 0);
        $payload = $request->json();

        if ($taskId <= 0) {
            Response::error('Task not found.', 404);
        }

        $title = trim((string) ($payload['title'] ?? ''));
        $description = trim((string) ($payload['description'] ?? ''));
        $rewardNaira = (int) ($payload['rewardNaira'] ?? 0);
        $isActive = (int) ($payload['isActive'] ?? 1);

        if ($title === '' || $rewardNaira <= 0) {
            Response::error('Title and reward amount are required.', 422);
        }

        $rewardKobo = $rewardNaira * 100;
        $this->db->prepare(
            'UPDATE tasks SET title = ?, description = ?, reward_kobo = ?, is_active = ? WHERE id = ?'
        )->execute([$title, $description, $rewardKobo, $isActive, $taskId]);

        $this->logAudit((int) $admin['id'], 'task.update', 'task', $taskId, ['title' => $title, 'reward_kobo' => $rewardKobo]);

        Response::success(['updated' => true]);
    }

    public function deleteTask(Request $request, array $params = []): void
    {
        $admin = $this->requireAdmin($request);
        $taskId = (int) ($params['id'] ?? 0);

        if ($taskId <= 0) {
            Response::error('Task not found.', 404);
        }

        $this->db->prepare('UPDATE tasks SET is_active = 0 WHERE id = ?')->execute([$taskId]);

        $this->logAudit((int) $admin['id'], 'task.deactivate', 'task', $taskId, []);

        Response::success(['deleted' => true]);
    }

    public function listAchievements(Request $request): void
    {
        $admin = $this->requireAdmin($request);

        $stmt = $this->db->prepare('SELECT * FROM achievements ORDER BY id ASC');
        $stmt->execute();
        $achievements = $stmt->fetchAll();

        Response::success(['achievements' => $achievements]);
    }

    public function createAchievement(Request $request): void
    {
        $admin = $this->requireAdmin($request);
        $payload = $request->json();

        $code = trim((string) ($payload['code'] ?? ''));
        $title = trim((string) ($payload['title'] ?? ''));
        $description = trim((string) ($payload['description'] ?? ''));
        $icon = trim((string) ($payload['icon'] ?? ''));
        $targetCount = max(1, (int) ($payload['targetCount'] ?? 1));
        $progressKey = trim((string) ($payload['progressKey'] ?? 'referrals_active'));

        if ($code === '' || $title === '') {
            Response::error('Code and title are required.', 422);
        }

        $this->db->prepare(
            'INSERT INTO achievements (code, title, description, icon, target_count, progress_key)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([$code, $title, $description, $icon, $targetCount, $progressKey]);

        $achievementId = (int) $this->db->lastInsertId();

        $this->logAudit((int) $admin['id'], 'achievement.create', 'achievement', $achievementId, ['code' => $code, 'title' => $title]);

        Response::success(['achievementId' => $achievementId], 201);
    }

    private function requireAdmin(Request $request): array
    {
        $token = $request->bearerToken();
        if ($token === null || trim($token) === '') {
            Response::error('Authorization token is required.', 401);
        }

        $session = $this->sessions->findByTokenHash(TokenService::hashToken($token));
        if ($session === null) {
            Response::error('Session not found or expired.', 401);
        }

        $admin = $this->admins->findById((int) $session['admin_id']);
        if ($admin === null) {
            Response::error('Admin not found.', 404);
        }

        return $admin;
    }

    private function logAudit(int $adminId, string $action, string $targetType, int $targetId, array $meta = []): void
    {
        $this->db->prepare(
            'INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, meta, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())'
        )->execute([
            $adminId,
            $action,
            $targetType,
            $targetId,
            json_encode($meta, JSON_THROW_ON_ERROR),
        ]);
    }

    private function applyApprovedReferralTier(int $userId, string $tier): void
    {
        $rates = ['Silver' => 2500000, 'Gold' => 3000000, 'Platinum' => 3500000, 'Diamond' => 4000000];
        if (!isset($rates[$tier])) {
            throw new \RuntimeException('Invalid referral upgrade tier.');
        }

        $this->db->prepare('UPDATE users SET referral_tier = ?, referral_rate_kobo = ?, updated_at = NOW() WHERE id = ?')
            ->execute([strtoupper($tier), $rates[$tier], $userId]);
    }

    private function sendPush(int $userId, string $title, string $body, string $url): void
    {
        try {
            $this->notifications->sendToUser($userId, $title, $body, $url);
        } catch (\Throwable $throwable) {
            error_log('Push notification failed: ' . $throwable->getMessage());
        }
    }

    private function getOrCreateWallet(int $userId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM wallets WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();

        if ($row === false) {
            $this->db->prepare('INSERT INTO wallets (user_id, balance_kobo, currency, created_at, updated_at) VALUES (?, 0, "NGN", NOW(), NOW())')->execute([$userId]);
            $stmt = $this->db->prepare('SELECT * FROM wallets WHERE user_id = ? LIMIT 1');
            $stmt->execute([$userId]);
            $row = $stmt->fetch();
        }

        return $row ?: ['id' => 0, 'balance_kobo' => 0];
    }

    private function getBalanceKobo(int $userId): int
    {
        $stmt = $this->db->prepare(
            'SELECT COALESCE(SUM(amount_kobo), 0) FROM transactions WHERE user_id = ? AND status = "completed"'
        );
        $stmt->execute([$userId]);

        return (int) $stmt->fetchColumn();
    }

    private function syncWalletBalance(int $userId): void
    {
        $wallet = $this->getOrCreateWallet($userId);
        $balance = $this->getBalanceKobo($userId);
        $this->db->prepare('UPDATE wallets SET balance_kobo = ?, updated_at = NOW() WHERE id = ?')->execute([$balance, (int) $wallet['id']]);
    }
}
