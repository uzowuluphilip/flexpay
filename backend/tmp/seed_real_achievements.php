<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db = Database::getInstance()->getConnection();

$columns = $db->query("SHOW COLUMNS FROM achievements")->fetchAll(PDO::FETCH_COLUMN);
if (!in_array('target_count', $columns, true)) {
    $db->exec("ALTER TABLE achievements ADD target_count INT UNSIGNED NOT NULL DEFAULT 1 AFTER icon");
}
if (!in_array('progress_key', $columns, true)) {
    $db->exec("ALTER TABLE achievements ADD progress_key VARCHAR(50) NOT NULL DEFAULT 'referrals_active' AFTER target_count");
}

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

$db->beginTransaction();
try {
    $codes = array_column($seed, 0);
    $placeholders = implode(',', array_fill(0, count($codes), '?'));
    $old = $db->prepare("SELECT id FROM achievements WHERE code NOT IN ($placeholders)");
    $old->execute($codes);
    $oldIds = $old->fetchAll(PDO::FETCH_COLUMN);
    if ($oldIds !== []) {
        $idPlaceholders = implode(',', array_fill(0, count($oldIds), '?'));
        $db->prepare("DELETE FROM user_achievements WHERE achievement_id IN ($idPlaceholders)")->execute($oldIds);
        $db->prepare("DELETE FROM achievements WHERE id IN ($idPlaceholders)")->execute($oldIds);
    }

    $stmt = $db->prepare(
        'INSERT INTO achievements (code, title, description, icon, target_count, progress_key)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), icon = VALUES(icon), target_count = VALUES(target_count), progress_key = VALUES(progress_key)'
    );
    foreach ($seed as $row) $stmt->execute($row);
    $db->commit();
} catch (Throwable $throwable) {
    $db->rollBack();
    throw $throwable;
}

$rows = $db->query('SELECT code, title, target_count, progress_key FROM achievements ORDER BY id ASC')->fetchAll();
echo json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
