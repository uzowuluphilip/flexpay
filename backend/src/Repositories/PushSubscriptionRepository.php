<?php

declare(strict_types=1);

namespace FlexPay\Repositories;

use FlexPay\Config\Database;
use PDO;

final class PushSubscriptionRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function upsert(int $userId, string $endpoint, string $p256dhKey, string $authKey): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, created_at)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh_key = VALUES(p256dh_key), auth_key = VALUES(auth_key)'
        );
        $stmt->execute([$userId, $endpoint, $p256dhKey, $authKey]);
    }

    public function forUser(int $userId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM push_subscriptions WHERE user_id = ? ORDER BY id ASC');
        $stmt->execute([$userId]);

        return $stmt->fetchAll();
    }

    public function deleteByEndpoint(string $endpoint, ?int $userId = null): void
    {
        if ($userId === null) {
            $stmt = $this->db->prepare('DELETE FROM push_subscriptions WHERE endpoint = ?');
            $stmt->execute([$endpoint]);
            return;
        }

        $stmt = $this->db->prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?');
        $stmt->execute([$endpoint, $userId]);
    }
}
