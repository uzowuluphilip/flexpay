<?php

declare(strict_types=1);

namespace FlexPay\Controllers;

use FlexPay\Config\Database;
use FlexPay\Http\Request;
use FlexPay\Http\Response;
use FlexPay\Repositories\NotificationRepository;
use FlexPay\Repositories\PushSubscriptionRepository;
use FlexPay\Repositories\SessionRepository;
use FlexPay\Repositories\UserRepository;
use FlexPay\Services\TokenService;
use PDO;

final class NotificationController
{
    private PDO $db;
    private UserRepository $users;
    private SessionRepository $sessions;
    private PushSubscriptionRepository $subscriptions;
    private NotificationRepository $notifications;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
        $this->users = new UserRepository();
        $this->sessions = new SessionRepository();
        $this->subscriptions = new PushSubscriptionRepository();
        $this->notifications = new NotificationRepository();
    }

    public function subscribe(Request $request): void
    {
        $user = $this->requireUser($request);
        $payload = $request->json();
        $endpoint = trim((string) ($payload['endpoint'] ?? ''));
        $keys = is_array($payload['keys'] ?? null) ? $payload['keys'] : [];
        $p256dh = trim((string) ($keys['p256dh'] ?? ''));
        $auth = trim((string) ($keys['auth'] ?? ''));

        if ($endpoint === '' || strlen($endpoint) > 500 || $p256dh === '' || strlen($p256dh) > 255 || $auth === '' || strlen($auth) > 255) {
            Response::error('A valid push subscription is required.', 422, 'invalid_push_subscription');
        }

        $this->subscriptions->upsert((int) $user['id'], $endpoint, $p256dh, $auth);
        Response::success(['subscribed' => true]);
    }

    public function unsubscribe(Request $request): void
    {
        $user = $this->requireUser($request);
        $endpoint = trim((string) (($request->json())['endpoint'] ?? ''));

        if ($endpoint === '') {
            Response::error('Push subscription endpoint is required.', 422, 'invalid_push_endpoint');
        }

        $this->subscriptions->deleteByEndpoint($endpoint, (int) $user['id']);
        Response::success(['unsubscribed' => true]);
    }

    public function list(Request $request): void
    {
        $user = $this->requireUser($request);
        $rows = $this->notifications->listForUser((int) $user['id'], 20);

        $items = array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'title' => $row['title'],
            'message' => $row['message'],
            'type' => $row['type'],
            'link' => $row['link'],
            'read' => (bool) $row['is_read'],
            'time' => date('c', strtotime((string) $row['created_at'])),
        ], $rows);

        Response::success(['items' => $items]);
    }

    public function markRead(Request $request): void
    {
        $user = $this->requireUser($request);
        $payload = $request->json();
        $ids = array_values(array_filter(array_map('intval', $payload['ids'] ?? [])));

        if ($ids === []) {
            Response::error('At least one notification id is required.', 422, 'missing_notification_ids');
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $sql = 'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (' . $placeholders . ')';
        $params = [(int) $user['id'], ...$ids];
        $this->db->prepare($sql)->execute($params);

        Response::success(['updated' => true]);
    }

    private function requireUser(Request $request): array
    {
        $token = $request->bearerToken();
        if ($token === null || trim($token) === '') {
            Response::error('Authorization token is required.', 401);
        }

        $session = $this->sessions->findByTokenHash(TokenService::hashToken($token));
        if ($session === null) {
            Response::error('Session not found or expired.', 401);
        }

        $user = $this->users->findById((int) $session['user_id']);
        if ($user === null) {
            Response::error('User not found.', 404);
        }

        return $user;
    }
}
