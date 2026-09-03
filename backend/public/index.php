<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;
use FlexPay\Controllers\AdminAuthController;
use FlexPay\Controllers\AdminController;
use FlexPay\Controllers\AuthController;
use FlexPay\Controllers\TasksController;
use FlexPay\Controllers\WalletController;
use FlexPay\Controllers\NotificationController;
use FlexPay\Http\Request;
use FlexPay\Http\Router;

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

$frontEndUrl = rtrim((string) ($_ENV['FRONTEND_URL'] ?? 'http://localhost:5173'), '/');
$defaultOrigins = [
    $frontEndUrl,
    'https://flexpay-theta.vercel.app',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:4174',
    'http://localhost',
];
$allowedOrigins = array_values(array_unique(array_filter(array_map('trim', array_merge(
    $defaultOrigins,
    explode(',', (string) ($_ENV['ALLOWED_ORIGINS'] ?? ''))
)), static fn (string $origin): bool => $origin !== '')));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$effectiveOrigin = '';

if ($origin === '') {
    $effectiveOrigin = $frontEndUrl;
} elseif (in_array($origin, $allowedOrigins, true) || preg_match('/^https:\/\/.*\.vercel\.app$/', $origin) === 1) {
    $effectiveOrigin = $origin;
}

if ($effectiveOrigin !== '') {
    header('Access-Control-Allow-Origin: ' . $effectiveOrigin);
}
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Vary: Origin');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

Database::getInstance();

$database = Database::getInstance()->getConnection();
$database->exec(
    'CREATE TABLE IF NOT EXISTS push_subscriptions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        endpoint VARCHAR(500) NOT NULL,
        p256dh_key VARCHAR(255) NOT NULL,
        auth_key VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_push_subscriptions_endpoint (endpoint(255)),
        KEY idx_push_subscriptions_user (user_id),
        CONSTRAINT fk_push_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
);
$database->exec(
    'CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(150) NOT NULL,
        message VARCHAR(500) NOT NULL,
        type VARCHAR(40) NOT NULL DEFAULT "general",
        link VARCHAR(255) NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_notifications_user (user_id),
        KEY idx_notifications_created_at (created_at),
        CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
);

// Keep receipt storage columns available on databases created before uploads stored file data in MySQL.
$receiptColumns = $database->query("SHOW COLUMNS FROM topup_receipts")->fetchAll(\PDO::FETCH_COLUMN);
if (!in_array('receipt_data', $receiptColumns, true)) {
    $database->exec('ALTER TABLE topup_receipts ADD COLUMN receipt_data LONGBLOB NULL AFTER file_path');
}
if (!in_array('receipt_mime', $receiptColumns, true)) {
    $database->exec('ALTER TABLE topup_receipts ADD COLUMN receipt_mime VARCHAR(100) NULL AFTER receipt_data');
}

$router = new Router();
$router->add('POST', '/api/auth/register', [AuthController::class, 'register']);
$router->add('POST', '/api/auth/login', [AuthController::class, 'login']);
$router->add('POST', '/api/auth/logout', [AuthController::class, 'logout']);
$router->add('GET', '/api/auth/me', [AuthController::class, 'me']);

$router->add('GET', '/api/wallet/summary', [WalletController::class, 'summary']);
$router->add('GET', '/api/wallet/withdraw-progress', [WalletController::class, 'withdrawProgress']);
$router->add('GET', '/api/exchange-rate', [WalletController::class, 'exchangeRate']);
$router->add('GET', '/api/wallet/checkin-status', [WalletController::class, 'checkinStatus']);
$router->add('POST', '/api/wallet/checkin', [WalletController::class, 'checkin']);
$router->add('POST', '/api/wallet/claim-reward', [WalletController::class, 'claimReward']);
$router->add('GET', '/api/wallet/achievements', [WalletController::class, 'achievements']);
$router->add('GET', '/api/wallet/activity', [WalletController::class, 'activity']);
$router->add('POST', '/api/wallet/withdraw', [WalletController::class, 'withdraw']);
$router->add('GET', '/api/wallet/topup-config', [WalletController::class, 'topupConfig']);
$router->add('POST', '/api/wallet/topup/submit-receipt', [WalletController::class, 'submitTopupReceipt']);
$router->add('POST', '/api/wallet/upgrade/submit-receipt', [WalletController::class, 'submitUpgradeReceipt']);
$router->add('GET', '/api/referrals/info', [WalletController::class, 'referralInfo']);
$router->add('POST', '/api/invest/lock', [WalletController::class, 'lockFunds']);
$router->add('GET', '/api/invest/locks', [WalletController::class, 'investLocks']);

