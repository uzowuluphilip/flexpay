# FlexPay Project Audit

Generated on 2026-08-26 from the current workspace and live MySQL database. This is an inspection report, not a statement based on previous session notes.

## Audit Method

Commands actually run:

```powershell
Get-ChildItem -Force
Get-ChildItem src -Recurse -File
Get-ChildItem backend -Recurse -File | Where-Object { $_.FullName -notmatch '\\vendor\\' }
Select-String -Path src/App.jsx -Pattern '<Route|path='
Select-String -Path backend/public/index.php,backend/routes/api.php -Pattern '\$router->add|add\('
Select-String -Path (all non-node_modules/non-vendor/non-dist files) -Pattern 'process\.env|import\.meta\.env|\$_ENV|getenv\('
Select-String -Path (all non-node_modules/non-vendor/non-dist files) -Pattern 'TODO|coming soon|placeholder|not built|not implemented|deferred|later|not configured'
```

The `rg` command was unavailable on this Windows PATH, so the equivalent PowerShell commands above were used. The recursive backend source listing intentionally excludes `backend/vendor`; that directory is third-party Composer dependency code, not project source.

Live database commands actually run:

```php
SHOW TABLES
DESCRIBE `table_name`       // executed for every table returned by SHOW TABLES
```

They were executed through `backend/vendor/autoload.php`, `Dotenv`, and `FlexPay\Config\Database` using PDO against the configured `flexpay` database. A temporary comparison script compared live table and field names with `backend/database/schema.sql` and returned:

```text
LIVE_ONLY_TABLES=[]
SCHEMA_ONLY_TABLES=[]
```

## Current File Structure

### Project root

```text
.qodo/
backend/
dist/
node_modules/
public/
src/
.env
.env.example
.gitignore
ADMIN_VERIFICATION_REPORT.md
BUTTON_STATES_EVIDENCE.md
CHECKIN_EVIDENCE_REPORT.md
CLAUDE.md
color_report_temp.py
eslint.config.js
flexpay-brand-tokens.css
flexpay-icon.svg
flexpay-logo.svg
index.html
package-lock.json
package.json
postcss.config.js
README.md
register_test.json
tailwind.config.js
test-toggle.js
vite.config.js
```

### `src/`

```text
src/App.css
src/App.jsx
src/index.css
src/main.jsx
src/assets/hero.png
src/assets/react.svg
src/assets/brand/flexpay-brand-tokens.css
src/assets/brand/flexpay-icon.svg
src/assets/brand/flexpay-logo.svg
src/assets/brand/nigerian-coat-of-arms-hBXqVrjF.png
src/assets/brand/telegram.png
src/components/NotificationPrompt.jsx
src/components/RouteTransitionLayout.jsx
src/components/WithdrawalActivityToast.jsx
src/components/admin/AdminProtectedRoute.jsx
src/components/auth/ForgotPasswordForm.jsx
src/components/auth/PasswordStrengthMeter.jsx
src/components/auth/ResetPasswordForm.jsx
src/components/auth/SignInForm.jsx
src/components/auth/SignUpForm.jsx
src/components/auth/VerifyEmailNotice.jsx
src/components/dashboard/BottomNav.jsx
src/components/dashboard/CurrencyDisplayToggle.jsx
src/components/dashboard/ProtectedRoute.jsx
src/components/dashboard/QuickLinksMenu.jsx
src/components/dashboard/QuickMenu.jsx
src/components/dashboard/ReferralProgram.jsx
src/components/landing/FAQ.jsx
src/components/landing/FeaturesGrid.jsx
src/components/landing/FinalCTA.jsx
src/components/landing/Footer.jsx
src/components/landing/Hero.jsx
src/components/landing/HeroCoin.jsx
src/components/landing/HowItWorks.jsx
src/components/landing/Nav.jsx
src/components/landing/StatsStrip.jsx
src/components/landing/TrustSection.jsx
src/hooks/useAuth.js
src/layouts/AuthLayout.jsx
src/lib/AdminAuthContext.jsx
src/lib/authContext.jsx
src/lib/currency.js
src/lib/api/admin.js
src/lib/api/auth.js
src/lib/api/notifications.js
src/lib/api/tasks.js
src/lib/api/wallet.js
src/pages/LandingPage.jsx
src/pages/admin/AchievementsPage.jsx
src/pages/admin/DashboardPage.jsx
src/pages/admin/LoginPage.jsx
src/pages/admin/TasksPage.jsx
src/pages/admin/TopUpsPage.jsx
src/pages/admin/UsersPage.jsx
src/pages/admin/WithdrawalsPage.jsx
src/pages/auth/ForgotPasswordPage.jsx
src/pages/auth/LoginPage.jsx
src/pages/auth/OnboardingPage.jsx
src/pages/auth/RegisterPage.jsx
src/pages/auth/ResetPasswordPage.jsx
src/pages/auth/VerifyEmailPage.jsx
src/pages/dashboard/AboutPage.jsx
src/pages/dashboard/AchievementsPage.jsx
src/pages/dashboard/CommunityPage.jsx
src/pages/dashboard/DailyTasksPage.jsx
src/pages/dashboard/HistoryPage.jsx
src/pages/dashboard/HomePage.jsx
src/pages/dashboard/InvestPage.jsx
src/pages/dashboard/PlaceholderPage.jsx
src/pages/dashboard/ProfilePage.jsx
src/pages/dashboard/ReferralPage.jsx
src/pages/dashboard/SpinPage.jsx
src/pages/dashboard/StatusPage.jsx
src/pages/dashboard/SupportPage.jsx
src/pages/dashboard/TopUpPage.jsx
src/pages/dashboard/UpgradePage.jsx
src/pages/dashboard/WithdrawPage.jsx
```

