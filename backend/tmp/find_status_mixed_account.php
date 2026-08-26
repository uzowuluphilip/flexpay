<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db = Database::getInstance()->getConnection();
$rows = $db->query("SELECT af.user_id, u.email,
    SUM(af.type = 'task') AS task_rows,
    SUM(af.type = 'referral') AS referral_rows,
    SUM(af.type = 'check_in') AS checkin_rows
    FROM activity_feed af JOIN users u ON u.id = af.user_id
    GROUP BY af.user_id, u.email
    HAVING task_rows > 0 AND referral_rows > 0
    ORDER BY af.user_id DESC")->fetchAll();
echo json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
