<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db = Database::getInstance()->getConnection();
$user = $db->query("SELECT id, email FROM users WHERE email = 'topup_approve_1787088001@test.local' LIMIT 1")->fetch();
$transaction = $db->query('SELECT * FROM transactions WHERE user_id = ' . (int) $user['id'] . ' AND type = "top_up" ORDER BY id DESC LIMIT 1')->fetch();
$receipt = $db->query('SELECT * FROM topup_receipts WHERE transaction_id = ' . (int) $transaction['id'] . ' LIMIT 1')->fetch();
$wallet = $db->query('SELECT balance_kobo FROM wallets WHERE user_id = ' . (int) $user['id'] . ' LIMIT 1')->fetch();
echo json_encode(['user' => $user, 'transaction' => $transaction, 'receipt' => $receipt, 'wallet' => $wallet], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
