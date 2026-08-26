<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db = Database::getInstance()->getConnection();

$milestone = $db->query("SELECT t.id, t.user_id, t.amount_kobo, t.meta, t.reference, t.created_at, u.full_name, u.email
    FROM transactions t
    JOIN users u ON u.id = t.user_id
    WHERE t.type = 'referral_bonus'
      AND JSON_EXTRACT(t.meta, '$.milestone') = 10
    ORDER BY t.id DESC
    LIMIT 1")->fetch();

if ($milestone === false) {
    throw new RuntimeException('No milestone transaction found.');
}

$countStatement = $db->prepare("SELECT COUNT(*) FROM referrals WHERE referrer_user_id = ? AND status = 'active'");
$countStatement->execute([(int) $milestone['user_id']]);
$activeCount = (int) $countStatement->fetchColumn();

$referralsStatement = $db->prepare("SELECT id, referred_user_id, status, bonus_amount_kobo, created_at
    FROM referrals
    WHERE referrer_user_id = ? AND status = 'active'
    ORDER BY id ASC");
$referralsStatement->execute([(int) $milestone['user_id']]);
$referrals = $referralsStatement->fetchAll();

$claimsStatement = $db->prepare("SELECT * FROM referral_milestone_claims WHERE user_id = ? ORDER BY milestone ASC");
$claimsStatement->execute([(int) $milestone['user_id']]);
$claims = $claimsStatement->fetchAll();

$perReferralKobo = 1500000;
$milestoneBonusKobo = (int) $milestone['amount_kobo'];
$expectedReferralKobo = $activeCount * $perReferralKobo;
$expectedTotalKobo = $expectedReferralKobo + $milestoneBonusKobo;

$result = [
    'referrer' => [
        'user_id' => (int) $milestone['user_id'],
        'full_name' => $milestone['full_name'],
        'email' => $milestone['email'],
    ],
    'milestone_transaction' => $milestone,
    'active_referral_count_now' => $activeCount,
    'active_referrals' => $referrals,
    'milestone_claims' => $claims,
    'arithmetic' => [
        'active_referrals' => $activeCount,
        'per_referral_kobo' => $perReferralKobo,
        'referral_value_kobo' => $expectedReferralKobo,
        'milestone_bonus_kobo' => $milestoneBonusKobo,
        'combined_value_kobo' => $expectedTotalKobo,
        'combined_value_naira' => $expectedTotalKobo / 100,
        'milestone_transaction_amount_kobo' => $milestoneBonusKobo,
    ],
];

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
