<?php

declare(strict_types=1);

namespace FlexPay\Repositories;

use FlexPay\Config\Database;
use PDO;

final class AdminUserRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function findById(int $adminId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM admin_users WHERE id = ? LIMIT 1');
        $stmt->execute([$adminId]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM admin_users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function updateLastLogin(int $adminId): void
    {
        $stmt = $this->db->prepare('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?');
        $stmt->execute([$adminId]);
    }

    public function safeAdmin(array $admin): array
    {
        return [
            'id' => $admin['id'],
            'full_name' => $admin['full_name'],
            'email' => $admin['email'],
            'role' => $admin['role'],
            'last_login_at' => $admin['last_login_at'],
            'created_at' => $admin['created_at'],
        ];
    }
}
