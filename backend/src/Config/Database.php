<?php

declare(strict_types=1);

namespace FlexPay\Config;

use Dotenv\Dotenv;
use PDO;
use PDOException;

final class Database
{
    private static ?self $instance = null;

    private PDO $pdo;

    private function __construct()
    {
        $rootPath = dirname(__DIR__, 2);
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

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        try {
            $this->pdo = new PDO($dsn, $user, $password, $options);
        } catch (PDOException $exception) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Database connection failed: ' . $exception->getMessage(),
            ]);
            exit;
        }
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    public function getConnection(): PDO
    {
        return $this->pdo;
    }
}