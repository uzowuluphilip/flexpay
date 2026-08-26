<?php

declare(strict_types=1);

namespace FlexPay\Services;

use FlexPay\Repositories\PushSubscriptionRepository;
use Minishlink\WebPush\MessageSentReport;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

final class NotificationService
{
    private PushSubscriptionRepository $subscriptions;

    public function __construct()
    {
        $this->subscriptions = new PushSubscriptionRepository();
    }

    public function sendToUser(int $userId, string $title, string $body, ?string $url = null): void
    {
        $publicKey = trim((string) ($_ENV['VAPID_PUBLIC_KEY'] ?? ''));
        $privateKey = trim((string) ($_ENV['VAPID_PRIVATE_KEY'] ?? ''));
        $subject = trim((string) ($_ENV['VAPID_SUBJECT'] ?? ''));

        if ($publicKey === '' || $privateKey === '' || $subject === '') {
            return;
        }

        $rows = $this->subscriptions->forUser($userId);
        if ($rows === []) {
            return;
        }

        $webPush = new WebPush([
            'VAPID' => [
                'subject' => $subject,
                'publicKey' => $publicKey,
                'privateKey' => $privateKey,
            ],
        ]);

        foreach ($rows as $row) {
            $subscription = Subscription::create([
                'endpoint' => $row['endpoint'],
                'keys' => [
                    'p256dh' => $row['p256dh_key'],
                    'auth' => $row['auth_key'],
                ],
            ]);
            $webPush->queueNotification($subscription, json_encode([
                'title' => $title,
                'body' => $body,
                'url' => $url ?? '/',
                'icon' => '/flexpay-icon.svg',
            ], JSON_THROW_ON_ERROR));
        }

        foreach ($webPush->flush() as $report) {
            if ($report instanceof MessageSentReport && !$report->isSuccess() && $report->getResponse()?->getStatusCode() === 410) {
                $this->subscriptions->deleteByEndpoint((string) $report->getEndpoint());
            }
        }
    }
}
