<?php

declare(strict_types=1);

namespace FlexPay\Controllers;

use FlexPay\Config\Database;
use FlexPay\Http\Request;
use FlexPay\Http\Response;
use FlexPay\Repositories\ReferralRepository;
use FlexPay\Repositories\SessionRepository;
use FlexPay\Repositories\UserRepository;
use FlexPay\Repositories\WalletRepository;
use FlexPay\Services\PasswordService;
use PDO;

final class AuthController
{
    private PDO $db;
    private UserRepository $users;
    private SessionRepository $sessions;
    private WalletRepository $wallets;
    private ReferralRepository $referrals;
    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
        $this->users = new UserRepository();
        $this->sessions = new SessionRepository();
        $this->wallets = new WalletRepository();
        $this->referrals = new ReferralRepository();
    }

    public function register(Request $request): void
    {
        $payload = $request->json();
        $fullName = trim((string) ($payload['full_name'] ?? ''));
        $email = trim((string) ($payload['email'] ?? ''));
        $password = (string) ($payload['password'] ?? '');
        $referralCode = trim((string) ($payload['referral_code'] ?? ''));

        if ($fullName === '' || $email === '' || $password === '') {
            Response::error('Please provide your name, email, and password.', 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Please provide a valid email address.', 422);
        }

        if (strlen($password) < 8) {
            Response::error('Password must be at least 8 characters long.', 422);
        }

        if ($this->users->existsByEmail($email)) {
            Response::error('An account with that email already exists.', 409, 'email_taken');
        }

        $passwordHash = PasswordService::hash($password);
        $uniqueReferralCode = $this->users->generateUniqueReferralCode();

        $userId = $this->users->create($fullName, $email, $passwordHash, $uniqueReferralCode);
        $this->users->markEmailVerified($userId);
        $walletId = $this->wallets->createForUser($userId);
        $welcomeBonusKobo = 6000000;
        $this->db->prepare(
            'INSERT INTO transactions (user_id, wallet_id, type, amount_kobo, status, reference, meta, created_at, updated_at)
             VALUES (?, ?, "welcome_bonus", ?, "completed", ?, ?, NOW(), NOW())'
        )->execute([
            $userId,
            $walletId,
            $welcomeBonusKobo,
            'welcome_bonus_' . $userId,
            json_encode(['source' => 'registration', 'amount_naira' => 60000], JSON_THROW_ON_ERROR),
        ]);
        $this->db->prepare('UPDATE wallets SET balance_kobo = ?, updated_at = NOW() WHERE id = ?')->execute([$welcomeBonusKobo, $walletId]);

        if ($referralCode !== '') {
            $referrer = $this->users->findByReferralCode($referralCode);
            if ($referrer !== null) {
                $this->referrals->recordPendingReferral((int) $referrer['id'], $userId);
                // TODO: next step – credit referral bonus when referral is activated
            }
        }

        $this->insertActivityFeed($userId, 'account', 'Wallet created', null);
        $this->insertActivityFeed($userId, 'welcome_bonus', 'Welcome bonus', $welcomeBonusKobo);

        $user = $this->users->findById($userId);
        $response = ['user' => $this->users->safeUser($user)];
        Response::success($response, 201);
    }

    public function login(Request $request): void
    {
        $payload = $request->json();
        $email = trim((string) ($payload['email'] ?? ''));
        $password = (string) ($payload['password'] ?? '');

        if ($email === '' || $password === '') {
            Response::error('Please provide both your email and password.', 422);
        }

        $user = $this->users->findByEmail($email);
        if ($user === null || !PasswordService::verify($password, (string) $user['password_hash'])) {
            Response::error('Invalid email or password.', 401, 'invalid_credentials');
        }

        $token = TokenService::generateRandomToken(32);
        $tokenHash = TokenService::hashToken($token);
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'local-cli';
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

        $this->sessions->create((int) $user['id'], $tokenHash, $userAgent, $ipAddress, 24);
        $this->users->updateLastLogin((int) $user['id']);

        Response::success([
            'token' => $token,
            'user' => $this->users->safeUser($user),
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

        $user = $this->users->findById((int) $session['user_id']);
        if ($user === null) {
            Response::error('User not found.', 404);
        }

        Response::success([
            'user' => $this->users->safeUser($user),
        ]);
    }

    private function insertActivityFeed(int $userId, string $type, string $description, ?int $amountKobo): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO activity_feed (user_id, type, description, amount_kobo, created_at)
             VALUES (?, ?, ?, ?, NOW())'
        );
        $stmt->execute([$userId, $type, $description, $amountKobo]);
    }
}
