<?php

declare(strict_types=1);

namespace FlexPay\Repositories;

use FlexPay\Config\Database;
use PDO;

final class AdminSessionRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create(int $adminId, string $tokenHash, ?string $userAgent, ?string $ipAddress, int $ttlHours = 24): void
    {
        $expiresAt = date('Y-m-d H:i:s', time() + ($ttlHours * 3600));
        $stmt = $this->db->prepare(
            'INSERT INTO admin_sessions (admin_id, token_hash, user_agent, ip_address, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())'
        );
        $stmt->execute([$adminId, $tokenHash, $userAgent, $ipAddress, $expiresAt]);
    }

    public function findByTokenHash(string $tokenHash): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM admin_sessions WHERE token_hash = ? AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute([$tokenHash]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function deleteByTokenHash(string $tokenHash): void
    {
        $stmt = $this->db->prepare('DELETE FROM admin_sessions WHERE token_hash = ?');
        $stmt->execute([$tokenHash]);
    }
}
