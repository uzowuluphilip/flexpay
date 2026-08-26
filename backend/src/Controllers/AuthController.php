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
use FlexPay\Services\MailService;
use FlexPay\Services\PasswordService;
use FlexPay\Services\TokenService;
use PDO;

final class AuthController
{
    private PDO $db;
    private UserRepository $users;
    private SessionRepository $sessions;
    private WalletRepository $wallets;
    private ReferralRepository $referrals;
    private MailService $mail;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
        $this->users = new UserRepository();
        $this->sessions = new SessionRepository();
        $this->wallets = new WalletRepository();
        $this->referrals = new ReferralRepository();
        $this->mail = new MailService();
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
        $requireEmailVerification = filter_var($_ENV['REQUIRE_EMAIL_VERIFICATION'] ?? 'true', FILTER_VALIDATE_BOOLEAN);
        if (!$requireEmailVerification) {
            $this->users->markEmailVerified($userId);
        }
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

        $verificationLink = null;
        $devModeData = [];

        if ($requireEmailVerification) {
        $rawVerificationToken = TokenService::generateRandomToken(32);
        $verificationHash = TokenService::hashToken($rawVerificationToken);
        $expiresAt = date('Y-m-d H:i:s', time() + 86400);

        $verificationStmt = $this->db->prepare(
            'INSERT INTO email_verifications (user_id, token_hash, expires_at, verified_at, created_at)
             VALUES (?, ?, ?, NULL, NOW())'
        );
        $verificationStmt->execute([$userId, $verificationHash, $expiresAt]);

        $verificationLink = ($_ENV['FRONTEND_URL'] ?? 'http://localhost:5173') . '/verify-email?token=' . urlencode($rawVerificationToken);
        $subject = 'Verify your FlexPay email';
        $mailBody = '<p>Hello ' . htmlspecialchars($fullName, ENT_QUOTES, 'UTF-8') . ',</p>'
            . '<p>Welcome to FlexPay! Please verify your email address by clicking the link below:</p>'
            . '<p><a href="' . htmlspecialchars($verificationLink, ENT_QUOTES, 'UTF-8') . '">Verify Email</a></p>';

        $mailResult = null;

        try {
            $mailResult = $this->mail->send(
                $email,
                $subject,
                $mailBody,
                "Welcome to FlexPay! Verify your email here: {$verificationLink}",
                $_ENV['MAIL_FROM'] ?? 'FlexPay <onboarding@resend.dev>'
            );

            $this->insertEmailLog(
                $userId,
                'email_verification',
                $email,
                $mailResult['id'] ?? null,
                ($mailResult !== null ? 'sent' : 'failed'),
                $subject,
                $verificationLink
            );
        } catch (\Throwable $exception) {
            if (MailService::localDevBypassEnabled() && MailService::isTestingOnlyRestrictionError($exception)) {
                $this->insertEmailLog($userId, 'email_verification', $email, null, 'logged_not_sent', $subject, $verificationLink);
                $devModeData = ['verification_link' => $verificationLink, 'email_status' => 'logged_not_sent'];
            } else {
                throw $exception;
            }
        }
        }

        $this->insertActivityFeed($userId, 'account', 'Wallet created', null);
        $this->insertActivityFeed($userId, 'welcome_bonus', 'Welcome bonus', $welcomeBonusKobo);

        $user = $this->users->findById($userId);
        $response = ['user' => $this->users->safeUser($user)];
        if ($devModeData !== []) {
            $response['dev_mode'] = $devModeData;
            $response['verification_link'] = $verificationLink;
        }

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

