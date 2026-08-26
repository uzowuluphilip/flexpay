<?php
require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

$db = Database::getInstance()->getConnection();
$email = 'liveguard_' . time() . '_' . random_int(1000, 9999) . '@test.local';
$password = 'Password123';
$hash = password_hash($password, PASSWORD_BCRYPT);
$ref = strtoupper(bin2hex(random_bytes(4)));

$stmt = $db->prepare(
  'INSERT INTO users (full_name, email, password_hash, referral_code, email_verified_at, status, created_at, updated_at)
   VALUES (?, ?, ?, ?, NULL, "active", NOW(), NOW())'
);
$stmt->execute(['Live Guard User', $email, $hash, $ref]);
$userId = (int) $db->lastInsertId();

$db->prepare('INSERT INTO wallets (user_id, balance_kobo, currency, created_at, updated_at) VALUES (?, 0, "NGN", NOW(), NOW())')->execute([$userId]);
$walletId = (int) $db->query('SELECT id FROM wallets WHERE user_id = ' . $userId)->fetchColumn();
$db->prepare(
  'INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at)
   VALUES (?, ?, "top_up", ?, "completed", ?, ?, NOW(), NOW())'
)->execute([$userId, $walletId, 100000, 'seed_' . time(), json_encode(['seed' => 'live-http'])]);

echo json_encode(['email' => $email, 'password' => $password], JSON_UNESCAPED_SLASHES);
