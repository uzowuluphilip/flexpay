<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db = Database::getInstance()->getConnection();
$rows = $db->query("SELECT af.user_id, u.email, af.type, af.description, af.amount_kobo, af.created_at
    FROM activity_feed af JOIN users u ON u.id = af.user_id
    WHERE af.type IN ('task', 'referral')
    ORDER BY af.id DESC LIMIT 20")->fetchAll();
echo json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