### `backend/` project files

```text
backend/.env
backend/.env.example
backend/action1_balance_adjust.php
backend/action2_approve_withdrawal.php
backend/action3_reject_withdrawal.php
backend/action4_create_task.php
backend/check_balance.php
backend/check_tasks_api.php
backend/check_tasks_api_public.php
backend/check_wallets_schema.php
backend/composer.json
backend/composer.lock
backend/diagnose_balance_bug.php
backend/diagnose_user1.php
backend/live_wallet_seed.php
backend/run_wallet_withdraw_case.php
backend/schema_check.php
backend/temp_request_old.php
backend/test-admin-complete.php
backend/test-admin-full.php
backend/test-admin-login.php
backend/test-list-users.php
backend/test_checkin_evidence.js
backend/test_checkin_evidence.php
backend/test_checkin_evidence.ps1
backend/test_tasks_api.php
backend/verify_both_fixes.php
backend/verify_six_step_local.php
backend/verify_task22.php
backend/verify_wallet_withdraw_guard.php
backend/cache/exchange-rate.json
backend/database/schema.sql
backend/database/infinityfree-migration.sql
backend/public/index.php
backend/public/.htaccess
backend/INFINITYFREE_DEPLOY.md
backend/public/probe.php
backend/public/raw_router.php
backend/public/router.php
backend/public/router_debug.php
backend/routes/api.php
backend/scripts/create-admin.php
backend/src/Config/Database.php
backend/src/Controllers/AdminAuthController.php
backend/src/Controllers/AdminController.php
backend/src/Controllers/AuthController.php
backend/src/Controllers/NotificationController.php
backend/src/Controllers/TasksController.php
backend/src/Controllers/WalletController.php
backend/src/Http/Request.php
backend/src/Http/Response.php
backend/src/Http/Router.php
backend/src/Repositories/AdminSessionRepository.php
backend/src/Repositories/AdminUserRepository.php
backend/src/Repositories/PushSubscriptionRepository.php
backend/src/Repositories/ReferralRepository.php
backend/src/Repositories/SessionRepository.php
backend/src/Repositories/UserRepository.php
backend/src/Repositories/WalletRepository.php
backend/src/Services/NotificationService.php
backend/src/Services/PasswordService.php
backend/src/Services/TokenService.php
backend/storage/topup-receipts/149def55aa3ea572b7ce4ff6eccb5f2e87b7a9874d5227bb.pdf
backend/storage/topup-receipts/400f6255eeeef5255827d701435a6f8d159a0898ea2f3577.pdf
backend/storage/topup-receipts/5de6d7b215d7ed3d28bf0f0601f04e5926449788fe13ccd2.pdf
backend/storage/topup-receipts/8631d59e225d2c109e35fe392c02f3c6835d4ca9184a39cc.pdf
backend/storage/topup-receipts/9894a83fd8989f0358536b49554b1ecfc04d7a5af9f504d4.pdf
backend/storage/topup-receipts/d6dbd60faac059bae4749adc05518d6ff449c87ccd9a98af.png
backend/storage/topup-receipts/f22ff0fd8589d0411115c33074740f779aa430b8ed807227.png
backend/tmp/add_task_to_referral_account.php
backend/tmp/balance_chain_http_check.php
backend/tmp/find_status_mixed_account.php
backend/tmp/latest_topup_evidence.php
backend/tmp/list_topup_test_users.php
backend/tmp/live_balance_sequence.php
backend/tmp/migrate_real_spin.php
backend/tmp/migrate_topup_receipts.php
backend/tmp/prepare_status_empty_user.php
backend/tmp/seed_real_achievements.php
backend/tmp/status_activity_types.php
backend/tmp/verify_achievements_http.php
backend/tmp/verify_fresh_achievement_crossing.php
backend/tmp/verify_real_spin_http.php
backend/tmp/verify_referral_milestone_count.php
backend/tmp/verify_topup_admin_http.php
backend/tmp/verify_topup_balance_chain.php
backend/tmp/verify_topup_http.php
backend/tmp/verify_withdraw_progress_and_submit.php
backend/vendor/ (Composer dependencies; not expanded in the project-source listing)
```

