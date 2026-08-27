-- FlexPay InfinityFree migration export
-- Generated from backend/database/schema.sql.
-- Import into the empty MySQL database created in InfinityFree phpMyAdmin.
-- This file contains schema only; it contains no local users, wallets,
-- transactions, receipts, or credentials. Back up an existing database
-- before importing and do not run this file as a destructive live migration.
-- ============================================================

-- ============================================================
-- FlexPay — Database Schema
-- MySQL 8+ / phpMyAdmin
-- ============================================================
-- Design notes (read before wiring PHP endpoints to this):
--
-- 1. All money columns are stored as BIGINT in kobo (1 Naira = 100 kobo),
--    never as FLOAT/DECIMAL-with-rounding-errors. Format to ₦ in PHP/JS
--    only at the display layer: amount_kobo / 100.
--
-- 2. `admin_users` is a fully separate table from `users` — admin auth
--    is a separate login, separate session, separate concern. Don't add
--    an `is_admin` flag to `users`.
--
-- 3. Every balance-changing action (check-in, claim, referral bonus,
--    task, spin, withdrawal, admin adjustment) writes a row to
--    `transactions` — the wallet `balance_kobo` is a cached total that
--    should always be re-derivable by summing `transactions` for that
--    user. Treat `transactions` as the source of truth.
--
-- 4. Token columns (email verification, password reset) store a HASH
--    of the token, never the raw token — same pattern as password
--    storage. Compare using the hash of whatever token comes in on the
--    URL/request.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE users (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name           VARCHAR(120)        NOT NULL,
  email               VARCHAR(190)        NOT NULL,
  password_hash       VARCHAR(255)        NOT NULL,
  referral_code       VARCHAR(20)         NOT NULL,
  referred_by_user_id BIGINT UNSIGNED     NULL,
  email_verified_at   DATETIME            NULL,
  status              ENUM('active','suspended','banned') NOT NULL DEFAULT 'active',
  last_login_at       DATETIME            NULL,
  created_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_referral_code (referral_code),
  KEY idx_users_referred_by (referred_by_user_id),
  CONSTRAINT fk_users_referred_by FOREIGN KEY (referred_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy email verification tokens (unused; retained for existing databases)
CREATE TABLE email_verifications (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  token_hash   VARCHAR(255)    NOT NULL,
  expires_at   DATETIME        NOT NULL,
  verified_at  DATETIME        NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_email_verifications_user (user_id),
  CONSTRAINT fk_email_verifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy password reset tokens (unused; retained for existing databases)
CREATE TABLE password_resets (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255)    NOT NULL,
  expires_at  DATETIME        NOT NULL,
  used_at     DATETIME        NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_password_resets_user (user_id),
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Simple session/token store (swap for JWT-only if you prefer stateless auth)
CREATE TABLE sessions (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  token_hash   VARCHAR(255)    NOT NULL,
  user_agent   VARCHAR(255)    NULL,
  ip_address   VARCHAR(45)     NULL,
  expires_at   DATETIME        NOT NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sessions_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE push_subscriptions (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  endpoint     VARCHAR(500) NOT NULL,
  p256dh_key   VARCHAR(255) NOT NULL,
  auth_key     VARCHAR(255) NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_push_subscriptions_endpoint (endpoint(255)),
  KEY idx_push_subscriptions_user (user_id),
  CONSTRAINT fk_push_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- WALLET & TRANSACTIONS
-- ------------------------------------------------------------
CREATE TABLE wallets (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL,
  balance_kobo  BIGINT          NOT NULL DEFAULT 0,
  currency      CHAR(3)         NOT NULL DEFAULT 'NGN',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wallets_user (user_id),
  CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE transactions (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL,
  wallet_id     BIGINT UNSIGNED NOT NULL,
  type          ENUM('top_up','welcome_bonus','withdrawal','referral_bonus','check_in_bonus',
                      'task_reward','spin_win','spin_loss','spin_try','upgrade_fee','admin_adjustment',
                      'lock_hold','lock_release') NOT NULL,
  amount_kobo   BIGINT          NOT NULL COMMENT 'positive = credit, negative = debit',
  status        ENUM('pending','completed','failed','reversed') NOT NULL DEFAULT 'completed',
  reference     VARCHAR(64)     NOT NULL,
  meta          JSON            NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_transactions_reference (reference),
  KEY idx_transactions_user (user_id),
  KEY idx_transactions_type (type),
  CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_transactions_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE withdrawal_requests (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id             BIGINT UNSIGNED NOT NULL,
  transaction_id      BIGINT UNSIGNED NULL,
  amount_kobo         BIGINT          NOT NULL,
  bank_name           VARCHAR(100)    NOT NULL,
  account_number      VARCHAR(20)     NOT NULL,
  account_name        VARCHAR(120)    NOT NULL,
  status              ENUM('pending','approved','rejected','paid') NOT NULL DEFAULT 'pending',
  reviewed_by_admin_id BIGINT UNSIGNED NULL,
  reviewed_at         DATETIME        NULL,
  rejection_reason    VARCHAR(255)    NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_withdrawals_user (user_id),
  KEY idx_withdrawals_status (status),
  CONSTRAINT fk_withdrawals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_withdrawals_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE topup_receipts (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id              BIGINT UNSIGNED NOT NULL,
  transaction_id       BIGINT UNSIGNED NOT NULL,
  file_path            VARCHAR(255)    NOT NULL,
  status               ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  rejection_reason     VARCHAR(255)    NULL,
  reviewed_by_admin_id BIGINT UNSIGNED NULL,
  reviewed_at          DATETIME        NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_topup_receipts_user (user_id),
  KEY idx_topup_receipts_status (status),
  CONSTRAINT fk_topup_receipts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_topup_receipts_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- REFERRALS
-- ------------------------------------------------------------
CREATE TABLE referrals (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  referrer_user_id    BIGINT UNSIGNED NOT NULL,
  referred_user_id    BIGINT UNSIGNED NOT NULL,
  status              ENUM('pending','active') NOT NULL DEFAULT 'pending',
  bonus_amount_kobo   BIGINT          NOT NULL DEFAULT 0,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_referrals_referred (referred_user_id),
  KEY idx_referrals_referrer (referrer_user_id),
  CONSTRAINT fk_referrals_referrer FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_referrals_referred FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE referral_milestone_claims (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  milestone    SMALLINT UNSIGNED NOT NULL,
  reward_kobo  BIGINT UNSIGNED NOT NULL,
  claimed_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_referral_milestone (user_id, milestone),
  CONSTRAINT fk_referral_milestone_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- DAILY CHECK-IN & CLAIMS
-- ------------------------------------------------------------
CREATE TABLE check_ins (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL,
  check_in_date DATE            NOT NULL,
  streak_day    TINYINT UNSIGNED NOT NULL COMMENT '1-7, resets after 7 or after a missed day',
  reward_kobo   BIGINT          NOT NULL DEFAULT 0,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_checkins_user_date (user_id, check_in_date),
  CONSTRAINT fk_checkins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE daily_claims (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  claim_date   DATE            NOT NULL,
  claims_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  claims_limit SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_claims_user_date (user_id, claim_date),
  CONSTRAINT fk_claims_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE fund_locks (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  amount_kobo  BIGINT UNSIGNED NOT NULL,
  bonus_kobo   BIGINT UNSIGNED NOT NULL,
  locked_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unlocks_at   DATETIME NOT NULL,
  status       ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
  released_at  DATETIME NULL,
  KEY idx_fund_locks_user (user_id),
  CONSTRAINT fk_fund_locks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- TASKS & SPIN
-- ------------------------------------------------------------
CREATE TABLE tasks (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(150)    NOT NULL,
  description  VARCHAR(500)    NULL,
  reward_kobo  BIGINT          NOT NULL DEFAULT 0,
  is_active    TINYINT(1)      NOT NULL DEFAULT 1,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE task_completions (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL,
  task_id       BIGINT UNSIGNED NOT NULL,
  reward_kobo   BIGINT          NOT NULL,
  completed_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_task_completions_user (user_id),
  CONSTRAINT fk_task_completions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_completions_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE spins (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  stake_kobo   BIGINT UNSIGNED NOT NULL DEFAULT 0,
  result_kobo  BIGINT          NOT NULL DEFAULT 0,
  outcome      ENUM('win','lose','try_again') NOT NULL DEFAULT 'try_again',
  spun_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_spins_user (user_id),
  CONSTRAINT fk_spins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- ACHIEVEMENTS
-- ------------------------------------------------------------
CREATE TABLE achievements (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code         VARCHAR(50)     NOT NULL,
  title        VARCHAR(120)    NOT NULL,
  description  VARCHAR(255)    NULL,
  icon         VARCHAR(50)     NULL,
  target_count INT UNSIGNED   NOT NULL DEFAULT 1,
  progress_key VARCHAR(50)    NOT NULL DEFAULT 'referrals_active',
  UNIQUE KEY uq_achievements_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_achievements (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNSIGNED NOT NULL,
  achievement_id  BIGINT UNSIGNED NOT NULL,
  unlocked_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_achievements (user_id, achievement_id),
  CONSTRAINT fk_user_achievements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_achievements_achievement FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- ADMIN (fully separate from `users`)
-- ------------------------------------------------------------
CREATE TABLE admin_users (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(120)    NOT NULL,
  email         VARCHAR(190)    NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  role          ENUM('super_admin','support','finance') NOT NULL DEFAULT 'support',
  last_login_at DATETIME        NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE admin_audit_log (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id     BIGINT UNSIGNED NOT NULL,
  action       VARCHAR(100)    NOT NULL COMMENT 'e.g. withdrawal.approve, user.suspend, wallet.adjust',
  target_type  VARCHAR(50)     NOT NULL COMMENT 'e.g. user, withdrawal_request, transaction',
  target_id    BIGINT UNSIGNED NOT NULL,
  meta         JSON            NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_admin_audit_admin (admin_id),
  CONSTRAINT fk_admin_audit_admin FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE admin_sessions (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id     BIGINT UNSIGNED NOT NULL,
  token_hash   VARCHAR(255)    NOT NULL,
  user_agent   VARCHAR(255)    NULL,
  ip_address   VARCHAR(45)     NULL,
  expires_at   DATETIME        NOT NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_admin_sessions_admin (admin_id),
  CONSTRAINT fk_admin_sessions_admin FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Legacy email log (unused; retained for existing databases)
-- ------------------------------------------------------------
CREATE TABLE email_log (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NULL,
  type         ENUM('email_verification','password_reset','withdrawal_update','referral_bonus','other') NOT NULL,
  recipient    VARCHAR(190)    NOT NULL,
  provider_id  VARCHAR(100)    NULL COMMENT 'optional external provider message id',
  status       ENUM('sent','failed','logged_not_sent') NOT NULL DEFAULT 'sent',
  subject      VARCHAR(255)    NULL,
  content_text TEXT            NULL,
  link_url     VARCHAR(512)    NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_email_log_user (user_id),
  CONSTRAINT fk_email_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- LIVE ACTIVITY (feeds the dashboard's "Live Activity" list directly —
-- avoids joining across transactions/referrals/check_ins on every load)
-- ------------------------------------------------------------
CREATE TABLE activity_feed (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  type         VARCHAR(50)     NOT NULL COMMENT 'referral, check_in, task, spin, withdrawal, top_up',
  description  VARCHAR(255)    NOT NULL,
  amount_kobo  BIGINT          NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_activity_feed_user (user_id, created_at),
  CONSTRAINT fk_activity_feed_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
