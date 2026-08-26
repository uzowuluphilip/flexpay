<?php

declare(strict_types=1);

namespace FlexPay\Http;

final class Response
{
    public static function json(int $statusCode, array $payload, array $headers = []): void
    {
        http_response_code($statusCode);

        foreach ($headers as $name => $value) {
            header($name . ': ' . $value);
        }

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function success(array $data = [], int $statusCode = 200): void
    {
        self::json($statusCode, [
            'success' => true,
            'data' => $data,
        ]);
    }

    public static function error(string $message, int $statusCode = 400, ?string $code = null): void
    {
        $payload = [
            'success' => false,
            'error' => $message,
        ];

        if ($code !== null) {
            $payload['code'] = $code;
        }

        self::json($statusCode, $payload);
    }
}
