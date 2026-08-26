<?php

declare(strict_types=1);

namespace FlexPay\Services;

final class TokenService
{
    public static function generateRandomToken(int $length = 32): string
    {
        return bin2hex(random_bytes(max(16, (int) ceil($length / 2))));
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }
}
