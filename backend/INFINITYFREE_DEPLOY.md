# InfinityFree Backend Deployment

This backend is plain PHP with MySQL and can be hosted on InfinityFree if the host provides PHP 8.1+ and the required Composer extensions. The frontend remains a separate Vercel deployment.

## 1. Create the database

1. Create a MySQL database in the InfinityFree control panel.
2. Open that database in phpMyAdmin.
3. Import `database/infinityfree-migration.sql` into the empty database.
4. Record the host-provided database name, username, password, and hostname exactly as shown by InfinityFree.

The export is schema-only. It does not contain local users, wallets, transactions, receipts, or credentials.

## 2. Upload the backend

Use an API subdomain or separate backend document root if the hosting panel supports it. The configured document root must point to `backend/public`, because that directory contains `index.php` and `.htaccess`.

The PHP process must be able to read these sibling directories from that document root:

```text
backend/public/index.php
backend/src/
backend/vendor/
backend/cache/
backend/storage/topup-receipts/
backend/.env
```

If InfinityFree only allows `htdocs` as the document root, preserve the backend directory layout and configure the API base URL to include the path that reaches `public/index.php`; do not expose `.env`, `src`, or `vendor` as downloadable static files.

## 3. Configure `backend/.env`

Copy `backend/.env.example` to `backend/.env` on the server and replace every placeholder:

```dotenv
APP_ENV=production
DB_HOST=the-hostname-from-infinityfree
DB_NAME=the-database-name-from-infinityfree
DB_USER=the-database-user-from-infinityfree
DB_PASSWORD=the-database-password-from-infinityfree
FRONTEND_URL=https://your-vercel-project.vercel.app
ALLOWED_ORIGINS=https://your-vercel-project.vercel.app
REQUIRE_EMAIL_VERIFICATION=true
RESEND_API_KEY=your-real-resend-key
MAIL_FROM="FlexPay <your-verified-sender@example.com>"
TOPUP_BANK_NAME=Moniepoint MFB
TOPUP_ACCOUNT_NUMBER=5289340156
TOPUP_ACCOUNT_NAME="Divine Kelechi Christopher"
VAPID_PUBLIC_KEY=your-public-vapid-key
VAPID_PRIVATE_KEY=your-private-vapid-key
VAPID_SUBJECT=mailto:your-real-contact@example.com
```

`ALLOWED_ORIGINS` is a comma-separated exact-origin allowlist. Include the Vercel preview origin only when needed. Do not use `*`, because the API uses credentialed requests.

## 4. Deploy the frontend on Vercel

Set the Vercel project environment variable to the InfinityFree API domain:

```text
VITE_API_URL=https://flexpay.kesug.com
```

Use `npm run build` and `dist` as the output directory. Add a Vercel SPA rewrite so direct routes such as `/home`, `/upgrade`, and `/status` resolve to `index.html`.

## 5. Verify after deployment

Run a real preflight request from the deployed frontend origin and confirm the literal response header:

```powershell
curl.exe -i -X OPTIONS https://flexpay.kesug.com/api/auth/login `
  -H "Origin: https://your-vercel-project.vercel.app" `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: Content-Type, Authorization"
```

Expected header:

```text
Access-Control-Allow-Origin: https://your-vercel-project.vercel.app
```

Then test registration/login and one read-only authenticated endpoint such as `/api/wallet/summary` from the deployed browser. Do not call money-moving endpoints in production merely to smoke-test deployment.

## InfinityFree cautions

- Do not upload `.env.example` as `.env` without replacing database and service values.
- Never commit or upload local `.env` files to GitHub.
- Keep `storage/topup-receipts` writable but inaccessible as a public static directory.
- Confirm the installed PHP version and Composer dependencies before going live.
- InfinityFree hosting limitations, sleeping sites, email restrictions, and database connection limits must be checked against the current provider plan before production use.