$router->add('GET', '/api/tasks', [TasksController::class, 'index']);
$router->add('POST', '/api/tasks/:id/verify', [TasksController::class, 'verifyTask']);
$router->add('POST', '/api/spin/play', [WalletController::class, 'playSpin']);
$router->add('POST', '/api/notifications/subscribe', [NotificationController::class, 'subscribe']);
$router->add('POST', '/api/notifications/unsubscribe', [NotificationController::class, 'unsubscribe']);
$router->add('GET', '/api/notifications', [NotificationController::class, 'list']);
$router->add('POST', '/api/notifications/read', [NotificationController::class, 'markRead']);

$router->add('POST', '/api/admin/login', [AdminAuthController::class, 'login']);
$router->add('POST', '/api/admin/logout', [AdminAuthController::class, 'logout']);
$router->add('GET', '/api/admin/me', [AdminAuthController::class, 'me']);

$router->add('GET', '/api/admin/overview', [AdminController::class, 'overview']);
$router->add('GET', '/api/admin/users', [AdminController::class, 'listUsers']);
$router->add('GET', '/api/admin/users/:id', [AdminController::class, 'userDetail']);
$router->add('POST', '/api/admin/users/:id/suspend', [AdminController::class, 'suspendUser']);
$router->add('POST', '/api/admin/users/:id/reactivate', [AdminController::class, 'reactivateUser']);
$router->add('POST', '/api/admin/users/:id/adjust-balance', [AdminController::class, 'adjustBalance']);

$router->add('GET', '/api/admin/withdrawals', [AdminController::class, 'listWithdrawals']);
$router->add('POST', '/api/admin/withdrawals/:id/approve', [AdminController::class, 'approveWithdrawal']);
$router->add('POST', '/api/admin/withdrawals/:id/reject', [AdminController::class, 'rejectWithdrawal']);
$router->add('GET', '/api/admin/topups', [AdminController::class, 'listTopups']);
$router->add('GET', '/api/admin/transactions/pending', [AdminController::class, 'listPendingTransactions']);
$router->add('POST', '/api/admin/transactions/:id/approve', [AdminController::class, 'approveTransaction']);
$router->add('POST', '/api/admin/transactions/:id/reject', [AdminController::class, 'rejectTransaction']);
$router->add('GET', '/api/admin/transactions/:id/receipt', [AdminController::class, 'transactionReceipt']);
$router->add('POST', '/api/admin/topups/:id/approve', [AdminController::class, 'approveTopup']);
$router->add('POST', '/api/admin/topups/:id/reject', [AdminController::class, 'rejectTopup']);
$router->add('GET', '/api/admin/topups/:id/receipt', [AdminController::class, 'topupReceipt']);

$router->add('GET', '/api/admin/tasks', [AdminController::class, 'listTasks']);
$router->add('POST', '/api/admin/tasks', [AdminController::class, 'createTask']);
$router->add('PUT', '/api/admin/tasks/:id', [AdminController::class, 'updateTask']);
$router->add('DELETE', '/api/admin/tasks/:id', [AdminController::class, 'deleteTask']);

$router->add('GET', '/api/admin/achievements', [AdminController::class, 'listAchievements']);
$router->add('POST', '/api/admin/achievements', [AdminController::class, 'createAchievement']);

$request = new Request();
$router->dispatch($request);
