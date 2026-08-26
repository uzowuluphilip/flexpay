<?php
require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Controllers\WalletController;
use FlexPay\Http\Request;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['REQUEST_URI'] = '/api/wallet/withdraw';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$_SERVER['HTTP_USER_AGENT'] = 'php-cli-wallet-case';

$token = (string) ($argv[1] ?? '');
if ($token !== '') {
    $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;
}

$rawInput = file_get_contents('php://stdin');
$payload = json_decode((string) $rawInput, true);
if (!is_array($payload)) {
    $payload = [];
}

$_SERVER['__wallet_payload'] = $payload;

$request = new Request();
(new WalletController())->withdraw($request);