    public function verifyEmail(Request $request): void
    {
        $payload = $request->json();
        $token = trim((string) ($payload['token'] ?? ''));

        if ($token === '') {
            Response::error('Verification token is required.', 422);
        }

        $tokenHash = TokenService::hashToken($token);
        $stmt = $this->db->prepare(
            'SELECT * FROM email_verifications WHERE token_hash = ? AND verified_at IS NULL AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute([$tokenHash]);
        $verification = $stmt->fetch();

        if ($verification === false) {
            Response::error('The verification link is invalid or has expired.', 400, 'invalid_verification_token');
        }

        $user = $this->users->findById((int) $verification['user_id']);
        if ($user === null) {
            Response::error('User not found.', 404);
        }

        $this->users->markEmailVerified((int) $user['id']);
        $this->db->prepare('UPDATE email_verifications SET verified_at = NOW() WHERE id = ?')->execute([$verification['id']]);

        $this->insertActivityFeed((int) $user['id'], 'account', 'Email verified', null);

        Response::success([
            'verified' => true,
            'user' => $this->users->safeUser($user),
        ]);
    }

    public function resendVerification(Request $request): void
    {
        $payload = $request->json();
        $email = trim((string) ($payload['email'] ?? ''));

        if ($email === '') {
            Response::success(['sent' => true]);
        }

        $user = $this->users->findByEmail($email);
        $devModeData = [];
        $verificationLink = null;

        if ($user !== null && ($user['email_verified_at'] === null || $user['email_verified_at'] === '')) {
            $rawToken = TokenService::generateRandomToken(32);
            $tokenHash = TokenService::hashToken($rawToken);
            $expiresAt = date('Y-m-d H:i:s', time() + 86400);

            $stmt = $this->db->prepare(
                'INSERT INTO email_verifications (user_id, token_hash, expires_at, verified_at, created_at)
                 VALUES (?, ?, ?, NULL, NOW())'
            );
            $stmt->execute([(int) $user['id'], $tokenHash, $expiresAt]);

            $verificationLink = ($_ENV['FRONTEND_URL'] ?? 'http://localhost:5173') . '/verify-email?token=' . urlencode($rawToken);
            $subject = 'Verify your email';

            try {
                $mailResponse = $this->mail->send(
                    $email,
                    $subject,
                    '<p>Use this link to verify your email: <a href="' . htmlspecialchars($verificationLink, ENT_QUOTES, 'UTF-8') . '">Verify Email</a></p>',
                    "Verify your email: {$verificationLink}",
                    $_ENV['MAIL_FROM'] ?? 'FlexPay <onboarding@resend.dev>'
                );

                $this->insertEmailLog(
                    (int) $user['id'],
                    'email_verification',
                    $email,
                    $mailResponse['id'] ?? null,
                    ($mailResponse !== null ? 'sent' : 'failed'),
                    $subject,
                    $verificationLink
                );
            } catch (\Throwable $exception) {
                if (MailService::localDevBypassEnabled() && MailService::isTestingOnlyRestrictionError($exception)) {
                    $this->insertEmailLog((int) $user['id'], 'email_verification', $email, null, 'logged_not_sent', $subject, $verificationLink);
                    $devModeData = ['verification_link' => $verificationLink, 'email_status' => 'logged_not_sent'];
                } else {
                    throw $exception;
                }
            }
        }

        $response = ['sent' => true];
        if ($devModeData !== []) {
            $response['dev_mode'] = $devModeData;
            $response['verification_link'] = $verificationLink;
        }

        Response::success($response);
    }

    public function forgotPassword(Request $request): void
    {
        $payload = $request->json();
        $email = trim((string) ($payload['email'] ?? ''));

        if ($email === '') {
            Response::success(['sent' => true]);
        }

        $user = $this->users->findByEmail($email);
        $devModeData = [];
        $resetLink = null;

        if ($user !== null) {
            $rawToken = TokenService::generateRandomToken(32);
            $tokenHash = TokenService::hashToken($rawToken);
            $expiresAt = date('Y-m-d H:i:s', time() + 3600 * 2);

            $stmt = $this->db->prepare(
                'INSERT INTO password_resets (user_id, token_hash, expires_at, used_at, created_at)
                 VALUES (?, ?, ?, NULL, NOW())'
            );
            $stmt->execute([(int) $user['id'], $tokenHash, $expiresAt]);

            $resetLink = ($_ENV['FRONTEND_URL'] ?? 'http://localhost:5173') . '/reset-password?token=' . urlencode($rawToken) . '&email=' . urlencode($email);
            $subject = 'Reset your FlexPay password';

            try {
                $mailResponse = $this->mail->send(
                    $email,
                    $subject,
                    '<p>Use this link to reset your password: <a href="' . htmlspecialchars($resetLink, ENT_QUOTES, 'UTF-8') . '">Reset Password</a></p>',
                    "Reset your password: {$resetLink}",
                    $_ENV['MAIL_FROM'] ?? 'FlexPay <onboarding@resend.dev>'
                );

                $this->insertEmailLog(
                    (int) $user['id'],
                    'password_reset',
                    $email,
                    $mailResponse['id'] ?? null,
                    ($mailResponse !== null ? 'sent' : 'failed'),
                    $subject,
                    $resetLink
                );
            } catch (\Throwable $exception) {
                if (MailService::localDevBypassEnabled() && MailService::isTestingOnlyRestrictionError($exception)) {
                    $this->insertEmailLog((int) $user['id'], 'password_reset', $email, null, 'logged_not_sent', $subject, $resetLink);
                    $devModeData = ['reset_link' => $resetLink, 'email_status' => 'logged_not_sent'];
                } else {
                    throw $exception;
                }
            }
        }

        $response = ['sent' => true];
        if ($devModeData !== []) {
            $response['dev_mode'] = $devModeData;
            $response['reset_link'] = $resetLink;
        }

        Response::success($response);
    }

    public function resetPassword(Request $request): void
    {
        $payload = $request->json();
        $token = trim((string) ($payload['token'] ?? ''));
        $newPassword = (string) ($payload['new_password'] ?? '');

        if ($token === '' || $newPassword === '') {
            Response::error('A reset token and new password are required.', 422);
        }

        if (strlen($newPassword) < 8) {
            Response::error('Password must be at least 8 characters long.', 422);
        }

        $tokenHash = TokenService::hashToken($token);
        $stmt = $this->db->prepare(
            'SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute([$tokenHash]);
        $reset = $stmt->fetch();

        if ($reset === false) {
            Response::error('This reset link is invalid or expired.', 400, 'invalid_reset_token');
        }

        $user = $this->users->findById((int) $reset['user_id']);
        if ($user === null) {
            Response::error('User not found.', 404);
        }

        $this->users->updatePassword((int) $user['id'], PasswordService::hash($newPassword));
        $this->db->prepare('UPDATE password_resets SET used_at = NOW() WHERE id = ?')->execute([$reset['id']]);
        $this->sessions->deleteByUserId((int) $user['id']);

        Response::success(['reset' => true]);
    }

    private function insertEmailLog(int $userId, string $type, string $recipient, ?string $resendId, string $status, ?string $subject = null, ?string $link = null): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO email_log (user_id, type, recipient, resend_id, status, subject, content_text, link_url, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())'
        );
        $stmt->execute([$userId, $type, $recipient, $resendId, $status, $subject, $link, $link]);
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