## Live Database Schema

The live `SHOW TABLES` query returned 24 tables:

```text
achievements
activity_feed
admin_audit_log
admin_sessions
admin_users
check_ins
daily_claims
email_log
email_verifications
fund_locks
password_resets
push_subscriptions
referral_milestone_claims
referrals
sessions
spins
task_completions
tasks
topup_receipts
transactions
user_achievements
users
wallets
withdrawal_requests
```

The following is the real `DESCRIBE` output, compacted as `column | type | null | key | default | extra`.

```text
--- achievements ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
code | varchar(50) | NO | UNI | NULL |
title | varchar(120) | NO | | NULL |
description | varchar(255) | YES | | NULL |
icon | varchar(50) | YES | | NULL |
target_count | int(10) unsigned | NO | | 1 |
progress_key | varchar(50) | NO | | referrals_active |

--- activity_feed ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
user_id | bigint(20) unsigned | NO | MUL | NULL |
type | varchar(50) | NO | | NULL |
description | varchar(255) | NO | | NULL |
amount_kobo | bigint(20) | YES | | NULL |
created_at | datetime | NO | | current_timestamp() |

--- admin_audit_log ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
admin_id | bigint(20) unsigned | NO | MUL | NULL |
action | varchar(100) | NO | | NULL |
target_type | varchar(50) | NO | | NULL |
target_id | bigint(20) unsigned | NO | | NULL |
meta | longtext | YES | | NULL |
created_at | datetime | NO | | current_timestamp() |

--- admin_sessions ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
admin_id | bigint(20) unsigned | NO | MUL | NULL |
token_hash | varchar(255) | NO | | NULL |
user_agent | varchar(255) | YES | | NULL |
ip_address | varchar(45) | YES | | NULL |
expires_at | datetime | NO | | NULL |
created_at | datetime | NO | | current_timestamp() |

--- admin_users ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
full_name | varchar(120) | NO | | NULL |
email | varchar(190) | NO | UNI | NULL |
password_hash | varchar(255) | NO | | NULL |
role | enum('super_admin','support','finance') | NO | | support |
last_login_at | datetime | YES | | NULL |
created_at | datetime | NO | | current_timestamp() |

--- check_ins ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
user_id | bigint(20) unsigned | NO | MUL | NULL |
check_in_date | date | NO | | NULL |
streak_day | tinyint(3) unsigned | NO | | NULL |
reward_kobo | bigint(20) | NO | | 0 |
created_at | datetime | NO | | current_timestamp() |

--- daily_claims ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
user_id | bigint(20) unsigned | NO | MUL | NULL |
claim_date | date | NO | | NULL |
claims_count | smallint(5) unsigned | NO | | 0 |
claims_limit | smallint(5) unsigned | NO | | 30 |
updated_at | datetime | NO | | current_timestamp() | on update current_timestamp()

--- email_log ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
user_id | bigint(20) unsigned | YES | MUL | NULL |
type | enum('email_verification','password_reset','withdrawal_update','referral_bonus','other') | NO | | NULL |
recipient | varchar(190) | NO | | NULL |
resend_id | varchar(100) | YES | | NULL |
status | enum('sent','failed','logged_not_sent') | NO | | sent |
subject | varchar(255) | YES | | NULL |
content_text | text | YES | | NULL |
link_url | varchar(512) | YES | | NULL |
created_at | datetime | NO | | current_timestamp() |

--- email_verifications ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
user_id | bigint(20) unsigned | NO | MUL | NULL |
token_hash | varchar(255) | NO | | NULL |
expires_at | datetime | NO | | NULL |
verified_at | datetime | YES | | NULL |
created_at | datetime | NO | | current_timestamp() |

--- fund_locks ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
user_id | bigint(20) unsigned | NO | MUL | NULL |
amount_kobo | bigint(20) unsigned | NO | | NULL |
bonus_kobo | bigint(20) unsigned | NO | | NULL |
locked_at | datetime | NO | | current_timestamp() |
unlocks_at | datetime | NO | | NULL |
status | enum('active','completed','cancelled') | NO | | active |
released_at | datetime | YES | | NULL |

--- password_resets ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
user_id | bigint(20) unsigned | NO | MUL | NULL |
token_hash | varchar(255) | NO | | NULL |
expires_at | datetime | NO | | NULL |
used_at | datetime | YES | | NULL |
created_at | datetime | NO | | current_timestamp() |

--- push_subscriptions ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
user_id | bigint(20) unsigned | NO | MUL | NULL |
endpoint | varchar(500) | NO | UNI | NULL |
p256dh_key | varchar(255) | NO | | NULL |
auth_key | varchar(255) | NO | | NULL |
created_at | datetime | NO | | current_timestamp() |

--- referral_milestone_claims ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
user_id | bigint(20) unsigned | NO | MUL | NULL |
milestone | smallint(5) unsigned | NO | | NULL |
reward_kobo | bigint(20) unsigned | NO | | NULL |
claimed_at | datetime | NO | | current_timestamp() |

--- referrals ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
referrer_user_id | bigint(20) unsigned | NO | MUL | NULL |
referred_user_id | bigint(20) unsigned | NO | UNI | NULL |
status | enum('pending','active') | NO | | pending |
bonus_amount_kobo | bigint(20) | NO | | 0 |
created_at | datetime | NO | | current_timestamp() |

--- sessions ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
user_id | bigint(20) unsigned | NO | MUL | NULL |
token_hash | varchar(255) | NO | | NULL |
user_agent | varchar(255) | YES | | NULL |
ip_address | varchar(45) | YES | | NULL |
expires_at | datetime | NO | | NULL |
created_at | datetime | NO | | current_timestamp() |

--- spins ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
user_id | bigint(20) unsigned | NO | MUL | NULL |
stake_kobo | bigint(20) unsigned | NO | | 0 |
result_kobo | bigint(20) | NO | | 0 |
outcome | enum('win','lose','try_again') | NO | | try_again |
spun_at | datetime | NO | | current_timestamp() |

--- task_completions ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
user_id | bigint(20) unsigned | NO | MUL | NULL |
task_id | bigint(20) unsigned | NO | MUL | NULL |
reward_kobo | bigint(20) | NO | | NULL |
completed_at | datetime | NO | | current_timestamp() |

--- tasks ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
title | varchar(150) | NO | | NULL |
description | varchar(500) | YES | | NULL |
reward_kobo | bigint(20) | NO | | 0 |
is_active | tinyint(1) | NO | | 1 |
created_at | datetime | NO | | current_timestamp() |

--- topup_receipts ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
user_id | bigint(20) unsigned | NO | MUL | NULL |
transaction_id | bigint(20) unsigned | NO | MUL | NULL |
file_path | varchar(255) | NO | | NULL |
status | enum('pending','approved','rejected') | NO | MUL | pending |
rejection_reason | varchar(255) | YES | | NULL |
reviewed_by_admin_id | bigint(20) unsigned | YES | | NULL |
reviewed_at | datetime | YES | | NULL |
created_at | datetime | NO | | current_timestamp() |

--- transactions ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
user_id | bigint(20) unsigned | NO | MUL | NULL |
wallet_id | bigint(20) unsigned | NO | MUL | NULL |
type | enum('top_up','welcome_bonus','withdrawal','referral_bonus','check_in_bonus','task_reward','spin_win','spin_loss','spin_try','upgrade_fee','admin_adjustment','lock_hold','lock_release') | NO | MUL | NULL |
amount_kobo | bigint(20) | NO | | NULL |
status | enum('pending','completed','failed','reversed') | NO | | completed |
reference | varchar(64) | NO | UNI | NULL |
meta | longtext | YES | | NULL |
created_at | datetime | NO | | current_timestamp() |
updated_at | datetime | NO | | current_timestamp() | on update current_timestamp()

--- user_achievements ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
user_id | bigint(20) unsigned | NO | MUL | NULL |
achievement_id | bigint(20) unsigned | NO | MUL | NULL |
unlocked_at | datetime | NO | | current_timestamp() |

--- users ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
full_name | varchar(120) | NO | | NULL |
email | varchar(190) | NO | UNI | NULL |
password_hash | varchar(255) | NO | | NULL |
referral_code | varchar(20) | NO | UNI | NULL |
referred_by_user_id | bigint(20) unsigned | YES | MUL | NULL |
email_verified_at | datetime | YES | | NULL |
status | enum('active','suspended','banned') | NO | | active |
last_login_at | datetime | YES | | NULL |
created_at | datetime | NO | | current_timestamp() |
updated_at | datetime | NO | | current_timestamp() | on update current_timestamp()

--- wallets ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
user_id | bigint(20) unsigned | NO | UNI | NULL |
balance_kobo | bigint(20) | NO | | 0 |
currency | char(3) | NO | | NGN |
created_at | datetime | NO | | current_timestamp() |
updated_at | datetime | NO | | current_timestamp() | on update current_timestamp()

--- withdrawal_requests ---
id | bigint(20) unsigned | NO | PRI | NULL | auto_increment
user_id | bigint(20) unsigned | NO | MUL | NULL |
transaction_id | bigint(20) unsigned | YES | MUL | NULL |
amount_kobo | bigint(20) | NO | | NULL |
bank_name | varchar(100) | NO | | NULL |
account_number | varchar(20) | NO | | NULL |
account_name | varchar(120) | NO | | NULL |
status | enum('pending','approved','rejected','paid') | NO | MUL | pending |
reviewed_by_admin_id | bigint(20) unsigned | YES | | NULL |
reviewed_at | datetime | YES | | NULL |
rejection_reason | varchar(255) | YES | | NULL |
created_at | datetime | NO | | current_timestamp() |
```

