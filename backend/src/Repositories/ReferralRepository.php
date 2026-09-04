<?php

declare(strict_types=1);

namespace FlexPay\Repositories;

use FlexPay\Config\Database;
use FlexPay\Services\NotificationService;
use PDO;

final class ReferralRepository
{
    private PDO $db;
    private NotificationService $notifications;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
        $this->notifications = new NotificationService();
    }

    public function recordPendingReferral(int $referrerUserId, int $referredUserId): void
    {
        $stmt = $this->db->prepare('INSERT INTO referrals (referrer_user_id, referred_user_id, status, bonus_amount_kobo, created_at) VALUES (?, ?, "pending", 0, NOW())');
        $stmt->execute([$referrerUserId, $referredUserId]);
    }

    public function findPendingByReferredUser(int $referredUserId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM referrals WHERE referred_user_id = ? AND status = "pending" LIMIT 1');
        $stmt->execute([$referredUserId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function hasUserCompletedAnyRealAction(int $userId): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM check_ins WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        if ($stmt->fetchColumn() !== false) return true;
        $stmt = $this->db->prepare('SELECT 1 FROM task_completions WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        return $stmt->fetchColumn() !== false;
    }

    public function activateReferralForFirstRealAction(int $referredUserId, string $referredName): void
    {
        if (!$this->hasUserCompletedAnyRealAction($referredUserId)) return;
        $pendingReferral = $this->findPendingByReferredUser($referredUserId);
        if ($pendingReferral === null) return;

        $referrerUserId = (int) $pendingReferral['referrer_user_id'];
        $rateStmt = $this->db->prepare('SELECT referral_rate_kobo FROM users WHERE id = ? LIMIT 1');
        $rateStmt->execute([$referrerUserId]);
        $bonusKobo = max(0, (int) $rateStmt->fetchColumn());
        $walletStmt = $this->db->prepare('SELECT * FROM wallets WHERE user_id = ? LIMIT 1');
        $walletStmt->execute([$referrerUserId]);
        $wallet = $walletStmt->fetch() ?: ['id' => 0];

        $ownsTransaction = !$this->db->inTransaction();
        if ($ownsTransaction) $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('UPDATE referrals SET status = "active", bonus_amount_kobo = ? WHERE referred_user_id = ? AND status = "pending"');
            $stmt->execute([$bonusKobo, $referredUserId]);
            $reference = 'ref_' . $referrerUserId . '_' . $referredUserId . '_' . time();
            $this->db->prepare('INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at) VALUES (?, ?, "referral_bonus", ?, "completed", ?, ?, NOW(), NOW())')->execute([$referrerUserId, (int) $wallet['id'], $bonusKobo, $reference, json_encode(['referred_user_id' => $referredUserId, 'trigger' => 'first_real_action'], JSON_THROW_ON_ERROR)]);
            $this->db->prepare('INSERT INTO activity_feed (user_id, type, description, amount_kobo, created_at) VALUES (?, ?, ?, ?, NOW())')->execute([$referrerUserId, 'referral', 'Referral bonus: ' . $referredName . ' became active', $bonusKobo]);
            $milestones = $this->ensureMilestoneBonusesForUser($referrerUserId);
            if ($ownsTransaction) $this->db->commit();
        } catch (\Throwable $throwable) {
            if ($ownsTransaction && $this->db->inTransaction()) $this->db->rollBack();
            throw $throwable;
        }

        $this->sendPush($referrerUserId, 'Referral bonus earned', 'You earned ₦' . number_format($bonusKobo / 100) . ' - your referral just got active!', '/referrals');
        foreach ($milestones as $milestone) {
            $this->sendPush($referrerUserId, 'Milestone unlocked!', '₦' . number_format($milestone['reward_kobo'] / 100, 2) . ' bonus credited.', '/referrals');
        }
    }

    public function ensureMilestoneBonusesForUser(int $userId): array
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM referrals WHERE referrer_user_id = ? AND status = "active"');
        $stmt->execute([$userId]);
        $count = (int) $stmt->fetchColumn();
        $newMilestones = [];
        $rewards = [10 => 200000, 25 => 600000, 50 => 1500000, 100 => 3500000];

        foreach ($rewards as $milestone => $rewardKobo) {
            if ($count < $milestone) continue;
            $exists = $this->db->prepare('SELECT 1 FROM referral_milestone_claims WHERE user_id = ? AND milestone = ? LIMIT 1');
            $exists->execute([$userId, $milestone]);
            if ($exists->fetchColumn() !== false) continue;
            $walletStmt = $this->db->prepare('SELECT * FROM wallets WHERE user_id = ? LIMIT 1');
            $walletStmt->execute([$userId]);
            $wallet = $walletStmt->fetch();
            if ($wallet === false) continue;
            $reference = 'ref_milestone_' . $userId . '_' . $milestone . '_' . time();
            $this->db->prepare('INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at) VALUES (?, ?, "referral_bonus", ?, "completed", ?, ?, NOW(), NOW())')->execute([$userId, (int) $wallet['id'], $rewardKobo, $reference, json_encode(['milestone' => $milestone, 'reward_kobo' => $rewardKobo], JSON_THROW_ON_ERROR)]);
            $this->db->prepare('INSERT INTO referral_milestone_claims (user_id, milestone, reward_kobo, claimed_at) VALUES (?, ?, ?, NOW())')->execute([$userId, $milestone, $rewardKobo]);
            $this->db->prepare('INSERT INTO activity_feed (user_id, type, description, amount_kobo, created_at) VALUES (?, ?, ?, ?, NOW())')->execute([$userId, 'referral', 'Referral milestone: ' . $milestone . ' active referrals reached', $rewardKobo]);
            $newMilestones[] = ['milestone' => $milestone, 'reward_kobo' => $rewardKobo];
        }

        return $newMilestones;
    }

    public function activatePendingByReferredUser(int $referredUserId): void
    {
        $stmt = $this->db->prepare('UPDATE referrals SET status = "active" WHERE referred_user_id = ? AND status = "pending"');
        $stmt->execute([$referredUserId]);
    }

    private function sendPush(int $userId, string $title, string $body, string $url): void
    {
        try {
            $this->notifications->sendToUser($userId, $title, $body, $url);
        } catch (\Throwable $throwable) {
            error_log('Push notification failed: ' . $throwable->getMessage());
        }
    }
}
