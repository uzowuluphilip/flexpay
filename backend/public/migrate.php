<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use Dotenv\Dotenv;
use PDO;
use Throwable;

$rootPath = dirname(__DIR__);

$dotenv = Dotenv::createImmutable($rootPath);
$dotenv->safeLoad();

$host = $_SERVER['DB_HOST'] ?? $_ENV['DB_HOST'] ?? '127.0.0.1';
$port = $_SERVER['DB_PORT'] ?? $_ENV['DB_PORT'] ?? '3306';
$dbname = $_SERVER['DB_NAME'] ?? $_ENV['DB_NAME'] ?? 'flexpay';
$user = $_SERVER['DB_USER'] ?? $_ENV['DB_USER'] ?? 'root';
$password = $_SERVER['DB_PASSWORD'] ?? $_ENV['DB_PASSWORD'] ?? '';

$dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
    $host,
    $port,
    $dbname
);

try {
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);

    $schemaPath = dirname(__DIR__) . '/database/schema.sql';

    if (!file_exists($schemaPath)) {
        throw new RuntimeException('schema.sql not found at: ' . $schemaPath);
    }

    $sql = file_get_contents($schemaPath);

    if ($sql === false) {
        throw new RuntimeException('Could not read schema.sql');
    }

    $pdo->exec($sql);

    unlink(__FILE__);

    echo json_encode([
        'success' => true,
        'message' => 'Flexpay database tables created successfully.'
    ]);
} catch (Throwable $e) {
    http_response_code(500);

    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}