<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

$rootPath = dirname(__DIR__);
Dotenv::createImmutable($rootPath)->safeLoad();
$db = Database::getInstance()->getConnection();

$db->exec("ALTER TABLE transactions MODIFY type ENUM('top_up','welcome_bonus','withdrawal','referral_bonus','check_in_bonus','task_reward','spin_win','spin_loss','spin_try','loan_disbursement','loan_repayment','upgrade_fee','admin_adjustment','lock_hold','lock_release') NOT NULL");
$db->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS loan_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  amount_kobo BIGINT UNSIGNED NOT NULL,
  fee_kobo BIGINT UNSIGNED NOT NULL,
  total_repayable_kobo BIGINT UNSIGNED NOT NULL,
  purpose VARCHAR(255) NOT NULL,
  employment_status VARCHAR(100) NOT NULL,
  monthly_income_range VARCHAR(50) NOT NULL,
  id_document_path VARCHAR(255) NOT NULL,
  proof_of_address_path VARCHAR(255) NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  rejection_reason VARCHAR(255) NULL,
  reviewed_by_admin_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_loan_requests_user (user_id),
  KEY idx_loan_requests_status (status),
  CONSTRAINT fk_loan_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
SQL);
$db->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS loans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  loan_request_id BIGINT UNSIGNED NOT NULL,
  principal_kobo BIGINT UNSIGNED NOT NULL,
  fee_kobo BIGINT UNSIGNED NOT NULL,
  total_repayable_kobo BIGINT UNSIGNED NOT NULL,
  amount_repaid_kobo BIGINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('active','repaid','defaulted') NOT NULL DEFAULT 'active',
  disbursed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_loans_user (user_id),
  CONSTRAINT fk_loans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_loans_request FOREIGN KEY (loan_request_id) REFERENCES loan_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
SQL);
$db->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS loan_repayments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  loan_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  amount_kobo BIGINT UNSIGNED NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  rejection_reason VARCHAR(255) NULL,
  reviewed_by_admin_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_loan_repayments_loan (loan_id),
  KEY idx_loan_repayments_user (user_id),
  CONSTRAINT fk_loan_repayments_loan FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
  CONSTRAINT fk_loan_repayments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
SQL);

echo "Loan migration complete.\n";
