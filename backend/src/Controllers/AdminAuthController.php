<?php

declare(strict_types=1);

namespace FlexPay\Controllers;

use FlexPay\Config\Database;
use FlexPay\Http\Request;
use FlexPay\Http\Response;
use FlexPay\Repositories\AdminSessionRepository;
use FlexPay\Repositories\AdminUserRepository;
use FlexPay\Services\TokenService;
use PDO;

final class AdminAuthController
{
    private PDO $db;
    private AdminUserRepository $admins;
    private AdminSessionRepository $sessions;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
        $this->admins = new AdminUserRepository();
        $this->sessions = new AdminSessionRepository();
    }

    public function login(Request $request): void
    {
        $payload = $request->json();
        $email = trim((string) ($payload['email'] ?? ''));
        $password = (string) ($payload['password'] ?? '');

        if ($email === '' || $password === '') {
            Response::error('Please provide both your email and password.', 422);
        }

        $admin = $this->admins->findByEmail($email);
        if ($admin === null || !password_verify($password, (string) $admin['password_hash'])) {
            Response::error('Invalid email or password.', 401, 'invalid_credentials');
        }

        $token = TokenService::generateRandomToken(32);
        $tokenHash = TokenService::hashToken($token);
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;

        $this->sessions->create((int) $admin['id'], $tokenHash, $userAgent, $ipAddress, 24);
        $this->admins->updateLastLogin((int) $admin['id']);

        Response::success([
            'token' => $token,
            'admin' => $this->admins->safeAdmin($admin),
        ]);
    }

    public function logout(Request $request): void
    {
        $token = $request->bearerToken();
        if ($token === null || trim($token) === '') {
            Response::error('Authorization token is required.', 401);
        }

        $tokenHash = TokenService::hashToken($token);
        $session = $this->sessions->findByTokenHash($tokenHash);
        if ($session === null) {
            Response::error('Session not found or expired.', 401);
        }

        $this->sessions->deleteByTokenHash($tokenHash);

        Response::success(['logged_out' => true]);
    }

    public function me(Request $request): void
    {
        $token = $request->bearerToken();
        if ($token === null || trim($token) === '') {
            Response::error('Authorization token is required.', 401);
        }

        $session = $this->sessions->findByTokenHash(TokenService::hashToken($token));
        if ($session === null) {
            Response::error('Session not found or expired.', 401);
        }

        $admin = $this->admins->findById((int) $session['admin_id']);
        if ($admin === null) {
            Response::error('Admin not found.', 404);
        }

        Response::success([
            'admin' => $this->admins->safeAdmin($admin),
        ]);
    }
}
