# InfinityFree Backend Deployment

For this project:

- Frontend: `https://flexpay-theta.vercel.app`
- Backend domain: `https://flexpay.kesug.com`

This backend is plain PHP with MySQL and is deployed alongside the React frontend on the same InfinityFree site. Keeping both applications under one origin avoids cross-origin browser requests.

## 1. Create the database

1. Create a MySQL database in the InfinityFree control panel.
2. Open that database in phpMyAdmin.
3. Import `database/infinityfree-migration.sql` into the empty database.
4. Record the host-provided database name, username, password, and hostname exactly as shown by InfinityFree.

The export is schema-only. It does not contain local users, wallets, transactions, receipts, or credentials.

## 2. Upload the backend

Use an API subdomain or separate backend document root if the hosting panel supports it. The configured document root should point to `backend/public`, because that directory contains `index.php` and the API rewrite rules.

The PHP process must be able to read these sibling directories from that document root:

```text
backend/public/index.php
backend/src/
backend/vendor/
backend/cache/
backend/storage/topup-receipts/
backend/.env
```

If InfinityFree only allows `htdocs` as the document root, upload the `backend` directory below `htdocs` and configure the API base URL to include `/backend/public` (or the path created by your host). Keep the root `backend/.htaccess` in place: it blocks `.env`, `src`, `vendor`, `cache`, and `storage` from public requests. Do not expose those directories as downloadable static files.

## 3. Configure `backend/.env`

Copy `backend/.env.example` to `backend/.env` on the server and replace every placeholder:

```dotenv
APP_ENV=production
DB_HOST=the-hostname-from-infinityfree
DB_NAME=the-database-name-from-infinityfree
DB_USER=the-database-user-from-infinityfree
DB_PASSWORD=the-database-password-from-infinityfree
FRONTEND_URL=https://flexpay-theta.vercel.app
ALLOWED_ORIGINS=https://flexpay-theta.vercel.app
TOPUP_BANK_NAME=Moniepoint MFB
TOPUP_ACCOUNT_NUMBER=5289340156
TOPUP_ACCOUNT_NAME="Divine Kelechi Christopher"
VAPID_PUBLIC_KEY=your-public-vapid-key
VAPID_PRIVATE_KEY=your-private-vapid-key
VAPID_SUBJECT=mailto:your-real-contact@example.com
```

`ALLOWED_ORIGINS` is a comma-separated exact-origin allowlist. Include the Vercel preview origin only when needed. Do not use `*`, because the API uses credentialed requests.

Email verification and password-reset email are not part of this release. New accounts are activated immediately after registration. Password recovery must be handled manually by an administrator until a non-email recovery flow is implemented.

Before uploading either application, rotate any private VAPID keys that have ever been stored in a local `.env` file or shared outside the deployment secret store. Production secrets belong only in the server environment; never commit `.env` files.

## 4. Deploy the frontend on InfinityFree

Build the frontend locally with the root `.env` set to:

```text
VITE_API_URL=/flexpay/backend/public
```

Upload the contents of `dist/` into `htdocs/flexpay/`, alongside the existing `backend/` directory. The build includes `dist/.htaccess`, which sends direct frontend routes to `index.html` while leaving the `backend/` directory accessible to its own rewrite rules.

The frontend API base is same-origin, so the browser calls `https://flexpay.kesug.com/flexpay/backend/public` without a CORS preflight for normal requests.

Use `npm run build` and `dist` as the output directory. The repository includes `vercel.json`, which rewrites direct routes such as `/home`, `/upgrade`, and `/status` to `index.html`. Confirm the deployed project is connected to this repository and redeploy after pulling that file.

## 5. Verify after deployment

Run a real preflight request from the deployed frontend origin and confirm the literal response header. For the current `/flexpay/backend/public` upload path:

```powershell
curl.exe -i -X OPTIONS https://flexpay.kesug.com/flexpay/backend/public/api/auth/login `
  -H "Origin: https://your-vercel-project.vercel.app" `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: Content-Type, Authorization"
```

Expected header:

```text
Access-Control-Allow-Origin: https://your-vercel-project.vercel.app
```

Then test registration/login and one read-only authenticated endpoint such as `/api/wallet/summary` from the deployed browser. Do not call money-moving endpoints in production merely to smoke-test deployment.

Also verify these release conditions:

- The frontend root and a direct route both return the FlexPay app, not a provider placeholder or `404`.
- The API root responds from the uploaded backend, not a hosting-provider welcome page.
- The preflight response contains the exact deployed frontend origin and does not use `*`.
- Registration/login works from the deployed browser, followed by one authenticated read-only request.
- `backend/storage/topup-receipts` is writable by PHP but cannot be fetched directly over HTTP.
- Production `.env` uses `APP_ENV=production`, and all bank, database, and push values are real production values.

## InfinityFree cautions

- Do not upload `.env.example` as `.env` without replacing database and service values.
- Never commit or upload local `.env` files to GitHub.
- Keep `storage/topup-receipts` writable but inaccessible as a public static directory.
- Confirm the installed PHP version and Composer dependencies before going live.
- InfinityFree hosting limitations, sleeping sites, email restrictions, and database connection limits must be checked against the current provider plan before production use.
