<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use FlexPay\Config\Database;

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

if (php_sapi_name() !== 'cli') {
    die("This script can only be run from the command line.\n");
}

if ($argc < 4) {
    echo "Usage: php create-admin.php <full_name> <email> <password>\n";
    echo "Example: php create-admin.php \"John Admin\" admin@example.com \"SecurePassword123\"\n";
    exit(1);
}

$fullName = trim((string) $argv[1]);
$email = trim((string) $argv[2]);
$password = (string) $argv[3];

if (empty($fullName) || empty($email) || empty($password)) {
    die("Error: All fields (name, email, password) are required.\n");
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    die("Error: Invalid email format.\n");
}

if (strlen($password) < 8) {
    die("Error: Password must be at least 8 characters long.\n");
}

try {
    $db = Database::getInstance()->getConnection();

    // Check if email already exists
    $stmt = $db->prepare('SELECT id FROM admin_users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        die("Error: An admin account with that email already exists.\n");
    }

    // Hash password
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    // Insert admin user
    $insert = $db->prepare(
        'INSERT INTO admin_users (full_name, email, password_hash, role, created_at)
         VALUES (?, ?, ?, ?, NOW())'
    );
    $insert->execute([$fullName, $email, $passwordHash, 'super_admin']);

    $adminId = (int) $db->lastInsertId();

    echo "✓ Admin account created successfully!\n";
    echo "  ID: {$adminId}\n";
    echo "  Name: {$fullName}\n";
    echo "  Email: {$email}\n";
    echo "  Role: super_admin\n";
} catch (Exception $e) {
    die("Error: " . $e->getMessage() . "\n");
}