### Schema drift result

- Live table set versus `backend/database/schema.sql`: no table-name drift.
- Live field names versus `backend/database/schema.sql`: no field-name drift.
- The live `daily_claims.claims_limit` default is `30`, while the current `schema.sql` and `infinityfree-migration.sql` define it as `1`; application code also enforces one claim per day and inserts new rows with limit `1`. This is live-database drift that requires an explicit migration on the deployed database.
- Column definitions were inspected from the live database; the comparison script checked table and field names, not byte-for-byte DDL formatting or every index/constraint expression.

## Frontend Routes

Extracted from `src/App.jsx` using `Select-String`:

```text
/                         LandingPage                         public
/login                    LoginPage                           public
/register                 RegisterPage                        public
/onboarding               OnboardingPage                      protected
/home                     HomePage                            protected
/about                    AboutPage                           protected
/invest                   InvestPage                          protected
/referrals                ReferralPage                        protected
/profile                  ProfilePage                         protected
/support                  SupportPage                         protected
/community                CommunityPage                       protected
/leaders                  PlaceholderPage                     protected
/transactions             PlaceholderPage                     protected
/withdraw                 WithdrawPage                        protected
/top-up                   TopUpPage                           protected
/upgrade                  UpgradePage                         protected
/tasks                    DailyTasksPage                      protected
/daily-tasks              DailyTasksPage                      protected
/spin                     SpinPage                            protected
/history                  HistoryPage                         protected
/status                   StatusPage                          protected
/dev/history              HistoryPage                         unguarded development route
/achievements             AchievementsPage                     protected
/admin/login              AdminLoginPage                       public
/admin                    AdminDashboard                       admin-protected
/admin/users              AdminUsersPage                       admin-protected
/admin/withdrawals        AdminWithdrawalsPage                 admin-protected
/admin/topups             AdminTopUpsPage                      admin-protected
/admin/tasks              AdminTasksPage                       admin-protected
/admin/achievements       AdminAchievementsPage                 admin-protected
/*                        Navigate to /                       fallback
```

