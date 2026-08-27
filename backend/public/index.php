<?php

declare(strict_types=1);

$allowedOrigins = [
    'https://flexpay-theta.vercel.app',
    'http://localhost:5173',
    'http://localhost',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}

header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Vary: Origin');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

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

Database::getInstance();

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
$router->add('GET', '/api/referrals/info', [WalletController::class, 'referralInfo']);
$router->add('POST', '/api/invest/lock', [WalletController::class, 'lockFunds']);
$router->add('GET', '/api/invest/locks', [WalletController::class, 'investLocks']);

$router->add('GET', '/api/tasks', [TasksController::class, 'index']);
$router->add('POST', '/api/tasks/:id/verify', [TasksController::class, 'verifyTask']);
$router->add('POST', '/api/spin/play', [WalletController::class, 'playSpin']);
$router->add('POST', '/api/notifications/subscribe', [NotificationController::class, 'subscribe']);
$router->add('POST', '/api/notifications/unsubscribe', [NotificationController::class, 'unsubscribe']);

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
