<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$db = Database::getInstance()->getConnection();
$db->exec("CREATE TABLE IF NOT EXISTS topup_receipts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  transaction_id BIGINT UNSIGNED NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  receipt_data LONGBLOB NULL,
  receipt_mime VARCHAR(100) NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  rejection_reason VARCHAR(255) NULL,
  reviewed_by_admin_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_topup_receipts_user (user_id),
  KEY idx_topup_receipts_status (status),
  CONSTRAINT fk_topup_receipts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_topup_receipts_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$columns = $db->query("SHOW COLUMNS FROM topup_receipts")->fetchAll(PDO::FETCH_COLUMN);
if (!in_array('receipt_data', $columns, true)) {
  $db->exec('ALTER TABLE topup_receipts ADD COLUMN receipt_data LONGBLOB NULL AFTER file_path');
}
if (!in_array('receipt_mime', $columns, true)) {
  $db->exec('ALTER TABLE topup_receipts ADD COLUMN receipt_mime VARCHAR(100) NULL AFTER receipt_data');
}

$receiptRows = $db->query('SELECT id, file_path FROM topup_receipts WHERE receipt_data IS NULL AND file_path IS NOT NULL')->fetchAll(PDO::FETCH_ASSOC);
$receiptDir = dirname(__DIR__) . '/storage/topup-receipts';
$mimeByExtension = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'pdf' => 'application/pdf'];
foreach ($receiptRows as $receiptRow) {
  $filePath = $receiptDir . '/' . basename((string) $receiptRow['file_path']);
  if (!is_file($filePath)) continue;
  $data = file_get_contents($filePath);
  if ($data === false) continue;
  $extension = strtolower((string) pathinfo($filePath, PATHINFO_EXTENSION));
  $mime = $mimeByExtension[$extension] ?? 'application/octet-stream';
  $stmt = $db->prepare('UPDATE topup_receipts SET receipt_data = ?, receipt_mime = ? WHERE id = ?');
  $stmt->execute([$data, $mime, (int) $receiptRow['id']]);
}

$exists = $db->query("SHOW TABLES LIKE 'topup_receipts'")->fetchColumn();
echo $exists ? "topup_receipts exists\n" : "topup_receipts missing\n";
