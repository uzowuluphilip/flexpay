<?php

declare(strict_types=1);

namespace FlexPay\Repositories;

use FlexPay\Config\Database;
use PDO;

final class SessionRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function create(int $userId, string $tokenHash, ?string $userAgent, ?string $ipAddress, int $ttlHours = 24): void
    {
        $expiresAt = date('Y-m-d H:i:s', time() + ($ttlHours * 3600));
        $effectiveUserAgent = $userAgent ?? 'unknown';

        $stmt = $this->db->prepare(
            'INSERT INTO sessions (user_id, token_hash, user_agent, ip_address, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())'
        );
        $stmt->execute([$userId, $tokenHash, $effectiveUserAgent, $ipAddress ?? '127.0.0.1', $expiresAt]);
    }

    public function findByTokenHash(string $tokenHash): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM sessions WHERE token_hash = ? AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute([$tokenHash]);
        $session = $stmt->fetch();

        return $session ?: null;
    }

    public function deleteByTokenHash(string $tokenHash): void
    {
        $stmt = $this->db->prepare('DELETE FROM sessions WHERE token_hash = ?');
        $stmt->execute([$tokenHash]);
    }

    public function deleteByUserId(int $userId): void
    {
        $stmt = $this->db->prepare('DELETE FROM sessions WHERE user_id = ?');
        $stmt->execute([$userId]);
    }

    public function deleteById(int $id): void
    {
        $stmt = $this->db->prepare('DELETE FROM sessions WHERE id = ?');
        $stmt->execute([$id]);
    }
}
