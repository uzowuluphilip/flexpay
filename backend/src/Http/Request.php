<?php

declare(strict_types=1);

namespace FlexPay\Http;

final class Request
{
    public function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    public function path(): string
    {
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $withoutQuery = explode('?', $uri, 2)[0];
        return $withoutQuery ?: '/';
    }

    public function json(): array
    {
        $rawBody = file_get_contents('php://input');
        if ($rawBody === false || trim($rawBody) === '') {
            return [];
        }

        $decoded = json_decode($rawBody, true);
        if (!is_array($decoded)) {
            return [];
        }

        return $decoded;
    }

    public function header(string $name): ?string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));

        if (array_key_exists($key, $_SERVER)) {
            return (string) $_SERVER[$key];
        }

        $lowerKey = strtolower($name);
        foreach ($_SERVER as $serverKey => $value) {
            if (strtolower((string) $serverKey) === 'http_' . str_replace('-', '_', $lowerKey)) {
                return (string) $value;
            }
        }

        return null;
    }

    public function bearerToken(): ?string
    {
        $header = $this->header('Authorization');
        if ($header === null) {
            return null;
        }

        if (stripos($header, 'Bearer ') !== 0) {
            return null;
        }

        return trim(substr($header, 7));
    }

    public function query(string $key): ?string
    {
        return $_GET[$key] ?? null;
    }
}
