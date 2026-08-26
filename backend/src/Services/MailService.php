<?php

declare(strict_types=1);

namespace FlexPay\Services;

use Dotenv\Dotenv;

final class MailService
{
    private $client;

    public function __construct()
    {
        $rootPath = dirname(__DIR__, 2);
        $dotenv = Dotenv::createImmutable($rootPath);
        $dotenv->safeLoad();

        $apiKey = $_ENV['RESEND_API_KEY'] ?? '';
        $this->client = \Resend::client($apiKey);
    }

    public static function localDevBypassEnabled(): bool
    {
        $env = strtolower((string) ($_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: ''));
        if ($env === '') {
            return false;
        }

        $allowed = ['local', 'development', 'dev', 'testing'];

        return in_array($env, $allowed, true) && !in_array($env, ['production', 'prod'], true);
    }

    public static function isTestingOnlyRestrictionError(\Throwable $exception): bool
    {
        $messages = [];
        $current = $exception;

        while ($current instanceof \Throwable) {
            $messages[] = strtolower($current->getMessage());
            $current = $current->getPrevious();
        }

        foreach ($messages as $message) {
            if (str_contains($message, 'testing emails only')
                || str_contains($message, 'can only send testing emails')
                || str_contains($message, 'testing email')
                || str_contains($message, 'verified domain')) {
                return true;
            }
        }

        return false;
    }

    public function send(string $to, string $subject, string $html, string $text, ?string $from = null): ?array
    {
        if (($from ?? $_ENV['MAIL_FROM'] ?? null) === null || ($_ENV['RESEND_API_KEY'] ?? '') === '' || ($_ENV['RESEND_API_KEY'] ?? '') === 're_xxx') {
            return null;
        }

        try {
            $response = $this->client->emails->send([
                'from' => $from ?? $_ENV['MAIL_FROM'],
                'to' => [$to],
                'subject' => $subject,
                'html' => $html,
                'text' => $text,
            ]);

            return $response->body ?? null;
        } catch (\Throwable $exception) {
            if (self::localDevBypassEnabled() && self::isTestingOnlyRestrictionError($exception)) {
                throw new \RuntimeException('local_email_bypass_testing_only', 0, $exception);
            }

            throw $exception;
        }
    }
}
