# FlexPay Railway Deployment Audit Report

**Date:** 2026-08-31  
**Current Deployment State:** Migration from InfinityFree to Railway in progress  
**Frontend:** Vercel (https://flexpay-theta.vercel.app)  
**Backend:** Railway (https://flexpay-production-348e.up.railway.app)  
**Database:** Railway  

---

## CRITICAL ISSUES FOUND

### 1. FRONTEND ENVIRONMENT CONFIGURATION

#### File: `.env`
- **Line 1:** `VITE_API_URL=/flexpay/backend/public`
- **Current State:** WRONG - Still pointing to old InfinityFree subdirectory path
- **Should Be:** `VITE_API_URL=https://flexpay-production-348e.up.railway.app`
- **Impact:** HIGH - All frontend API calls are routing to wrong domain
- **Used By:** All 6 API modules (auth.js, wallet.js, tasks.js, notifications.js, admin.js, AdminAuthContext.jsx)

#### File: `.env.example`
- **Line 1:** `VITE_API_URL=https://flexpay.kesug.com`
- **Current State:** WRONG - Points to old InfinityFree domain
- **Should Be:** `VITE_API_URL=https://flexpay-production-348e.up.railway.app`
- **Impact:** MEDIUM - Documentation/template still shows old configuration

---

### 2. BACKEND ENVIRONMENT CONFIGURATION

#### File: `backend/.env`
- **Line 1:** `DB_HOST=fdb1028.awardspace.net`
- **Current State:** WRONG - Points to Awardspace (NOT Railway)
- **Should Be:** Should match Railway database host (check Railway dashboard)
- **Impact:** CRITICAL - Database connection will fail if not updated
- **Note:** User states "database is now running on Railway" but .env not updated

- **Line 6:** `VITE_API_URL=/flexpay/backend/public`
- **Current State:** WRONG - Irrelevant in backend context, frontend config leaked here
- **Should Be:** Should be removed or set to `https://flexpay-production-348e.up.railway.app`
- **Impact:** LOW - Probably not used, but confusing

#### File: `backend/.env.example`
- **Line 1:** `DB_HOST=127.0.0.1`
- **Line 2:** `DB_NAME=flexpay`
- **Line 3:** `DB_USER=root`
- **Line 4:** `DB_PASSWORD=`
- **Line 5:** `FRONTEND_URL=http://localhost:5173`
- **Current State:** WRONG - Localhost defaults won't work in production
- **Should Be:**
  - `DB_HOST=[Railway DB host]`
  - `DB_NAME=[Railway DB name]`
  - `DB_USER=[Railway DB user]`
  - `DB_PASSWORD=[Railway DB password]`
  - `FRONTEND_URL=https://flexpay-theta.vercel.app`
- **Impact:** HIGH - Template outdated for production deployment

---

### 3. BACKEND CORS CONFIGURATION

#### File: `backend/public/index.php`
- **Lines 5-8:** Hardcoded `$allowedOrigins` array
  ```php
  $allowedOrigins = [
      'https://flexpay-theta.vercel.app',
      'http://localhost:5173',
      'http://localhost',
  ];
  ```
- **Current State:** PARTIALLY CORRECT - Has Vercel domain but doesn't validate against env
- **Should Be:** Check `ALLOWED_ORIGINS` env variable or add Railway backend domain for any cross-origin requests
- **Impact:** LOW (for this specific scenario) - Vercel frontend is in allowed list
- **Note:** The code does NOT read from `ALLOWED_ORIGINS` env var, only hardcoded array

#### File: `backend/public/.htaccess`
- **Line 6:** `Header always set Access-Control-Allow-Origin "https://flexpay-theta.vercel.app"`
- **Current State:** REDUNDANT - CORS headers also set in PHP code
- **Impact:** LOW - Doesn't break anything, but .htaccess might not be needed

---

### 4. BACKEND CONTROLLER - URL GENERATION

#### File: `backend/src/Controllers/WalletController.php`
- **Line 405:** `$baseUrl = $_ENV['FRONTEND_URL'] ?? 'http://localhost:5173';`
- **Used In:** `referralInfo()` method - generates referral link
- **Current State:** WRONG - Defaults to localhost
- **Should Be:** `FRONTEND_URL=https://flexpay-theta.vercel.app`
- **Impact:** MEDIUM - Referral links will point to localhost if `FRONTEND_URL` env not set
- **Generated URL:** Will be `http://localhost:5173/register?ref=[code]` instead of Vercel URL
- **Status Check:** Backend .env must have `FRONTEND_URL=https://flexpay-theta.vercel.app` set

#### File: `backend/src/Controllers/WalletController.php`
- **Line 159:** `file_get_contents('https://open.er-api.com/v6/latest/USD', ...)`
- **Current State:** CORRECT - External API URL for exchange rates
- **Impact:** NONE - External API, not project-specific

---

### 5. CORS ORIGIN VALIDATION - NOT READING ENV

#### Issue Identified:
The backend code does NOT read `ALLOWED_ORIGINS` from environment variable. It uses hardcoded array.

- **File:** `backend/public/index.php` (lines 5-15)
- **Problem:** If you add `ALLOWED_ORIGINS` to Railway env vars, the code won't use it
- **Consequence:** To add new origins (like Railway backend domain for cross-origin calls), you must edit the PHP file
- **Recommendation:** Modify code to check env variable OR document that .env changes won't affect CORS

---

### 6. FRONTEND API BASE URL FALLBACK

#### Files: 
- `src/lib/api/auth.js` (line 1)
- `src/lib/api/wallet.js` (line 1)
- `src/lib/api/tasks.js` (line 1)
- `src/lib/api/notifications.js` (line 1)
- `src/lib/api/admin.js` (line 1)
- `src/lib/AdminAuthContext.jsx` (line 18)

#### Code Pattern:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || '/flexpay/backend/public'
```

- **Current State:** WRONG - If `VITE_API_URL` is not set, falls back to old InfinityFree path
- **Consequence:** If `.env` is misconfigured, will try to call `/flexpay/backend/public/api/auth/login` (relative path that won't work)
- **Should Be:** Fallback should probably be empty string or absolute path to production
- **Recommendation:** Add validation/error logging if API_BASE_URL is misconfigured

---

### 7. TEST/VERIFICATION SCRIPTS (Should be deleted, but showing patterns)

Multiple files in `backend/` and `backend/tmp/` have hardcoded localhost URLs:
- `backend/action1_balance_adjust.php` (line 19): `http://localhost:8000/api/admin/users/1/adjust-balance`
- `backend/check_tasks_api_public.php` (line 14): `http://localhost:8000/api/tasks`
- `backend/test_checkin_evidence.php` (line 12): `$apiBase = 'http://localhost:8000'`
- `backend/tmp/verify_topup_http.php` (line 9): `$base = 'http://127.0.0.1:8000'`
- Many more in `backend/tmp/` directory

**Impact:** NONE on production (these are test files), but should be deleted for cleanliness

---

### 8. DATABASE CONNECTION CONFIGURATION

#### File: `backend/src/Config/Database.php`
- **Lines 23-26:**
```php
$host = $_SERVER['DB_HOST'] ?? $_ENV['DB_HOST'] ?? '127.0.0.1';
$port = $_SERVER['DB_PORT'] ?? $_ENV['DB_PORT'] ?? '3306';
$dbname = $_SERVER['DB_NAME'] ?? $_ENV['DB_NAME'] ?? 'flexpay';
$user = $_SERVER['DB_USER'] ?? $_ENV['DB_USER'] ?? 'root';
$password = $_SERVER['DB_PASSWORD'] ?? $_ENV['DB_PASSWORD'] ?? '';
```

- **Current State:** CORRECT STRUCTURE - Checks $_SERVER first (Railway sets env as $_SERVER), then $_ENV
- **Depends On:** Railway environment variables being set correctly
- **Verification Needed:** Confirm Railway is providing:
  - `DB_HOST`
  - `DB_PORT` (or defaults to 3306)
  - `DB_NAME`
  - `DB_USER`
  - `DB_PASSWORD`

- **Frontend Default IPs:**
  - `backend/public/migrate.php` (line 16): Uses same structure - OK
  - `backend/src/Repositories/SessionRepository.php` (line 28): Uses `'127.0.0.1'` as IP fallback for sessions - OK for production

---

## REQUEST FLOW ANALYSIS

### Feature: User Registration

**Frontend Flow:**
1. Component: `src/pages/auth/RegisterPage.jsx`
2. Calls: `auth.signUp(email, password, referralCode)`
3. API Module: `src/lib/api/auth.js`
4. Request: `POST ${API_BASE_URL}/api/auth/register`
5. Current URL:** `POST /flexpay/backend/public/api/auth/register` (WRONG)
6. **Should Be:** `POST https://flexpay-production-348e.up.railway.app/api/auth/register`

**Backend Flow:**
1. Route: `backend/public/index.php` line 46: `$router->add('POST', '/api/auth/register', [AuthController::class, 'register']);`
2. Controller: `backend/src/Controllers/AuthController.php` method `register()`
3. Database: Creates user, wallet, transaction for welcome bonus
4. Response: `{"success": true, "data": {...}}`

**Status:** BROKEN - Frontend URL is wrong

---

### Feature: User Login

**Frontend Flow:**
1. Component: `src/pages/auth/LoginPage.jsx`
2. Calls: `auth.signIn(email, password)`
3. API Module: `src/lib/api/auth.js`
4. Request: `POST ${API_BASE_URL}/api/auth/login`
5. **Current URL:** `POST /flexpay/backend/public/api/auth/login` (WRONG)
6. **Should Be:** `POST https://flexpay-production-348e.up.railway.app/api/auth/login`

**Backend Flow:**
1. Route: `backend/public/index.php` line 47
2. Controller: `backend/src/Controllers/AuthController.php` method `login()`
3. Validates credentials, creates session, returns token
4. Response: `{"success": true, "data": {"token": "...", "user": {...}}}`

**Status:** BROKEN - Frontend URL is wrong

---

### Feature: Get User Balance/Summary

**Frontend Flow:**
1. Component: `src/pages/dashboard/HomePage.jsx` (or WalletCard.jsx)
2. Calls: `wallet.getSummary()`
3. API Module: `src/lib/api/wallet.js`
4. Request: `GET ${API_BASE_URL}/api/wallet/summary`
5. **Current URL:** `GET /flexpay/backend/public/api/wallet/summary` (WRONG)
6. **Should Be:** `GET https://flexpay-production-348e.up.railway.app/api/wallet/summary`

**Backend Flow:**
1. Route: `backend/public/index.php` line 51
2. Controller: `backend/src/Controllers/WalletController.php` method `summary()`
3. Returns wallet balance and status
4. Response: `{"success": true, "data": {...}}`

**Status:** BROKEN - Frontend URL is wrong

---

### Feature: Daily Check-in

**Frontend Flow:**
1. Component: `src/pages/dashboard/CheckInCard.jsx`
2. Calls: `wallet.checkin()`
3. API Module: `src/lib/api/wallet.js`
4. Request: `POST ${API_BASE_URL}/api/wallet/checkin`
5. **Current URL:** `POST /flexpay/backend/public/api/wallet/checkin` (WRONG)
6. **Should Be:** `POST https://flexpay-production-348e.up.railway.app/api/wallet/checkin`

**Backend Flow:**
1. Route: `backend/public/index.php` line 54
2. Controller: `backend/src/Controllers/WalletController.php` method `checkin()`
3. Credits ₦500 daily bonus
4. Response: `{"success": true, "data": {...}}`

**Status:** BROKEN - Frontend URL is wrong

---

### Feature: Get Referral Link

**Frontend Flow:**
1. Component: `src/components/dashboard/ReferralProgram.jsx` lines 10-17
2. Calls: `wallet.getReferralInfo()`
3. API Module: `src/lib/api/wallet.js`
4. Request: `GET ${API_BASE_URL}/api/referrals/info`
5. **Current URL:** `GET /flexpay/backend/public/api/referrals/info` (WRONG)
6. **Should Be:** `GET https://flexpay-production-348e.up.railway.app/api/referrals/info`

**Backend Flow:**
1. Route: `backend/public/index.php` line 64
2. Controller: `backend/src/Controllers/WalletController.php` method `referralInfo()`
3. **Line 405:** Uses `$_ENV['FRONTEND_URL'] ?? 'http://localhost:5173'`
4. Generates link: `http://localhost:5173/register?ref=[code]` (if FRONTEND_URL not set)
5. Response: `{"success": true, "data": {"link": "http://localhost:5173/...", "code": "...", ...}}`

**Issues:**
- Frontend API call URL is wrong (CRITICAL)
- Backend generates localhost link if FRONTEND_URL not set (CRITICAL)

**Status:** BROKEN on both sides

---

### Feature: Withdrawal Request

**Frontend Flow:**
1. Component: `src/pages/dashboard/WithdrawPage.jsx`
2. Calls: `wallet.withdraw({amount, bankName, accountNumber, accountName})`
3. API Module: `src/lib/api/wallet.js`
4. Request: `POST ${API_BASE_URL}/api/wallet/withdraw`
5. **Current URL:** `POST /flexpay/backend/public/api/wallet/withdraw` (WRONG)
6. **Should Be:** `POST https://flexpay-production-348e.up.railway.app/api/wallet/withdraw`

**Backend Flow:**
1. Route: `backend/public/index.php` line 59
2. Controller: `backend/src/Controllers/WalletController.php` method `withdraw()`
3. Creates withdrawal request, deducts balance
4. Response: `{"success": true, "data": {...}}`

**Status:** BROKEN - Frontend URL is wrong

---

### Feature: Top-up (Manual Bank Transfer)

**Frontend Flow:**
1. Component: `src/pages/dashboard/TopUpPage.jsx`
2. Calls: `wallet.submitTopupReceipt({receipt, amount})`
3. API Module: `src/lib/api/wallet.js`
4. Request: `POST ${API_BASE_URL}/api/wallet/topup/submit-receipt`
5. **Current URL:** `POST /flexpay/backend/public/api/wallet/topup/submit-receipt` (WRONG)
6. **Should Be:** `POST https://flexpay-production-348e.up.railway.app/api/wallet/topup/submit-receipt`

**Backend Flow:**
1. Route: `backend/public/index.php` line 63
2. Controller: `backend/src/Controllers/WalletController.php` method `submitTopupReceipt()`
3. Stores receipt for admin review
4. Response: `{"success": true, "data": {...}}`

**Status:** BROKEN - Frontend URL is wrong

---

### Feature: Admin Login

**Frontend Flow:**
1. Component: `src/pages/admin/LoginPage.jsx`
2. Calls: `adminAuth.login(email, password)` (from AdminAuthContext)
3. API Module: `src/lib/AdminAuthContext.jsx` line 64
4. Request: `POST ${API_BASE_URL}/api/admin/login`
5. **Current URL:** `POST /flexpay/backend/public/api/admin/login` (WRONG)
6. **Should Be:** `POST https://flexpay-production-348e.up.railway.app/api/admin/login`

**Backend Flow:**
1. Route: `backend/public/index.php` line 72
2. Controller: `backend/src/Controllers/AdminAuthController.php` method `login()`
3. Validates admin credentials, creates admin session
4. Response: `{"success": true, "data": {"token": "...", ...}}`

**Status:** BROKEN - Frontend URL is wrong

---

### Feature: Admin Dashboard Overview

**Frontend Flow:**
1. Component: `src/pages/admin/DashboardPage.jsx`
2. Calls: `adminApi.getOverview()`
3. API Module: `src/lib/api/admin.js` line 33
4. Request: `GET ${API_BASE_URL}/api/admin/overview`
5. **Current URL:** `GET /flexpay/backend/public/api/admin/overview` (WRONG)
6. **Should Be:** `GET https://flexpay-production-348e.up.railway.app/api/admin/overview`

**Backend Flow:**
1. Route: `backend/public/index.php` line 76
2. Controller: `backend/src/Controllers/AdminController.php` method `overview()`
3. Returns dashboard stats
4. Response: `{"success": true, "data": {...}}`

**Status:** BROKEN - Frontend URL is wrong

---

### Feature: Get Tasks

**Frontend Flow:**
1. Component: `src/pages/dashboard/DailyTasksPage.jsx`
2. Calls: `tasks.getTasks()`
3. API Module: `src/lib/api/tasks.js`
4. Request: `GET ${API_BASE_URL}/api/tasks`
5. **Current URL:** `GET /flexpay/backend/public/api/tasks` (WRONG)
6. **Should Be:** `GET https://flexpay-production-348e.up.railway.app/api/tasks`

**Backend Flow:**
1. Route: `backend/public/index.php` line 67
2. Controller: `backend/src/Controllers/TasksController.php` method `index()`
3. Returns available tasks
4. Response: `{"success": true, "data": [...]}`

**Status:** BROKEN - Frontend URL is wrong

---

## SUMMARY TABLE

| Feature | Frontend Component | API Call | Expected URL | Current URL | Backend Route | Status | Issue |
|---------|-------------------|----------|--------------|-------------|---------------|--------|-------|
| Registration | RegisterPage | POST `/api/auth/register` | `https://flexpay-production-348e.up.railway.app/api/auth/register` | `/flexpay/backend/public/api/auth/register` | ✓ Exists | ❌ BROKEN | Wrong domain from .env |
| Login | LoginPage | POST `/api/auth/login` | `https://flexpay-production-348e.up.railway.app/api/auth/login` | `/flexpay/backend/public/api/auth/login` | ✓ Exists | ❌ BROKEN | Wrong domain from .env |
| Get Balance | HomePage | GET `/api/wallet/summary` | `https://flexpay-production-348e.up.railway.app/api/wallet/summary` | `/flexpay/backend/public/api/wallet/summary` | ✓ Exists | ❌ BROKEN | Wrong domain from .env |
| Daily Check-in | CheckInCard | POST `/api/wallet/checkin` | `https://flexpay-production-348e.up.railway.app/api/wallet/checkin` | `/flexpay/backend/public/api/wallet/checkin` | ✓ Exists | ❌ BROKEN | Wrong domain from .env |
| Referral Link | ReferralProgram | GET `/api/referrals/info` | `https://flexpay-production-348e.up.railway.app/api/referrals/info` | `/flexpay/backend/public/api/referrals/info` | ✓ Exists | ❌ BROKEN | (1) Wrong domain from .env, (2) Backend generates localhost URL |
| Withdrawal | WithdrawPage | POST `/api/wallet/withdraw` | `https://flexpay-production-348e.up.railway.app/api/wallet/withdraw` | `/flexpay/backend/public/api/wallet/withdraw` | ✓ Exists | ❌ BROKEN | Wrong domain from .env |
| Top-up | TopUpPage | POST `/api/wallet/topup/submit-receipt` | `https://flexpay-production-348e.up.railway.app/api/wallet/topup/submit-receipt` | `/flexpay/backend/public/api/wallet/topup/submit-receipt` | ✓ Exists | ❌ BROKEN | Wrong domain from .env |
| Spin/Play | SpinPage | POST `/api/spin/play` | `https://flexpay-production-348e.up.railway.app/api/spin/play` | `/flexpay/backend/public/api/spin/play` | ✓ Exists | ❌ BROKEN | Wrong domain from .env |
| Get Tasks | DailyTasksPage | GET `/api/tasks` | `https://flexpay-production-348e.up.railway.app/api/tasks` | `/flexpay/backend/public/api/tasks` | ✓ Exists | ❌ BROKEN | Wrong domain from .env |
| Verify Task | DailyTasksPage | POST `/api/tasks/:id/verify` | `https://flexpay-production-348e.up.railway.app/api/tasks/:id/verify` | `/flexpay/backend/public/api/tasks/:id/verify` | ✓ Exists | ❌ BROKEN | Wrong domain from .env |
| Admin Login | Admin LoginPage | POST `/api/admin/login` | `https://flexpay-production-348e.up.railway.app/api/admin/login` | `/flexpay/backend/public/api/admin/login` | ✓ Exists | ❌ BROKEN | Wrong domain from .env |
| Admin Dashboard | AdminDashboard | GET `/api/admin/overview` | `https://flexpay-production-348e.up.railway.app/api/admin/overview` | `/flexpay/backend/public/api/admin/overview` | ✓ Exists | ❌ BROKEN | Wrong domain from .env |
| Admin Users | AdminUsersPage | GET `/api/admin/users` | `https://flexpay-production-348e.up.railway.app/api/admin/users` | `/flexpay/backend/public/api/admin/users` | ✓ Exists | ❌ BROKEN | Wrong domain from .env |
| Approve Withdrawal | AdminWithdrawals | POST `/api/admin/withdrawals/:id/approve` | `https://flexpay-production-348e.up.railway.app/api/admin/withdrawals/:id/approve` | `/flexpay/backend/public/api/admin/withdrawals/:id/approve` | ✓ Exists | ❌ BROKEN | Wrong domain from .env |
| List Topups | AdminTopups | GET `/api/admin/topups` | `https://flexpay-production-348e.up.railway.app/api/admin/topups` | `/flexpay/backend/public/api/admin/topups` | ✓ Exists | ❌ BROKEN | Wrong domain from .env |
| Get Exchange Rate | ExchangeRate | GET `/api/exchange-rate` | `https://flexpay-production-348e.up.railway.app/api/exchange-rate` | `/flexpay/backend/public/api/exchange-rate` | ✓ Exists | ❌ BROKEN | Wrong domain from .env |
| Get Achievements | AchievementsPage | GET `/api/wallet/achievements` | `https://flexpay-production-348e.up.railway.app/api/wallet/achievements` | `/flexpay/backend/public/api/wallet/achievements` | ✓ Exists | ❌ BROKEN | Wrong domain from .env |

---

## PRIORITY FIX LIST

### CRITICAL (Must fix to get ANY features working)

1. **Frontend `.env` file**
   - Change `VITE_API_URL=/flexpay/backend/public` 
   - To: `VITE_API_URL=https://flexpay-production-348e.up.railway.app`

2. **Backend `.env` Database**
   - Update `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - To: Match Railway database credentials (from Railway dashboard)

3. **Backend `.env` Frontend URL**
   - Add or Update: `FRONTEND_URL=https://flexpay-theta.vercel.app`
   - This is needed for referral link generation

4. **Backend `.env` CORS Origins** (if needed)
   - Not currently used in code, but should match any allowed origins
   - Code uses hardcoded array in `backend/public/index.php`

### HIGH PRIORITY (Fix after critical issues)

5. **Backend `public/index.php` CORS**
   - Line 5-8: Update or make dynamic based on env
   - Ensure Railway backend can accept requests from Vercel frontend

6. **Update `.env.example` files**
   - Both frontend and backend examples are outdated
   - Document Railway-specific configuration

### MEDIUM PRIORITY

7. **Delete or rename test/verification scripts**
   - `backend/action*.php`
   - `backend/check_*.php`
   - `backend/test_*.php`
   - `backend/tmp/verify_*.php`
   - These shouldn't be in production

8. **Update deployment documentation**
   - `backend/INFINITYFREE_DEPLOY.md` references old InfinityFree setup
   - Create new `RAILWAY_DEPLOY.md`

---

## VERIFICATION CHECKLIST

- [ ] Confirm Railway database credentials
- [ ] Verify frontend `.env` with correct Railway API URL
- [ ] Verify backend `.env` with correct Railway database and frontend URL
- [ ] Test registration endpoint
- [ ] Test login endpoint
- [ ] Test get balance endpoint
- [ ] Test referral link generation (check that link is Vercel URL, not localhost)
- [ ] Test admin login
- [ ] Test admin dashboard
- [ ] Verify CORS headers are correct in responses
- [ ] Delete or secure test/verification scripts
- [ ] Review and update .env.example files

---

## NOTES

1. **Backend .env currently shows Awardspace host**: The backend `.env` has `DB_HOST=fdb1028.awardspace.net` which is NOT Railway. This needs to be updated.

2. **API URL structure**: The correct API base URL is:
   - `https://flexpay-production-348e.up.railway.app`
   - All routes start with `/api/` (e.g., `/api/auth/login`, `/api/wallet/summary`)
   - Frontend appends `/api/endpoint` to the base URL

3. **No dynamic CORS**: The backend doesn't read `ALLOWED_ORIGINS` from env, only uses hardcoded array.

4. **Referral links are critical**: The backend generates referral links using `FRONTEND_URL` env variable. If not set, will generate localhost links.

5. **Test scripts for deletion**: There are ~40+ test/verification PHP scripts that should not be in production.

