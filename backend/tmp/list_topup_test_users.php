<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db = Database::getInstance()->getConnection();
foreach ($db->query("SELECT id, email, email_verified_at FROM users WHERE email LIKE 'topup_%' ORDER BY id DESC LIMIT 8") as $row) {
    echo json_encode($row) . PHP_EOL;
}