## Backend Endpoints

Extracted from `backend/public/index.php` using `Select-String`:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
GET  /api/wallet/summary
GET  /api/wallet/withdraw-progress
GET  /api/exchange-rate
GET  /api/wallet/checkin-status
POST /api/wallet/checkin
POST /api/wallet/claim-reward
GET  /api/wallet/achievements
GET  /api/wallet/activity
POST /api/wallet/withdraw
GET  /api/wallet/topup-config
POST /api/wallet/topup/submit-receipt
GET  /api/referrals/info
POST /api/invest/lock
GET  /api/invest/locks
GET  /api/tasks
POST /api/tasks/:id/verify
POST /api/spin/play
POST /api/notifications/subscribe
POST /api/notifications/unsubscribe
POST /api/admin/login
POST /api/admin/logout
GET  /api/admin/me
GET  /api/admin/overview
GET  /api/admin/users
GET  /api/admin/users/:id
POST /api/admin/users/:id/suspend
POST /api/admin/users/:id/reactivate
POST /api/admin/users/:id/adjust-balance
GET  /api/admin/withdrawals
POST /api/admin/withdrawals/:id/approve
POST /api/admin/withdrawals/:id/reject
GET  /api/admin/topups
POST /api/admin/topups/:id/approve
POST /api/admin/topups/:id/reject
GET  /api/admin/topups/:id/receipt
GET  /api/admin/tasks
POST /api/admin/tasks
PUT  /api/admin/tasks/:id
DELETE /api/admin/tasks/:id
GET  /api/admin/achievements
POST /api/admin/achievements
```

## Environment Variables

Environment access was searched across current source, excluding dependencies/build output. No `process.env` references were found. The actual references are `import.meta.env`, PHP `$_ENV`, and PHP `getenv()`.

| Variable | Referenced by | Purpose | In `.env.example`? |
|---|---|---|---|
| `VITE_API_URL` | frontend API clients and admin auth context | Backend API base URL; defaults to `http://localhost:8000` | yes, root example |
| `VITE_VAPID_PUBLIC_KEY` | `NotificationPrompt.jsx` | Browser push public key | yes, root example |
| `FRONTEND_URL` | backend router, auth links, referral links | CORS allow-origin and generated frontend links | yes, backend example |
| `ALLOWED_ORIGINS` | `backend/public/index.php` | Comma-separated exact CORS origin allowlist for the frontend | yes, backend example |
| `DB_HOST` | `Config/Database.php` | MySQL host | yes, backend example |
| `DB_NAME` | `Config/Database.php` | MySQL database name | yes, backend example |
| `DB_USER` | `Config/Database.php` | MySQL user | yes, backend example |
| `DB_PASSWORD` | `Config/Database.php` | MySQL password | yes, backend example |
| `APP_ENV` | backend configuration and test code via `getenv()` | Application environment | yes, backend example |
| `VAPID_PUBLIC_KEY` | `NotificationService.php` | Server-side push public key | yes, backend example |
| `VAPID_PRIVATE_KEY` | `NotificationService.php` | Server-side push private key | yes, backend example |
| `VAPID_SUBJECT` | `NotificationService.php` | Web push contact subject | yes, backend example |
| `TOPUP_BANK_NAME` | `WalletController.php` | Shared manual payment bank name | yes, backend example |
| `TOPUP_ACCOUNT_NUMBER` | `WalletController.php` | Shared manual payment account number | yes, backend example |
| `TOPUP_ACCOUNT_NAME` | `WalletController.php` | Shared manual payment account name | yes, backend example |
| `TEST_TOKEN` | `backend/action3_reject_withdrawal.php` | Optional test-script bearer token | no |

