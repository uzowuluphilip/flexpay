<?php

declare(strict_types=1);

namespace FlexPay\Repositories;

use FlexPay\Config\Database;
use PDO;

final class WalletRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function createForUser(int $userId): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO wallets (user_id, balance_kobo, currency, created_at, updated_at)
             VALUES (?, 0, "NGN", NOW(), NOW())'
        );
        $stmt->execute([$userId]);

        return (int) $this->db->lastInsertId();
    }
}
