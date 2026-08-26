<?php

declare(strict_types=1);

namespace FlexPay\Controllers;

use FlexPay\Config\Database;
use FlexPay\Http\Request;
use FlexPay\Http\Response;
use FlexPay\Repositories\SessionRepository;
use FlexPay\Repositories\UserRepository;
use FlexPay\Services\TokenService;
use PDO;

final class TasksController
{
    private PDO $db;
    private UserRepository $users;
    private SessionRepository $sessions;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
        $this->users = new UserRepository();
        $this->sessions = new SessionRepository();
    }

    public function index(Request $request): void
    {
        $user = $this->requireUser($request);
        $rows = $this->db->query('SELECT * FROM tasks WHERE is_active = 1 ORDER BY id ASC')->fetchAll();

        if ($rows === []) {
            $this->seedTasks();
            $rows = $this->db->query('SELECT * FROM tasks WHERE is_active = 1 ORDER BY id ASC')->fetchAll();
        }

        $list = [];
        foreach ($rows as $task) {
            $taskId = (int) $task['id'];
            $list[] = [
                'id' => $taskId,
                'title' => $task['title'],
                'description' => $task['description'],
                'rewardAmount' => (int) $task['reward_kobo'] / 100,
                'url' => '#',
                'completed' => $this->hasCompletedTask((int) $user['id'], $taskId),
            ];
        }

        Response::success(['tasks' => $list]);
    }

    public function verifyTask(Request $request, array $params = []): void
    {
        $user = $this->requireUser($request);
        $taskId = (int) ($params['id'] ?? 0);

        if ($taskId <= 0) {
            Response::error('Task not found.', 404);
        }

        $stmt = $this->db->prepare('SELECT * FROM tasks WHERE id = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([$taskId]);
        $task = $stmt->fetch();

        if ($task === false) {
            Response::error('Task not found.', 404);
        }

        if ($this->hasCompletedTask((int) $user['id'], $taskId)) {
            Response::success(['verified' => true, 'already_completed' => true]);
        }

        $wallet = $this->getWalletRow((int) $user['id']);
        $rewardKobo = (int) $task['reward_kobo'];

        $this->db->prepare(
            'INSERT INTO task_completions (user_id, task_id, reward_kobo, completed_at)
             VALUES (?, ?, ?, NOW())'
        )->execute([(int) $user['id'], $taskId, $rewardKobo]);

        $referralRepo = new \FlexPay\Repositories\ReferralRepository();
        $referralRepo->activateReferralForFirstRealAction((int) $user['id'], (string) $user['full_name']);

        $reference = 'task_' . $taskId . '_' . $user['id'] . '_' . time();
        $this->db->prepare(
            'INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at)
             VALUES (?, ?, "task_reward", ?, "completed", ?, ?, NOW(), NOW())'
        )->execute([
            (int) $user['id'],
            (int) $wallet['id'],
            $rewardKobo,
            $reference,
            json_encode(['task_id' => $taskId], JSON_THROW_ON_ERROR),
        ]);

        $this->db->prepare(
            'INSERT INTO activity_feed (user_id, type, description, amount_kobo, created_at)
             VALUES (?, ?, ?, ?, NOW())'
        )->execute([(int) $user['id'], 'task', 'Task reward earned: ' . $task['title'], $rewardKobo]);

        $this->syncWalletBalance((int) $user['id']);

        Response::success([
            'verified' => true,
            'taskId' => $taskId,
            'rewardAmount' => $rewardKobo / 100,
        ]);
    }

    private function requireUser(Request $request): array
    {
        $token = $request->bearerToken();
        if ($token === null || trim($token) === '') {
            Response::error('Authorization token is required.', 401);
        }

        $session = $this->sessions->findByTokenHash(TokenService::hashToken($token));
        if ($session === null) {
            Response::error('Session not found or expired.', 401);
        }

        $user = $this->users->findById((int) $session['user_id']);
        if ($user === null) {
            Response::error('User not found.', 404);
        }

        return $user;
    }

    private function hasCompletedTask(int $userId, int $taskId): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM task_completions WHERE user_id = ? AND task_id = ? LIMIT 1');
        $stmt->execute([$userId, $taskId]);

        return $stmt->fetchColumn() !== false;
    }

    private function hasCompletedAnyRealAction(int $userId): bool
    {
        $checkInStmt = $this->db->prepare('SELECT 1 FROM check_ins WHERE user_id = ? LIMIT 1');
        $checkInStmt->execute([$userId]);
        if ($checkInStmt->fetchColumn() !== false) {
            return true;
        }

        $taskStmt = $this->db->prepare('SELECT 1 FROM task_completions WHERE user_id = ? LIMIT 1');
        $taskStmt->execute([$userId]);

        return $taskStmt->fetchColumn() !== false;
    }

    private function getWalletRow(int $userId): array
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

    private function syncWalletBalance(int $userId): void
    {
        $row = $this->getWalletRow($userId);
        $stmt = $this->db->prepare('SELECT COALESCE(SUM(amount_kobo), 0) FROM transactions WHERE user_id = ? AND status IN ("completed", "pending")');
        $stmt->execute([$userId]);
        $balance = (int) $stmt->fetchColumn();

        $this->db->prepare('UPDATE wallets SET balance_kobo = ?, updated_at = NOW() WHERE id = ?')->execute([$balance, (int) $row['id']]);
    }

    private function seedTasks(): void
    {
        $seed = [
            ['Join Telegram Channel', 'Join the official FlexPay Telegram channel for announcements and rewards.', 5000],
            ['Join Telegram Channel 2', 'Join the second FlexPay Telegram channel to stay connected with our community.', 5000],
            ['Complete Profile', 'Upload your profile photo and complete your FlexPay account profile.', 2000],
            ['Make First Referral', 'Invite your first friend to FlexPay and earn your referral bonus.', 10000],
            ['Daily Check-in', 'Login daily with FlexPay to earn your bonus check-in reward.', 1000],
            ['Follow on Instagram', 'Follow FlexPay on Instagram to keep up with new offers and updates.', 3000],
            ['Follow on X (Twitter)', 'Follow FlexPay on X to get the latest announcements and promotions.', 3000],
            ['Like Facebook Page', 'Like the official FlexPay Facebook page for news and rewards.', 3000],
            ['Follow on TikTok', 'Follow FlexPay on TikTok for fun videos and reward updates.', 3000],
            ['Share on Telegram', 'Share FlexPay with your Telegram contacts to grow the community.', 2000],
            ['Share Instagram Story', 'Post about FlexPay on your Instagram story to invite friends.', 2000],
            ['Watch YouTube Video', 'Watch and like the latest FlexPay video on YouTube.', 2500],
            ['Subscribe on YouTube', 'Subscribe to the FlexPay YouTube channel for video updates.', 3000],
            ['Join Telegram Group', 'Join the FlexPay Telegram discussion group to meet other members.', 2000],
            ['Follow Telegram Bot', 'Follow the official FlexPay Telegram bot for updates and support.', 3000],
            ['Repost on X', 'Repost the pinned FlexPay tweet on X to share our message.', 2000],
            ['Comment on Facebook Post', 'Leave a positive comment on the latest FlexPay Facebook post.', 1500],
            ['Invite 3 Friends Today', 'Share your FlexPay referral link with at least three friends today.', 5000],
            ['Rate Our App', 'Leave a five-star review for FlexPay to help more people discover us.', 2000],
            ['Join Telegram Community', 'Join the FlexPay Telegram community group for support and updates.', 2000],
            ['Follow on Threads', 'Follow FlexPay on Threads to stay up to date with announcements.', 2500],
        ];

        foreach ($seed as $index => [$title, $description, $rewardKobo]) {
            $this->db->prepare(
                'INSERT INTO tasks (title, description, reward_kobo, is_active, created_at)
                 VALUES (?, ?, ?, 1, NOW())
                 ON DUPLICATE KEY UPDATE title = VALUES(title)'
            )->execute([$title, $description, (int) $rewardKobo * 100,]);
        }
    }
}