Cross-check findings:

- Root `.env.example` contains `VITE_API_URL` and `VITE_VAPID_PUBLIC_KEY`.
- Backend `.env.example` contains the backend variables, including `APP_ENV` and `ALLOWED_ORIGINS`.
- Current `backend/.env` has the local database, frontend URL, email, push, and payment account settings; secret values are intentionally not reproduced here.
- `backend/public/.htaccess` provides the Apache front-controller rewrite needed when `backend/public` is the document root.
- `backend/INFINITYFREE_DEPLOY.md` documents the InfinityFree upload, database import, env, and CORS verification process.
- The supplied InfinityFree backend domain is `https://flexpay.kesug.com`; it is now the root frontend environment template's API URL and the deployment guide's API URL.
- `TEST_TOKEN` is test-only and has no example entry.

## Feature Status

Status is based on current source inspection and the real HTTP/database checks already run during this audit period. A build alone is not treated as functional verification.

| Feature | Current status | Evidence and limits |
|---|---|---|
| Auth | Real and database-wired | Auth controller, users, password hashes, separate user sessions, login/logout/me routes. Real registration/login flows have been exercised. |
| Email verification | Removed | New accounts are marked verified during registration. Email verification and password-reset delivery are not part of the current release. Legacy email tables may remain in existing databases but are unused. |
| Wallet and balances | Real and database-wired | `transactions` is the source for balance calculation; wallet balance is synchronized. Amounts are integer kobo. |
| Daily check-in | Real and database-wired | `/api/wallet/checkin` writes `check_ins`, `check_in_bonus` transactions, activity rows, and synchronizes balance. All seven days are currently flat ₦500. A previous PHP/MySQL date mismatch was fixed by using MySQL `CURDATE()` for streak calculations. |
| Daily claims | Real and database-wired | `/api/wallet/claim-reward` writes `daily_claims`, `task_reward`, activity rows, and synchronizes balance. Current policy is one claim per database day at ₦4,000. Live HTTP verification returned ₦4,000, rejected a second same-day claim with HTTP 400, and recorded one 400,000-kobo transaction. Schema default still says 30, as noted above. |
| Tasks | Real but mixed data source | `TasksController` lists/verifies tasks and writes task completion/reward transactions. `src/lib/api/tasks.js` also contains fallback/static task definitions; exact runtime behavior depends on API success. |
| Referrals | Real and database-wired | Registration records pending referrals; first real check-in/task action activates them and credits 1,500,000 kobo (₦15,000), with activity and notification. Existing historical transactions remain at their original amounts. |
| Referral milestones | Real and database-wired | Milestone claims are stored in `referral_milestone_claims`, protected against repeated claims, and create transactions/activity. |
| Admin panel | Real and database-wired | Separate admin users/sessions, admin routes, user controls, withdrawal/top-up review, tasks, achievements, and audit log. Admin and user bearer systems are separate. Functional admin login/API checks exist in the repository. |
| Manual top-up and receipt review | Real and database-wired | Top-up config, multipart receipt upload, pending transaction, receipt storage, admin approval/rejection, fee calculation, balance sync, and audit logging exist. The configured account is shared by Add Balance and Upgrade display. |
| Referral Upgrade UI/payment | Partially stubbed | Upgrade page is real interactive UI with four tiers, loading stage, notice, account details, receipt validation, and local submitted state. There is no backend upgrade purchase/receipt endpoint, no upgrade tier persistence, and the submit action does not create an upgrade request. It must not be described as completed billing. |
| Achievements | Real but seed/data dependent | API computes progress from live data and writes `user_achievements`/activity when thresholds are met. Admin can list/create achievements. Seed/migration scripts exist. |
| Withdraw unlock panel | Real progress API, real withdrawal guard | `/api/wallet/withdraw-progress` counts tasks/claims/referrals; withdraw endpoint validates available balance and writes withdrawal transaction/request. The UI displays the progress requirements. Admin approval/rejection is wired. |
| Push notifications | Partially real | Browser prompt and subscribe/unsubscribe routes, subscription table, VAPID server service, and notification calls exist. Delivery depends on valid configured keys and an actual subscribed browser; not every push delivery was independently verified in this audit. |
| Spin Arena | Real server outcome, partially static UI | `/api/spin/play` validates stake and balance, randomly returns win/try_again/lose, writes `spins`, transactions, activity, and syncs wallet. Live HTTP tests confirmed win adds payout, Try Again leaves balance unchanged, and Lose deducts stake. UI counters, leaderboards, and history tabs remain static/coming-soon. |
| Currency toggle | Real display-only behavior | Frontend stores display preference and calls exchange-rate API; display conversion does not alter Naira backend values. It is not a balance currency conversion. |
| Email-verification flag | Removed | `REQUIRE_EMAIL_VERIFICATION` is no longer read by the application. |
| Payment Status | Real activity feed, limited to positive credits | `/status` calls `/api/wallet/activity`, filters positive credit rows, and displays completed labels. Live HTTP checks showed ₦500 check-in, ₦4,000 claim, and ₦15,000 referral activity. It intentionally hides welcome bonus and all debits. |

