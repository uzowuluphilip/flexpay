<?php

declare(strict_types=1);

namespace FlexPay\Repositories;

use FlexPay\Config\Database;
use PDO;

final class UserRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function existsByEmail(string $email): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1');
        $stmt->execute([$email]);
        return $stmt->fetchColumn() !== false;
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public function findByReferralCode(string $code): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE referral_code = ? LIMIT 1');
        $stmt->execute([$code]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public function create(string $fullName, string $email, string $passwordHash, string $referralCode): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO users (full_name, email, password_hash, referral_code, email_verified_at, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, NULL, "active", NOW(), NOW())'
        );
        $stmt->execute([$fullName, $email, $passwordHash, $referralCode]);

        return (int) $this->db->lastInsertId();
    }

    public function updateLastLogin(int $userId): void
    {
        $stmt = $this->db->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?');
        $stmt->execute([$userId]);
    }

    public function updatePassword(int $userId, string $passwordHash): void
    {
        $stmt = $this->db->prepare('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?');
        $stmt->execute([$passwordHash, $userId]);
    }

    public function markEmailVerified(int $userId): void
    {
        $stmt = $this->db->prepare('UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = ?');
        $stmt->execute([$userId]);
    }

    public function generateUniqueReferralCode(): string
    {
        do {
            $code = strtoupper(bin2hex(random_bytes(4)));
            $exists = $this->findByReferralCode($code);
        } while ($exists !== null);

        return $code;
    }

    public function safeUser(array $user): array
    {
        return [
            'id' => (int) $user['id'],
            'name' => $user['full_name'],
            'full_name' => $user['full_name'],
            'email' => $user['email'],
            'referral_code' => $user['referral_code'],
            'email_verified_at' => $user['email_verified_at'],
            'status' => $user['status'],
            'created_at' => $user['created_at'],
            'updated_at' => $user['updated_at'],
            'last_login_at' => $user['last_login_at'],
        ];
    }
}
