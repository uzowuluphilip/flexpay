-- Add approved referral payout tracking to an existing FlexPay database.
-- Run once in MySQL/phpMyAdmin before deploying the updated backend.

ALTER TABLE users
  ADD COLUMN referral_tier VARCHAR(20) NOT NULL DEFAULT 'STARTER' AFTER referred_by_user_id,
  ADD COLUMN referral_rate_kobo BIGINT UNSIGNED NOT NULL DEFAULT 1500000 AFTER referral_tier;

UPDATE users
SET referral_tier = 'STARTER', referral_rate_kobo = 1500000
WHERE referral_tier IS NULL OR referral_rate_kobo IS NULL OR referral_rate_kobo = 0;