## Decisions or Work Not Reflected in `CLAUDE.md`

Compared with the current `CLAUDE.md`, the following current implementation details are not fully documented there:

- The new `/upgrade` Referral Upgrades UI and its four tiers/prices are not documented.
- The upgrade flow is presentation-only: its receipt submit is local and has no backend upgrade-payment/review endpoint or tier persistence.
- The upgrade flow uses a shared payment account from `TOPUP_*` variables and the Nigerian coat-of-arms asset.
- Add Balance and upgrade instructions now use the configured account: Divine Kelechi Christopher, 5289340156, Moniepoint MFB. The account values are not reproduced in `CLAUDE.md`.
- The Payment Status page and its positive-credit-only filtering are not documented.
- Spin Arena server outcome mechanics are not documented: stakes are ₦25,000/₦50,000/₦100,000; wins return 2x stake, Try Again returns zero, losses deduct stake; UI history/leaderboard/counters are incomplete.
- The one-claim-per-day ₦4,000 policy is documented now, but the live database still has `daily_claims.claims_limit DEFAULT 30`; `schema.sql` and the new migration export use `DEFAULT 1`. Apply the migration to live databases.
- InfinityFree deployment instructions, production CORS allowlisting, and the Apache rewrite file are now present but were not in the earlier audit.
- The MySQL/PHP calendar consistency fix for check-in streaks is not documented.
- `APP_ENV` and test-only `TEST_TOKEN` environment references are not fully represented in the example configuration documentation.
- The live code has a `PlaceholderPage` and several static/deferred features not listed in the project instructions.

