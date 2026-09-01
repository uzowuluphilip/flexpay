<?php

declare(strict_types=1);

namespace FlexPay\Repositories;

use FlexPay\Config\Database;
use PDO;

final class NotificationRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function add(int $userId, string $title, string $message, string $type = 'general', ?string $link = null): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO notifications (user_id, title, message, type, link, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())'
        );
        $stmt->execute([$userId, $title, $message, $type, $link]);
    }

    public function addIfMissing(int $userId, string $title, string $message, string $type = 'general', ?string $link = null): void
    {
        $stmt = $this->db->prepare(
            'SELECT 1 FROM notifications WHERE user_id = ? AND title = ? AND message = ? LIMIT 1'
        );
        $stmt->execute([$userId, $title, $message]);

        if ($stmt->fetchColumn() === false) {
            $this->add($userId, $title, $message, $type, $link);
        }
    }

    public function listForUser(int $userId, int $limit = 20): array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?'
        );
        $stmt->execute([$userId, $limit]);
        return $stmt->fetchAll();
    }
}
