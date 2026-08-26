<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db = Database::getInstance()->getConnection();

$transactionType = $db->query("SHOW COLUMNS FROM transactions LIKE 'type'")->fetch();
if ($transactionType && !str_contains($transactionType['Type'], "'spin_loss'")) {
    $db->exec("ALTER TABLE transactions MODIFY type ENUM('top_up','withdrawal','referral_bonus','check_in_bonus','task_reward','spin_win','spin_loss','spin_try','upgrade_fee','admin_adjustment','lock_hold','lock_release') NOT NULL");
}
$columns = $db->query('SHOW COLUMNS FROM spins')->fetchAll(PDO::FETCH_COLUMN);
if (!in_array('stake_kobo', $columns, true)) $db->exec('ALTER TABLE spins ADD stake_kobo BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER user_id');
if (!in_array('outcome', $columns, true)) $db->exec("ALTER TABLE spins ADD outcome ENUM('win','lose','try_again') NOT NULL DEFAULT 'try_again' AFTER result_kobo");

echo json_encode($db->query('SHOW COLUMNS FROM spins')->fetchAll(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