## Known Open Issues and Incomplete Items

Collected from current TODO/placeholder/deferred markers and direct source inspection:

1. `src/App.jsx` still routes `/leaders` and `/transactions` to `PlaceholderPage`.
2. `src/pages/dashboard/SpinPage.jsx` renders static `Spins`, `Wins`, and `Win Rate` values; Leaders and History tabs say they are coming soon.
3. `src/pages/dashboard/ProfilePage.jsx` contains a comment that the real profile upload call will be added once a backend endpoint exists.
4. Referral registration contains a stale TODO comment saying referral credit is a future step, although activation is implemented in `ReferralRepository` and called after a real check-in/task action.
5. Upgrade account-number generation is a simulated two-second loading state; no dynamic account-generation service exists.
6. Upgrade receipt submission validates locally and shows a local submitted state; it does not call a backend upgrade request/review endpoint.
7. `TOPUP_BANK_NAME`, `TOPUP_ACCOUNT_NUMBER`, and `TOPUP_ACCOUNT_NAME` must be configured in each deployed backend environment; `.env.example` remains blank by design.
8. The live `daily_claims.claims_limit` default remains 30 while the current schema/export and application policy use 1; apply the explicit migration before relying on the database default.
9. Push delivery is dependent on valid VAPID configuration and real browser subscriptions; delivery was not fully end-to-end verified here.
10. The frontend build reports a bundle-size warning for a minified chunk over 500 kB; the build still succeeds.
11. The audit comparison checked table/field names, not every live index, foreign-key expression, or exact DDL clause byte-for-byte.

## Verification Snapshot

Commands/checks completed while generating this report:

- Live PDO `SHOW TABLES` and `DESCRIBE` for all 24 tables: completed.
- Live/schema table and field comparison: no table or field-name differences; the live `daily_claims.claims_limit` default differs from the current schema default and requires migration.
- Live CORS preflight: allowed origin returned `http://localhost:5175`; unlisted origin returned no `Access-Control-Allow-Origin` header.
- InfinityFree migration export: 24 `CREATE TABLE` declarations; no data or credentials.
- Registered frontend/backend route extraction: completed.
- Environment-reference search and `.env.example` cross-check: completed.
- `php -l backend/src/Controllers/WalletController.php`: passed during current feature work.
- `npm run build`: passed during current feature work; Vite emitted only the existing large-chunk warning.
- Real browser/API checks for check-in, claims, referrals, Payment Status, Spin Arena outcomes, Upgrade flow, and shared payment account were previously run against the current local servers. Those checks are summarized above; this document does not replace a fresh production deployment check.
