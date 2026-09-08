<?php

declare(strict_types=1);

namespace FlexPay\Controllers;

use FlexPay\Config\Database;
use FlexPay\Http\Request;
use FlexPay\Http\Response;
use FlexPay\Repositories\SessionRepository;
use FlexPay\Repositories\UserRepository;
use FlexPay\Services\TokenService;
use FlexPay\Services\NotificationService;
use PDO;

final class WalletController
{
    private PDO $db;
    private UserRepository $users;
    private SessionRepository $sessions;
    private NotificationService $notifications;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
        $this->users = new UserRepository();
        $this->sessions = new SessionRepository();
        $this->notifications = new NotificationService();
    }

    public function summary(Request $request): void
    {
        $user = $this->requireUser($request);
        $userId = (int) $user['id'];
        $this->releaseExpiredLocksForUser($userId);
        $balanceKobo = $this->getBalanceKobo($userId);
        $activeReferrals = $this->countActiveReferrals($userId);

        Response::success([
            'balance' => $balanceKobo / 100,
            'referralsActive' => $activeReferrals,
            'perReferral' => ((int) $user['referral_rate_kobo']) / 100,
            'referralTier' => (string) ($user['referral_tier'] ?? 'STARTER'),
            'verified' => !empty($user['email_verified_at']),
        ]);
    }

    public function withdrawProgress(Request $request): void
    {
        $user = $this->requireUser($request);
        $userId = (int) $user['id'];
        $taskStmt = $this->db->prepare('SELECT COUNT(*) FROM task_completions WHERE user_id = ?');
        $taskStmt->execute([$userId]);
        $claimsStmt = $this->db->prepare('SELECT COALESCE(SUM(claims_count), 0) FROM daily_claims WHERE user_id = ?');
        $claimsStmt->execute([$userId]);

        Response::success([
            'balance' => $this->getBalanceKobo($userId) / 100,
            'referrals' => $this->countActiveReferrals($userId),
            'tasks' => (int) $taskStmt->fetchColumn(),
            'claims' => (int) $claimsStmt->fetchColumn(),
        ]);
    }

    public function playSpin(Request $request): void
    {
        $user = $this->requireUser($request);
        $userId = (int) $user['id'];
        $payload = $request->json();
        $stakeNaira = (int) ($payload['stake'] ?? 0);
        if ($stakeNaira < 10000 || $stakeNaira > 500000) {
            Response::error('Spin stake must be between ₦10,000 and ₦500,000.', 422, 'invalid_spin_stake');
        }

        $stakeKobo = $stakeNaira * 100;
        $availableKobo = $this->getBalanceKobo($userId);
        if ($stakeKobo > $availableKobo) {
            Response::error('Insufficient funds for this spin stake.', 422, 'insufficient_balance');
        }

        $roll = random_int(1, 100);
        if ($roll <= 5) {
            $outcome = 'win';
            $transactionType = 'spin_win';
            $resultKobo = $stakeKobo * 2;
            $message = 'You landed on: Win — your stake was doubled.';
        } elseif ($roll <= 40) {
            $outcome = 'lose';
            $transactionType = 'spin_loss';
            $resultKobo = -$stakeKobo;
            $message = 'You landed on: Lose — your stake was deducted.';
        } else {
            $outcome = 'try_again';
            $transactionType = 'spin_try';
            $resultKobo = 0;
            $message = 'You landed on: Try Again — no deduction.';
        }

        $wallet = $this->getWalletRow($userId);
        $this->db->beginTransaction();
        try {
            $reference = 'spin_' . $userId . '_' . time() . '_' . bin2hex(random_bytes(4));
            $this->db->prepare(
                'INSERT INTO spins (user_id, stake_kobo, result_kobo, outcome, spun_at)
                 VALUES (?, ?, ?, ?, NOW())'
            )->execute([$userId, $stakeKobo, $resultKobo, $outcome]);
            $spinId = (int) $this->db->lastInsertId();

            $this->db->prepare(
                'INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at)
                 VALUES (?, ?, ?, ?, "completed", ?, ?, NOW(), NOW())'
            )->execute([
                $userId,
                (int) $wallet['id'],
                $transactionType,
                $resultKobo,
                $reference,
                json_encode(['spin_id' => $spinId, 'stake_kobo' => $stakeKobo, 'outcome' => $outcome], JSON_THROW_ON_ERROR),
            ]);

            $this->db->prepare(
                'INSERT INTO activity_feed (user_id, type, description, amount_kobo, created_at)
                 VALUES (?, "spin", ?, ?, NOW())'
            )->execute([$userId, 'Spin result: ' . $outcome, $resultKobo]);
            $this->db->commit();
        } catch (\Throwable $throwable) {
            $this->db->rollBack();
            throw $throwable;
        }

        $this->syncWalletBalance($userId);
        Response::success([
            'outcome' => $outcome,
            'resultKobo' => $resultKobo,
            'message' => $message,
            'spinId' => $spinId,
            'balance' => $this->getBalanceKobo($userId) / 100,
        ]);
    }

    public function spinStats(Request $request): void
    {
        $user = $this->requireUser($request);
        $stmt = $this->db->prepare(
                'SELECT COUNT(*) AS spins,
                    SUM(CASE WHEN outcome = "win" THEN 1 ELSE 0 END) AS wins,
                    SUM(CASE WHEN outcome = "lose" THEN 1 ELSE 0 END) AS losses,
                    SUM(CASE WHEN outcome = "try_again" THEN 1 ELSE 0 END) AS try_again
                 FROM spins WHERE user_id = ?'
        );
        $stmt->execute([(int) $user['id']]);
        $stats = $stmt->fetch() ?: [];
        $spins = (int) ($stats['spins'] ?? 0);
        $wins = (int) ($stats['wins'] ?? 0);

        Response::success([
            'spins' => $spins,
            'wins' => $wins,
            'losses' => (int) ($stats['losses'] ?? 0),
            'tryAgain' => (int) ($stats['try_again'] ?? 0),
            'winRate' => $spins > 0 ? round(($wins / $spins) * 100, 1) : 0,
        ]);
    }

    public function exchangeRate(Request $request): void
    {
        $cacheFile = dirname(__DIR__, 2) . '/cache/exchange-rate.json';
        $cacheDir = dirname($cacheFile);
        if (!is_dir($cacheDir)) {
            @mkdir($cacheDir, 0777, true);
        }

        $rate = null;
        if (is_file($cacheFile)) {
            $cached = @json_decode((string) file_get_contents($cacheFile), true);
            if (is_array($cached) && isset($cached['rate']) && (float) $cached['rate'] > 0) {
                $rate = (float) $cached['rate'];
            }
        }

        $source = 'cache';
        $response = @file_get_contents('https://open.er-api.com/v6/latest/USD', false, stream_context_create([
            'http' => [
                'timeout' => 5,
                'ignore_errors' => true,
            ],
        ]));

        if ($response !== false) {
            $payload = json_decode($response, true);
            $nextRate = (float) ($payload['rates']['NGN'] ?? 0);
            if ($nextRate > 0) {
                $rate = $nextRate;
                $source = 'open.er-api.com';
                @file_put_contents($cacheFile, json_encode([
                    'rate' => $rate,
                    'fetched_at' => gmdate('c'),
                ], JSON_PRETTY_PRINT));
            }
        }

        if ($rate === null || $rate <= 0) {
            $rate = 1359.0;
        }

        Response::success([
            'rate' => round($rate, 2),
            'currency' => 'NGN',
            'source' => $source,
            'cached' => $source === 'cache',
        ]);
    }

    public function checkinStatus(Request $request): void
    {
        $user = $this->requireUser($request);
        $userId = (int) $user['id'];
        $day = $this->getCurrentCheckInDay($userId);
        $checkedInToday = $this->hasCheckedInToday($userId);
        $claimStatement = $this->db->prepare('SELECT claims_count FROM daily_claims WHERE user_id = ? AND claim_date = CURDATE() LIMIT 1');
        $claimStatement->execute([$userId]);
        $claimsToday = (int) ($claimStatement->fetchColumn() ?: 0);

        Response::success([
            'currentDay' => $day,
            'maxDay' => 7,
            'unlockedDays' => array_map(static fn (int $v): int => $v, range(1, min(7, $day))),
            'checkedInToday' => $checkedInToday,
            'maxClaims' => 1,
            'claimsToday' => $claimsToday,
            'claimsRemaining' => max(0, 1 - $claimsToday),
        ]);
    }

    public function checkin(Request $request): void
    {
        $user = $this->requireUser($request);
        $userId = (int) $user['id'];

        if ($this->hasCheckedInToday($userId)) {
            $day = $this->getCurrentCheckInDay($userId);
            Response::success([
                'currentDay' => $day,
                'unlockedDays' => array_map(static fn (int $v): int => $v, range(1, min(7, $day))),
                'checkedInToday' => true,
            ]);
        }

        $lastCheckIn = $this->latestCheckIn($userId);
        $day = 1;
        if ($lastCheckIn !== null) {
            $lastDate = new \DateTimeImmutable($lastCheckIn['check_in_date']);
            $today = new \DateTimeImmutable((string) $this->db->query('SELECT CURDATE()')->fetchColumn());
            $diff = (int) $lastDate->diff($today)->days;
            if ($diff === 1) {
                $day = min(7, (int) $lastCheckIn['streak_day'] + 1);
            } elseif ($diff > 1) {
                $day = 1;
            }
        }

        $rewardSchedule = [500, 500, 500, 500, 500, 500, 500];
        $rewardNaira = $rewardSchedule[max(0, $day - 1)] ?? 500;
        $rewardKobo = (int) ($rewardNaira * 100);

        $wallet = $this->getWalletRow($userId);
        $this->db->prepare(
            'INSERT INTO check_ins (user_id, check_in_date, streak_day, reward_kobo, created_at)
             VALUES (?, CURDATE(), ?, ?, NOW())'
        )->execute([$userId, $day, $rewardKobo]);

        $this->recordTransaction(
            $userId,
            (int) $wallet['id'],
            'check_in_bonus',
            $rewardKobo,
            'checkin_' . $userId . '_' . date('YmdHis'),
            ['streak_day' => $day]
        );

        $this->db->prepare(
            'INSERT INTO activity_feed (user_id, type, description, amount_kobo, created_at)
             VALUES (?, ?, ?, ?, NOW())'
        )->execute([$userId, 'check_in', 'Daily check-in reward', $rewardKobo]);

        $this->syncWalletBalance($userId);

        $referralRepo = new \FlexPay\Repositories\ReferralRepository();
        $referralRepo->activateReferralForFirstRealAction((int) $user['id'], (string) $user['full_name']);

        Response::success([
            'currentDay' => $day,
            'unlockedDays' => array_map(static fn (int $v): int => $v, range(1, min(7, $day))),
            'checkedInToday' => true,
        ]);
    }

    public function claimReward(Request $request): void
    {
        $user = $this->requireUser($request);
        $userId = (int) $user['id'];

        $claimRow = $this->db->prepare('SELECT * FROM daily_claims WHERE user_id = ? AND claim_date = CURDATE() LIMIT 1');
        $claimRow->execute([$userId]);
        $claim = $claimRow->fetch();
        $claimsCount = (int) ($claim['claims_count'] ?? 0);

        if ($claimsCount >= 1) {
            Response::error('Daily claim limit reached.', 400, 'claim_limit_reached');
        }

        $newClaims = $claimsCount + 1;
        $rewardKobo = 400000;
        $wallet = $this->getWalletRow($userId);

        if ($claim !== false) {
            $this->db->prepare('UPDATE daily_claims SET claims_count = ?, updated_at = NOW() WHERE id = ?')->execute([$newClaims, (int) $claim['id']]);
        } else {
            $this->db->prepare(
                'INSERT INTO daily_claims (user_id, claim_date, claims_count, claims_limit, updated_at)
                 VALUES (?, CURDATE(), ?, 1, NOW())'
            )->execute([$userId, $newClaims]);
        }

        $this->recordTransaction(
            $userId,
            (int) $wallet['id'],
            'task_reward',
            $rewardKobo,
            'claim_' . $userId . '_' . date('YmdHis'),
            ['mechanic' => 'daily_claim', 'claim_number' => $newClaims]
        );

        $this->db->prepare(
            'INSERT INTO activity_feed (user_id, type, description, amount_kobo, created_at)
             VALUES (?, ?, ?, ?, NOW())'
        )->execute([$userId, 'task', 'Daily micro-claim reward', $rewardKobo]);

        $this->syncWalletBalance($userId);

        Response::success([
            'claimsToday' => $newClaims,
            'claimsRemaining' => max(0, 1 - $newClaims),
            'rewardAmount' => $rewardKobo / 100,
        ]);
    }

    public function achievements(Request $request): void
    {
        $user = $this->requireUser($request);
        $rows = $this->db->query('SELECT * FROM achievements ORDER BY id ASC')->fetchAll();

        if ($rows === []) {
            $this->seedAchievements();
            $rows = $this->db->query('SELECT * FROM achievements ORDER BY id ASC')->fetchAll();
        }

        $list = [];
        foreach ($rows as $row) {
            $achievementId = (int) $row['id'];
            $progress = $this->getAchievementProgress((int) $user['id'], (string) $row['progress_key']);
            $target = (int) $row['target_count'];
            $unlocked = $this->isAchievementUnlocked($achievementId, (int) $user['id']);

            if (!$unlocked && $progress >= $target) {
                $insert = $this->db->prepare(
                    'INSERT IGNORE INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, NOW())'
                );
                $insert->execute([(int) $user['id'], $achievementId]);
                if ($insert->rowCount() === 1) {
                    $this->db->prepare(
                        'INSERT INTO activity_feed (user_id, type, description, amount_kobo, created_at)
                         VALUES (?, "achievement", ?, 0, NOW())'
                    )->execute([(int) $user['id'], 'Achievement unlocked: ' . $row['title']]);
                    $this->sendPush((int) $user['id'], 'Achievement unlocked', (string) $row['title'] . '!', '/achievements');
                }
                $unlocked = true;
            }

            $list[] = [
                'id' => $achievementId,
                'code' => $row['code'],
                'title' => $row['title'],
                'description' => $row['description'],
                'icon' => $row['icon'],
                'current' => min($progress, $target),
                'target' => $target,
                'progress' => $progress,
                'unlocked' => $unlocked,
            ];
        }

        $unlockedCount = count(array_filter($list, static fn (array $item): bool => (bool) $item['unlocked']));

        Response::success([
            'unlocked' => $unlockedCount,
            'total' => count($list),
            'list' => $list,
        ]);
    }

    public function activity(Request $request): void
    {
        $user = $this->requireUser($request);
        $stmt = $this->db->prepare(
            'SELECT t.id, t.type, t.amount_kobo, t.status, t.reference, t.created_at,
                    COALESCE(wr.status, tr.status, t.status) AS review_status
             FROM transactions t
             LEFT JOIN withdrawal_requests wr ON wr.transaction_id = t.id
             LEFT JOIN topup_receipts tr ON tr.transaction_id = t.id
             WHERE t.user_id = ?
             ORDER BY t.created_at DESC
             LIMIT 50'
        );
        $stmt->execute([(int) $user['id']]);
        $items = array_map(function (array $row): array {
            $amount = (int) $row['amount_kobo'];
            $titles = [
                'top_up' => 'Top-up request',
                'withdrawal' => 'Withdrawal request',
                'upgrade_fee' => 'Referral upgrade',
                'lock_hold' => 'Investment lock',
                'lock_release' => 'Investment unlock',
                'welcome_bonus' => 'Welcome bonus',
                'check_in_bonus' => 'Daily check-in',
                'task_reward' => 'Task reward',
                'referral_bonus' => 'Referral reward',
                'spin_win' => 'Spin reward',
                'spin_loss' => 'Spin result',
                'spin_try' => 'Spin result',
                'admin_adjustment' => 'Admin balance adjustment',
            ];
            $status = (string) ($row['review_status'] ?: $row['status']);
            $status = in_array($status, ['approved', 'paid'], true) ? 'completed' : ($status === 'failed' ? 'rejected' : $status);
            return [
                'id' => (int) $row['id'],
                'title' => $titles[$row['type']] ?? ucwords(str_replace('_', ' ', (string) $row['type'])),
                'description' => 'Reference: ' . $row['reference'],
                'amount' => abs($amount) / 100,
                'time' => date('d M, H:i', strtotime($row['created_at'])),
                'timestamp' => $row['created_at'],
                'type' => $row['type'],
                'credit' => $amount >= 0,
                'status' => $status,
            ];
        }, $stmt->fetchAll());

        Response::success(['items' => $items]);
    }

    public function referralInfo(Request $request): void
    {
        $user = $this->requireUser($request);
        $code = (string) $user['referral_code'];
        $envBaseUrl = getenv('FRONTEND_URL') ?: ($_ENV['FRONTEND_URL'] ?? 'https://flexpay-theta.vercel.app');
        $baseUrl = preg_replace('/^http:\/\/localhost(:\d+)?$/i', 'https://flexpay-theta.vercel.app', (string) $envBaseUrl);
        $baseUrl = preg_replace('/^http:\/\/127\.0\.0\.1(:\d+)?$/i', 'https://flexpay-theta.vercel.app', $baseUrl);
        $baseUrl = rtrim($baseUrl, '/');
        $link = $baseUrl . '/register?ref=' . urlencode($code);
        $referralCount = $this->countActiveReferrals((int) $user['id']);
        $milestones = [10, 25, 50, 100];
        $progress = [];
        foreach ($milestones as $milestone) {
            $progress[(string) $milestone] = min($referralCount, $milestone);
        }

        $message = "🚨🔥 STOP SCROLLING — THIS IS YOUR SIGN! 💸\n\n" .
            "💰 I'm cashing out HUGE on Flexpay and YOU'RE next!\n" .
            "🎁 Grab a FREE ₦60,000 welcome bonus the second you sign up\n" .
            "⚡ Earn ₦15,000 for EVERY friend you bring in\n" .
            "🏦 Withdraw straight to your bank — fast, real, no stress\n" .
            "🎯 Daily rewards, spins & bonuses waiting for you\n\n" .
            "🔗 Tap my link NOW: " . $link . "\n" .
            "🆔 Referral Code: " . $code . "\n\n" .
            "🚀 Don't watch others get rich — JOIN ME TODAY!";

        Response::success([
            'code' => $code,
            'link' => $link,
            'count' => $referralCount,
            'milestones' => $milestones,
            'progress' => $progress,
            'perReferral' => ((int) $user['referral_rate_kobo']) / 100,
            'referralTier' => (string) ($user['referral_tier'] ?? 'STARTER'),
            'message' => $message,
        ]);
    }

    public function lockFunds(Request $request): void
    {
        $user = $this->requireUser($request);
        $payload = $request->json();
        $amountNaira = (int) round((float) ($payload['amount'] ?? 0));
        $validTiers = [
            20000 => 100000,
            50000 => 250000,
            100000 => 500000,
            200000 => 1000000,
        ];

        if (!isset($validTiers[$amountNaira])) {
            Response::error('Please choose a supported lock amount.', 422, 'invalid_lock_amount');
        }

        $amountKobo = $amountNaira * 100;
        $bonusKobo = $validTiers[$amountNaira];
        $availableBalanceKobo = $this->getBalanceKobo((int) $user['id'])
            - $this->getPendingWithdrawalKobo((int) $user['id'])
            - $this->getPendingLockKobo((int) $user['id']);

        if ($amountKobo > $availableBalanceKobo) {
            Response::error('Insufficient funds for this lock.', 422, 'insufficient_balance');
        }

        $wallet = $this->getWalletRow((int) $user['id']);
        $this->db->beginTransaction();
        try {
            $reference = 'lock_' . $user['id'] . '_' . time() . '_' . bin2hex(random_bytes(4));
            $this->db->prepare(
                'INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at)
                 VALUES (?, ?, "lock_hold", ?, "pending", ?, ?, NOW(), NOW())'
            )->execute([
                (int) $user['id'],
                (int) $wallet['id'],
                -$amountKobo,
                $reference,
                json_encode(['lock_amount_kobo' => $amountKobo, 'bonus_kobo' => $bonusKobo], JSON_THROW_ON_ERROR),
            ]);

            $this->db->prepare(
                'INSERT INTO fund_locks (user_id, amount_kobo, bonus_kobo, locked_at, unlocks_at, status, released_at)
                 VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), "active", NULL)'
            )->execute([(int) $user['id'], $amountKobo, $bonusKobo]);

            $this->db->commit();
        } catch (\Throwable $throwable) {
            $this->db->rollBack();
            throw $throwable;
        }

        Response::success([
            'lock' => [
                'amount' => $amountNaira,
                'bonus' => $bonusKobo / 100,
                'status' => 'active',
                'unlocks_at' => date('Y-m-d H:i:s', strtotime('+30 days')),
            ],
        ]);
    }

    public function investLocks(Request $request): void
    {
        $user = $this->requireUser($request);
        $userId = (int) $user['id'];
        $this->releaseExpiredLocksForUser($userId);

        $stmt = $this->db->prepare('SELECT * FROM fund_locks WHERE user_id = ? ORDER BY locked_at DESC');
        $stmt->execute([$userId]);
        $locks = array_map(static function (array $lock): array {
            return [
                'id' => (int) $lock['id'],
                'user_id' => (int) $lock['user_id'],
                'amount_kobo' => (int) $lock['amount_kobo'],
                'bonus_kobo' => (int) $lock['bonus_kobo'],
                'amount' => (int) $lock['amount_kobo'] / 100,
                'bonus' => (int) $lock['bonus_kobo'] / 100,
                'locked_at' => $lock['locked_at'],
                'unlocks_at' => $lock['unlocks_at'],
                'status' => $lock['status'],
                'released_at' => $lock['released_at'],
            ];
        }, $stmt->fetchAll());

        Response::success(['locks' => $locks]);
    }

    public function withdraw(Request $request): void
    {
        $user = $this->requireUser($request);
        $payload = $request->json();

        $amount = (int) round((float) ($payload['amount'] ?? 0) * 100);
        $bankName = trim((string) ($payload['bank_name'] ?? ''));
        $accountNumber = trim((string) ($payload['account_number'] ?? ''));
        $accountName = trim((string) ($payload['account_name'] ?? ''));

        if ($amount <= 0) {
            Response::error('Please enter a valid withdrawal amount.', 422);
        }

        if ($bankName === '' || $accountNumber === '' || $accountName === '') {
            Response::error('Bank name, account number, and account name are required.', 422);
        }

        $userId = (int) $user['id'];
        $balanceKobo = $this->getBalanceKobo($userId);
        $availableBalanceKobo = $balanceKobo - $this->getPendingWithdrawalKobo($userId);

        if ($amount > $availableBalanceKobo) {
            $availableBalanceNaira = $availableBalanceKobo / 100;
            Response::error(
                'Insufficient funds. You can withdraw up to ₦' . number_format($availableBalanceNaira, 2, '.', ',') . ' from your current balance.',
                422,
                'insufficient_balance'
            );
        }

        $wallet = $this->getWalletRow($userId);

        $reference = 'wd_' . $user['id'] . '_' . time() . '_' . bin2hex(random_bytes(4));
        $meta = json_encode([
            'bank_name' => $bankName,
            'account_number' => $accountNumber,
            'account_name' => $accountName,
        ], JSON_THROW_ON_ERROR);

        $this->db->prepare(
            'INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at)
             VALUES (?, ?, "withdrawal", ?, "pending", ?, ?, NOW(), NOW())'
        )->execute([(int) $user['id'], (int) $wallet['id'], -$amount, $reference, $meta]);

        $transactionId = (int) $this->db->lastInsertId();
        $this->db->prepare(
            'INSERT INTO withdrawal_requests (user_id, transaction_id, amount_kobo, bank_name, account_number, account_name, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, "pending", NOW())'
        )->execute([(int) $user['id'], $transactionId, $amount, $bankName, $accountNumber, $accountName]);

        $this->syncWalletBalance($userId);

        Response::success([
            'withdrawal' => [
                'amount' => $amount / 100,
                'status' => 'pending',
                'reference' => $reference,
            ],
            'balance' => $balanceKobo / 100,
        ]);
    }

    public function topupConfig(Request $request): void
    {
        $user = $this->requireUser($request);

        $bankName = trim((string) ($_ENV['TOPUP_BANK_NAME'] ?? '')) ?: 'Moniepoint MFB';
        $accountNumber = trim((string) ($_ENV['TOPUP_ACCOUNT_NUMBER'] ?? '')) ?: '5289340156';
        $accountName = trim((string) ($_ENV['TOPUP_ACCOUNT_NAME'] ?? '')) ?: 'Divine Kelechi Christopher';

        Response::success([
            'bankName' => $bankName,
            'accountNumber' => $accountNumber,
            'accountName' => $accountName,
            'feeRate' => 0.02,
            'minAmount' => 100,
            'maxAmount' => 500000,
            'verificationTimeframe' => 'a few hours',
            'user' => [
                'name' => (string) $user['full_name'],
                'verified' => !empty($user['email_verified_at']),
            ],
        ]);
    }

    public function loans(Request $request): void
    {
        $user = $this->requireUser($request);
        $userId = (int) $user['id'];
        $unlockCheckStmt = $this->db->prepare('SELECT 1 FROM transactions WHERE user_id = ? AND type = "loan_unlock_fee" AND status = "completed" LIMIT 1');
        $unlockCheckStmt->execute([$userId]);
        $requestStmt = $this->db->prepare('SELECT id, amount_kobo, fee_kobo, total_repayable_kobo, purpose, employment_status, monthly_income_range, status, rejection_reason, created_at FROM loan_requests WHERE user_id = ? ORDER BY id DESC');
        $requestStmt->execute([$userId]);
        $loanStmt = $this->db->prepare('SELECT id, loan_request_id, principal_kobo, fee_kobo, total_repayable_kobo, amount_repaid_kobo, status, disbursed_at FROM loans WHERE user_id = ? ORDER BY id DESC');
        $loanStmt->execute([$userId]);

        $formatLoan = static function (array $loan): array {
            $total = (int) $loan['total_repayable_kobo'];
            $repaid = (int) $loan['amount_repaid_kobo'];
            return [
                'id' => (int) $loan['id'],
                'loanRequestId' => (int) $loan['loan_request_id'],
                'principal' => (int) $loan['principal_kobo'] / 100,
                'fee' => (int) $loan['fee_kobo'] / 100,
                'totalRepayable' => $total / 100,
                'amountRepaid' => $repaid / 100,
                'remainingBalance' => max(0, $total - $repaid) / 100,
                'status' => $loan['status'],
                'disbursedAt' => $loan['disbursed_at'],
            ];
        };

        Response::success([
            'loanAccessUnlocked' => $unlockCheckStmt->fetchColumn() !== false,
            'requests' => array_map(static fn (array $item): array => [
                'id' => (int) $item['id'],
                'amount' => (int) $item['amount_kobo'] / 100,
                'fee' => (int) $item['fee_kobo'] / 100,
                'totalRepayable' => (int) $item['total_repayable_kobo'] / 100,
                'purpose' => $item['purpose'],
                'employmentStatus' => $item['employment_status'],
                'monthlyIncomeRange' => $item['monthly_income_range'],
                'status' => $item['status'],
                'rejectionReason' => $item['rejection_reason'],
                'createdAt' => $item['created_at'],
            ], $requestStmt->fetchAll()),
            'loans' => array_map($formatLoan, $loanStmt->fetchAll()),
        ]);
    }

    public function submitLoanRequest(Request $request): void
    {
        $user = $this->requireUser($request);
        $amountNaira = (int) ($_POST['amount'] ?? 0);
        $purpose = trim((string) ($_POST['purpose'] ?? ''));
        $employmentStatus = trim((string) ($_POST['employment_status'] ?? ''));
        $incomeRange = trim((string) ($_POST['monthly_income_range'] ?? ''));
        $idDocument = $_FILES['id_document'] ?? null;
        $proofOfAddress = $_FILES['proof_of_address'] ?? null;
        $employmentOptions = ['employed', 'self-employed', 'student', 'unemployed'];
        $incomeOptions = ['Below ₦50,000', '₦50,000 - ₦149,999', '₦150,000 - ₦299,999', '₦300,000+'];

        if ($amountNaira < 1000 || $amountNaira > 500000) Response::error('Loan amount must be between ₦1,000 and ₦500,000.', 422, 'invalid_amount');
        if ($purpose === '' || strlen($purpose) > 255) Response::error('Please provide a short loan purpose.', 422, 'invalid_purpose');
        if (!in_array($employmentStatus, $employmentOptions, true) || !in_array($incomeRange, $incomeOptions, true)) Response::error('Please select valid employment and income details.', 422, 'invalid_profile');
        $this->validateLoanDocument($idDocument, 'ID document');
        $this->validateLoanDocument($proofOfAddress, 'Proof of address');

        $existingStmt = $this->db->prepare('SELECT 1 FROM loan_requests WHERE user_id = ? AND status = "pending" UNION ALL SELECT 1 FROM loans WHERE user_id = ? AND status = "active" LIMIT 1');
        $existingStmt->execute([(int) $user['id'], (int) $user['id']]);
        if ($existingStmt->fetchColumn() !== false) Response::error('You already have a loan request or active loan under review.', 422, 'loan_exists');

        $idPath = $this->storeLoanDocument($idDocument);
        $addressPath = $this->storeLoanDocument($proofOfAddress);
        $amountKobo = $amountNaira * 100;
        $feeKobo = (int) round($amountKobo * 0.05);
        try {
            $this->db->prepare('INSERT INTO loan_requests (user_id, amount_kobo, fee_kobo, total_repayable_kobo, purpose, employment_status, monthly_income_range, id_document_path, proof_of_address_path, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "pending", NOW())')->execute([(int) $user['id'], $amountKobo, $feeKobo, $amountKobo + $feeKobo, $purpose, $employmentStatus, $incomeRange, $idPath, $addressPath]);
        } catch (\Throwable $throwable) {
            @unlink(dirname(__DIR__, 2) . '/storage/loan-documents/' . $idPath);
            @unlink(dirname(__DIR__, 2) . '/storage/loan-documents/' . $addressPath);
            throw $throwable;
        }

        Response::success(['status' => 'pending', 'amount' => $amountNaira, 'fee' => $feeKobo / 100, 'totalRepayable' => ($amountKobo + $feeKobo) / 100], 201);
    }

    public function submitLoanUnlockReceipt(Request $request): void
    {
        $user = $this->requireUser($request);
        $amountNaira = (int) round((float) ($_POST['amount'] ?? 7700));
        $file = $_FILES['receipt'] ?? null;

        if ($amountNaira !== 7700) {
            Response::error('The loan unlock fee is ₦7,700.', 422, 'invalid_loan_unlock_amount');
        }
        if (!is_array($file) || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            Response::error('A payment proof file is required.', 422, 'receipt_required');
        }
        if ((int) $file['size'] > 5 * 1024 * 1024) {
            Response::error('Payment proof must be 5MB or smaller.', 422, 'receipt_too_large');
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file((string) $file['tmp_name']);
        $allowed = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'application/pdf' => 'pdf',
        ];
        if (!isset($allowed[$mime])) {
            Response::error('Payment proof must be a JPG, PNG, or PDF file.', 422, 'invalid_receipt_type');
        }

        $receiptData = file_get_contents((string) $file['tmp_name']);
        if ($receiptData === false) {
            Response::error('Payment proof could not be read.', 422, 'receipt_unreadable');
        }

        $storageDir = dirname(__DIR__, 2) . '/storage/topup-receipts';
        if (!is_dir($storageDir) && !mkdir($storageDir, 0700, true) && !is_dir($storageDir)) {
            Response::error('Receipt storage is unavailable.', 500);
        }

        $fileName = bin2hex(random_bytes(24)) . '.' . $allowed[$mime];
        $filePath = $storageDir . '/' . $fileName;
        if (!move_uploaded_file((string) $file['tmp_name'], $filePath)) {
            Response::error('Payment proof upload could not be saved.', 500);
        }

        $userId = (int) $user['id'];
        $wallet = $this->getWalletRow($userId);
        $amountKobo = $amountNaira * 100;
        $reference = 'loan_unlock_' . $userId . '_' . time() . '_' . bin2hex(random_bytes(4));

        $this->db->beginTransaction();
        try {
            $this->db->prepare(
                'INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at)
                 VALUES (?, ?, "loan_unlock_fee", ?, "pending", ?, ?, NOW(), NOW())'
            )->execute([$userId, (int) $wallet['id'], $amountKobo, $reference, json_encode([
                'claimed_amount_kobo' => $amountKobo,
            ], JSON_THROW_ON_ERROR)]);
            $transactionId = (int) $this->db->lastInsertId();
            $this->db->prepare(
                'INSERT INTO topup_receipts (user_id, transaction_id, file_path, receipt_data, receipt_mime, status, created_at)
                 VALUES (?, ?, ?, ?, ?, "pending", NOW())'
            )->execute([$userId, $transactionId, $fileName, $receiptData, $mime]);
            $this->db->commit();
        } catch (\Throwable $throwable) {
            $this->db->rollBack();
            @unlink($filePath);
            throw $throwable;
        }

        Response::success([
            'reference' => $reference,
            'status' => 'pending',
            'unlockAmount' => $amountNaira,
        ], 201);
    }

    public function submitLoanRepayment(Request $request, array $params = []): void
    {
        $user = $this->requireUser($request);
        $loanId = (int) ($params['id'] ?? 0);
        $amountNaira = (int) ($_POST['amount'] ?? 0);
        $file = $_FILES['receipt'] ?? null;
        $stmt = $this->db->prepare('SELECT * FROM loans WHERE id = ? AND user_id = ? AND status = "active" LIMIT 1');
        $stmt->execute([$loanId, (int) $user['id']]);
        $loan = $stmt->fetch();
        if ($loan === false) Response::error('Active loan not found.', 404);
        $remainingStmt = $this->db->prepare('SELECT GREATEST(0, total_repayable_kobo - amount_repaid_kobo - COALESCE((SELECT SUM(amount_kobo) FROM loan_repayments WHERE loan_id = ? AND status = "pending"), 0)) FROM loans WHERE id = ?');
        $remainingStmt->execute([$loanId, $loanId]);
        $remainingKobo = (int) $remainingStmt->fetchColumn();
        $amountKobo = $amountNaira * 100;
        if ($amountKobo <= 0 || $amountKobo > $remainingKobo) Response::error('Repayment must be greater than zero and no more than the remaining balance.', 422, 'invalid_repayment');
        $this->validateLoanDocument($file, 'Repayment receipt');
        $filePath = $this->storeLoanDocument($file);
        try {
            $this->db->prepare('INSERT INTO loan_repayments (loan_id, user_id, amount_kobo, file_path, status, created_at) VALUES (?, ?, ?, ?, "pending", NOW())')->execute([$loanId, (int) $user['id'], $amountKobo, $filePath]);
        } catch (\Throwable $throwable) {
            @unlink(dirname(__DIR__, 2) . '/storage/loan-documents/' . $filePath);
            throw $throwable;
        }
        Response::success(['status' => 'pending', 'amount' => $amountNaira, 'remainingBalance' => ($remainingKobo - $amountKobo) / 100], 201);
    }

    public function submitTopupReceipt(Request $request): void
    {
        $user = $this->requireUser($request);
        $amountNaira = (int) round((float) ($_POST['amount'] ?? 0));
        $file = $_FILES['receipt'] ?? null;

        if ($amountNaira < 100 || $amountNaira > 500000) {
            Response::error('Top-up amount must be between ₦100 and ₦500,000.', 422, 'invalid_amount');
        }
        if (!is_array($file) || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            Response::error('A receipt file is required.', 422, 'receipt_required');
        }
        if ((int) $file['size'] > 5 * 1024 * 1024) {
            Response::error('Receipt must be 5MB or smaller.', 422, 'receipt_too_large');
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file((string) $file['tmp_name']);
        $allowed = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'application/pdf' => 'pdf',
        ];
        if (!isset($allowed[$mime])) {
            Response::error('Receipt must be a JPG, PNG, or PDF file.', 422, 'invalid_receipt_type');
        }
        $receiptData = file_get_contents((string) $file['tmp_name']);
        if ($receiptData === false) {
            Response::error('Receipt could not be read.', 422, 'receipt_unreadable');
        }

        $storageDir = dirname(__DIR__, 2) . '/storage/topup-receipts';
        if (!is_dir($storageDir) && !mkdir($storageDir, 0700, true) && !is_dir($storageDir)) {
            Response::error('Receipt storage is unavailable.', 500);
        }
        $fileName = bin2hex(random_bytes(24)) . '.' . $allowed[$mime];
        $filePath = $storageDir . '/' . $fileName;
        if (!move_uploaded_file((string) $file['tmp_name'], $filePath)) {
            Response::error('Receipt upload could not be saved.', 500);
        }

        $userId = (int) $user['id'];
        $wallet = $this->getWalletRow($userId);
        $amountKobo = $amountNaira * 100;
        $feeKobo = (int) round($amountKobo * 0.02);
        $reference = 'topup_' . $userId . '_' . time() . '_' . bin2hex(random_bytes(4));

        $this->db->beginTransaction();
        try {
            $this->db->prepare(
                'INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at)
                 VALUES (?, ?, "top_up", ?, "pending", ?, ?, NOW(), NOW())'
            )->execute([$userId, (int) $wallet['id'], $amountKobo, $reference, json_encode([
                'claimed_amount_kobo' => $amountKobo,
                'fee_kobo' => $feeKobo,
            ], JSON_THROW_ON_ERROR)]);
            $transactionId = (int) $this->db->lastInsertId();
            $this->db->prepare(
                 'INSERT INTO topup_receipts (user_id, transaction_id, file_path, receipt_data, receipt_mime, status, created_at)
                  VALUES (?, ?, ?, ?, ?, "pending", NOW())'
              )->execute([$userId, $transactionId, $fileName, $receiptData, $mime]);
            $this->db->commit();
        } catch (\Throwable $throwable) {
            $this->db->rollBack();
            @unlink($filePath);
            throw $throwable;
        }

        Response::success([
            'reference' => $reference,
            'status' => 'pending',
            'claimedAmount' => $amountNaira,
            'fee' => $feeKobo / 100,
            'expectedCredit' => ($amountKobo - $feeKobo) / 100,
        ], 201);
    }

    public function submitUpgradeReceipt(Request $request): void
    {
        $user = $this->requireUser($request);
        $amountNaira = (int) round((float) ($_POST['amount'] ?? 0));
        $tier = trim((string) ($_POST['tier'] ?? ''));
        $file = $_FILES['receipt'] ?? null;

        $tierRates = ['Silver' => 25000, 'Gold' => 30000, 'Platinum' => 35000, 'Diamond' => 40000];
        if (!isset($tierRates[$tier]) || $amountNaira !== $tierRates[$tier]) {
            Response::error('The upgrade tier and payment amount do not match.', 422, 'invalid_upgrade');
        }
        if ($amountNaira <= 0 || $amountNaira > 500000 || $tier === '') {
            Response::error('A valid upgrade tier and payment amount are required.', 422, 'invalid_upgrade');
        }
        if (!is_array($file) || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            Response::error('A receipt file is required.', 422, 'receipt_required');
        }
        if ((int) $file['size'] > 5 * 1024 * 1024) {
            Response::error('Receipt must be 5MB or smaller.', 422, 'receipt_too_large');
        }

        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file((string) $file['tmp_name']);
        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'application/pdf' => 'pdf'];
        if (!isset($allowed[$mime])) {
            Response::error('Receipt must be a JPG, PNG, or PDF file.', 422, 'invalid_receipt_type');
        }
        $receiptData = file_get_contents((string) $file['tmp_name']);
        if ($receiptData === false) {
            Response::error('Receipt could not be read.', 422, 'receipt_unreadable');
        }

        $storageDir = dirname(__DIR__, 2) . '/storage/topup-receipts';
        if (!is_dir($storageDir) && !mkdir($storageDir, 0700, true) && !is_dir($storageDir)) {
            Response::error('Receipt storage is unavailable.', 500);
        }
        $fileName = bin2hex(random_bytes(24)) . '.' . $allowed[$mime];
        $filePath = $storageDir . '/' . $fileName;
        if (!move_uploaded_file((string) $file['tmp_name'], $filePath)) {
            Response::error('Receipt upload could not be saved.', 500);
        }

        $userId = (int) $user['id'];
        $wallet = $this->getWalletRow($userId);
        $amountKobo = $amountNaira * 100;
        $reference = 'upgrade_' . $userId . '_' . time() . '_' . bin2hex(random_bytes(4));

        $this->db->beginTransaction();
        try {
            $this->db->prepare(
                'INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at)
                 VALUES (?, ?, "upgrade_fee", 0, "pending", ?, ?, NOW(), NOW())'
            )->execute([$userId, (int) $wallet['id'], $reference, json_encode([
                'tier' => $tier,
                'claimed_amount_kobo' => $amountKobo,
            ], JSON_THROW_ON_ERROR)]);
            $transactionId = (int) $this->db->lastInsertId();
            $this->db->prepare(
                 'INSERT INTO topup_receipts (user_id, transaction_id, file_path, receipt_data, receipt_mime, status, created_at)
                  VALUES (?, ?, ?, ?, ?, "pending", NOW())'
              )->execute([$userId, $transactionId, $fileName, $receiptData, $mime]);
            $this->db->commit();
        } catch (\Throwable $throwable) {
            $this->db->rollBack();
            @unlink($filePath);
            throw $throwable;
        }

        Response::success(['reference' => $reference, 'status' => 'pending', 'tier' => $tier], 201);
    }

    private function validateLoanDocument(?array $file, string $label): void
    {
        if (!is_array($file) || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) Response::error($label . ' is required.', 422, 'document_required');
        if ((int) $file['size'] > 5 * 1024 * 1024) Response::error($label . ' must be 5MB or smaller.', 422, 'document_too_large');
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file((string) $file['tmp_name']);
        if (!in_array($mime, ['image/jpeg', 'image/png', 'application/pdf'], true)) Response::error($label . ' must be a JPG, PNG, or PDF file.', 422, 'invalid_document_type');
    }

    private function storeLoanDocument(array $file): string
    {
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file((string) $file['tmp_name']);
        $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'application/pdf' => 'pdf'];
        $directory = dirname(__DIR__, 2) . '/storage/loan-documents';
        if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) Response::error('Loan document storage is unavailable.', 500);
        $fileName = bin2hex(random_bytes(24)) . '.' . $extensions[$mime];
        if (!move_uploaded_file((string) $file['tmp_name'], $directory . '/' . $fileName)) Response::error('Loan document could not be saved.', 500);
        return $fileName;
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

    private function getBalanceKobo(int $userId): int
    {
        $stmt = $this->db->prepare(
            'SELECT COALESCE(SUM(amount_kobo), 0) FROM transactions WHERE user_id = ? AND status = "completed"'
        );
        $stmt->execute([$userId]);

        return (int) $stmt->fetchColumn();
    }

    private function getPendingWithdrawalKobo(int $userId): int
    {
        $stmt = $this->db->prepare(
            'SELECT COALESCE(SUM(amount_kobo), 0) FROM withdrawal_requests WHERE user_id = ? AND status = "pending"'
        );
        $stmt->execute([$userId]);

        return (int) $stmt->fetchColumn();
    }

    private function getPendingLockKobo(int $userId): int
    {
        $stmt = $this->db->prepare(
            'SELECT COALESCE(SUM(-amount_kobo), 0) FROM transactions WHERE user_id = ? AND type = "lock_hold" AND status = "pending"'
        );
        $stmt->execute([$userId]);

        return (int) $stmt->fetchColumn();
    }

    private function syncWalletBalance(int $userId): void
    {
        $walletRow = $this->getWalletRow($userId);
        $balance = $this->getBalanceKobo($userId);
        $this->db->prepare('UPDATE wallets SET balance_kobo = ?, updated_at = NOW() WHERE id = ?')->execute([$balance, (int) $walletRow['id']]);
    }

    private function sendPush(int $userId, string $title, string $body, string $url): void
    {
        try {
            $this->notifications->sendToUser($userId, $title, $body, $url);
        } catch (\Throwable $throwable) {
            error_log('Push notification failed: ' . $throwable->getMessage());
        }
    }

    private function countActiveReferrals(int $userId): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM referrals WHERE referrer_user_id = ? AND status = "active"');
        $stmt->execute([$userId]);

        return (int) $stmt->fetchColumn();
    }

    private function releaseExpiredLocksForUser(int $userId): void
    {
        // A real scheduled job would be better once this app is running on a persistent host.
        $stmt = $this->db->prepare(
            'SELECT * FROM fund_locks WHERE user_id = ? AND status = "active" AND unlocks_at <= NOW() ORDER BY unlocks_at ASC'
        );
        $stmt->execute([$userId]);

        foreach ($stmt->fetchAll() as $lock) {
            $lockId = (int) $lock['id'];
            $releaseKobo = (int) $lock['amount_kobo'] + (int) $lock['bonus_kobo'];
            $wallet = $this->getWalletRow($userId);

            $this->db->prepare(
                'INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at)
                 VALUES (?, ?, "lock_release", ?, "completed", ?, ?, NOW(), NOW())'
            )->execute([
                $userId,
                (int) $wallet['id'],
                $releaseKobo,
                'lock_release_' . $lockId . '_' . time(),
                json_encode(['lock_id' => $lockId, 'amount_kobo' => $releaseKobo], JSON_THROW_ON_ERROR),
            ]);

            $this->db->prepare(
                'UPDATE fund_locks SET status = "completed", released_at = NOW() WHERE id = ?'
            )->execute([$lockId]);

            $this->db->prepare(
                'INSERT INTO activity_feed (user_id, type, description, amount_kobo, created_at)
                 VALUES (?, ?, ?, ?, NOW())'
            )->execute([
                $userId,
                'lock',
                'Locked funds released: principal + bonus credited back to wallet',
                $releaseKobo,
            ]);
        }

        $this->syncWalletBalance($userId);
    }

    private function latestCheckIn(int $userId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM check_ins WHERE user_id = ? ORDER BY check_in_date DESC LIMIT 1');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    private function hasCheckedInToday(int $userId): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM check_ins WHERE user_id = ? AND check_in_date = CURDATE() LIMIT 1');
        $stmt->execute([$userId]);

        return $stmt->fetchColumn() !== false;
    }

    private function getCurrentCheckInDay(int $userId): int
    {
        $last = $this->latestCheckIn($userId);
        if ($last === null) {
            return 1;
        }

        if ($this->hasCheckedInToday($userId)) {
            return min(7, (int) $last['streak_day']);
        }

        $lastDate = new \DateTimeImmutable($last['check_in_date']);
        $today = new \DateTimeImmutable((string) $this->db->query('SELECT CURDATE()')->fetchColumn());
        $diff = (int) $lastDate->diff($today)->days;

        if ($diff > 1) {
            return 1;
        }

        return min(7, max(1, (int) $last['streak_day'] + 1));
    }

    private function recordTransaction(int $userId, int $walletId, string $type, int $amountKobo, string $reference, array $meta = []): void
    {
        $this->db->prepare(
            'INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at)
             VALUES (?, ?, ?, ?, "completed", ?, ?, NOW(), NOW())'
        )->execute([
            $userId,
            $walletId,
            $type,
            $amountKobo,
            $reference,
            json_encode($meta, JSON_THROW_ON_ERROR),
        ]);
    }

    private function seedAchievements(): void
    {
        $seed = [
            ['connector', 'Connector', 'Refer your first friend', 'users', 1, 'referrals_active'],
            ['networker', 'Networker', 'Refer 5 friends', 'users', 5, 'referrals_active'],
            ['influencer', 'Influencer', 'Refer 20 friends', 'megaphone', 20, 'referrals_active'],
            ['legend', 'Legend', 'Refer 50 friends', 'trophy', 50, 'referrals_active'],
            ['casher', 'Casher', 'Complete your first withdrawal', 'wallet', 1, 'withdrawals_completed'],
            ['money_maker', 'Money Maker', 'Complete 5 withdrawals', 'banknote', 5, 'withdrawals_completed'],
            ['risk_taker', 'Risk Taker', 'Play your first spin', 'sparkles', 1, 'spins_played'],
            ['lucky_star', 'Lucky Star', 'Win 3 spins', 'star', 3, 'spins_won'],
            ['task_master', 'Task Master', 'Complete 10 tasks', 'check', 10, 'tasks_completed'],
            ['daily_grinder', 'Daily Grinder', 'Claim bonus 30 times', 'flame', 30, 'claims_lifetime'],
        ];

        foreach ($seed as [$code, $title, $description, $icon, $target, $progressKey]) {
            $this->db->prepare(
                'INSERT INTO achievements (code, title, description, icon, target_count, progress_key)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), icon = VALUES(icon), target_count = VALUES(target_count), progress_key = VALUES(progress_key)'
            )->execute([$code, $title, $description, $icon, $target, $progressKey]);
        }
    }

    private function getAchievementProgress(int $userId, string $progressKey): int
    {
        $queries = [
            'referrals_active' => 'SELECT COUNT(*) FROM referrals WHERE referrer_user_id = ? AND status = "active"',
            'withdrawals_completed' => 'SELECT COUNT(*) FROM withdrawal_requests WHERE user_id = ? AND status IN ("approved", "paid")',
            'spins_played' => 'SELECT COUNT(*) FROM spins WHERE user_id = ?',
            'spins_won' => 'SELECT COUNT(*) FROM spins WHERE user_id = ? AND result_kobo > 0',
            'tasks_completed' => 'SELECT COUNT(*) FROM task_completions WHERE user_id = ?',
            'claims_lifetime' => 'SELECT COALESCE(SUM(claims_count), 0) FROM daily_claims WHERE user_id = ?',
        ];

        if (!isset($queries[$progressKey])) {
            return 0;
        }

        $stmt = $this->db->prepare($queries[$progressKey]);
        $stmt->execute([$userId]);
        return (int) $stmt->fetchColumn();
    }

    private function isAchievementUnlocked(int $achievementId, int $userId): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM user_achievements WHERE user_id = ? AND achievement_id = ? LIMIT 1');
        $stmt->execute([$userId, $achievementId]);

        return $stmt->fetchColumn() !== false;
    }
}
