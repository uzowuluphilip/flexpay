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
        $bannedUsers = (int) $this->db->query('SELECT COUNT(*) FROM users WHERE status = "banned"')->fetchColumn();
        $platformBalance = (int) $this->db->query('SELECT COALESCE(SUM(balance_kobo), 0) FROM wallets')->fetchColumn();
        $pendingWithdrawals = (int) $this->db->query('SELECT COUNT(*) FROM withdrawal_requests WHERE status = "pending"')->fetchColumn();
        $approvedWithdrawals = (int) $this->db->query('SELECT COUNT(*) FROM withdrawal_requests WHERE status IN ("approved", "paid")')->fetchColumn();
        $rejectedWithdrawals = (int) $this->db->query('SELECT COUNT(*) FROM withdrawal_requests WHERE status = "rejected"')->fetchColumn();
        $totalPendingAmount = (int) $this->db->query('SELECT COALESCE(SUM(amount_kobo), 0) FROM withdrawal_requests WHERE status = "pending"')->fetchColumn();
        $todaySignups = (int) $this->db->query('SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURDATE()')->fetchColumn();
        $todayTaskCompletions = (int) $this->db->query('SELECT COUNT(*) FROM task_completions WHERE DATE(completed_at) = CURDATE()')->fetchColumn();

        Response::success([
            'totalUsers' => $totalUsers,
            'verifiedUsers' => $verifiedUsers,
            'bannedUsers' => $bannedUsers,
            'platformBalance' => $platformBalance / 100,
            'pendingWithdrawals' => $pendingWithdrawals,
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
        $limit = min(100, (int) ($request->query('limit') ?? 50));
        $offset = (int) ($request->query('offset') ?? 0);

        $query = 'SELECT id, full_name, email, status, email_verified_at, created_at FROM users';
        $params = [];

        if ($search !== '') {
            $query .= ' WHERE full_name LIKE ? OR email LIKE ?';
            $pattern = '%' . $search . '%';
            $params = [$pattern, $pattern];
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

    public function approveTopup(Request $request, array $params = []): void
    {
        $admin = $this->requireAdmin($request);
        $receiptId = (int) ($params['id'] ?? 0);
        $stmt = $this->db->prepare('SELECT tr.*, t.amount_kobo, t.wallet_id, t.reference FROM topup_receipts tr JOIN transactions t ON t.id = tr.transaction_id WHERE tr.id = ? LIMIT 1');
        $stmt->execute([$receiptId]);
        $receipt = $stmt->fetch();
        if ($receipt === false) {
            Response::error('Top-up receipt not found.', 404);
        }
        if ($receipt['status'] !== 'pending') {
            Response::success(['alreadyProcessed' => true, 'status' => $receipt['status']]);
        }
        $claimedKobo = (int) $receipt['amount_kobo'];
        $feeKobo = (int) round($claimedKobo * 0.02);
        $creditKobo = $claimedKobo - $feeKobo;
        $this->db->beginTransaction();
        try {
            $this->db->prepare('UPDATE transactions SET amount_kobo = ?, status = "completed", meta = JSON_SET(COALESCE(meta, JSON_OBJECT()), "$.claimed_amount_kobo", ?, "$.fee_kobo", ?, "$.credited_amount_kobo", ?) WHERE id = ? AND status = "pending"')->execute([$creditKobo, $claimedKobo, $feeKobo, $creditKobo, (int) $receipt['transaction_id']]);
            $this->db->prepare('UPDATE topup_receipts SET status = "approved", reviewed_by_admin_id = ?, reviewed_at = NOW() WHERE id = ? AND status = "pending"')->execute([(int) $admin['id'], $receiptId]);
            $this->db->prepare('INSERT INTO activity_feed (user_id, type, description, amount_kobo, created_at) VALUES (?, "top_up", ?, ?, NOW())')->execute([(int) $receipt['user_id'], 'Top-up approved after receipt review', $creditKobo]);
            $this->syncWalletBalance((int) $receipt['user_id']);
            $this->logAudit((int) $admin['id'], 'topup.approve', 'topup_receipt', $receiptId, ['claimed_amount_kobo' => $claimedKobo, 'fee_kobo' => $feeKobo, 'credited_amount_kobo' => $creditKobo]);
            $this->db->commit();
        } catch (\Throwable $throwable) {
            $this->db->rollBack();
            throw $throwable;
        }
        $this->sendPush((int) $receipt['user_id'], 'Top-up confirmed!', '₦' . number_format($creditKobo / 100, 2) . ' has been added to your wallet.', '/top-up');
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
        $stmt = $this->db->prepare('SELECT file_path FROM topup_receipts WHERE id = ? LIMIT 1');
        $stmt->execute([(int) ($params['id'] ?? 0)]);
        $fileName = $stmt->fetchColumn();
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
