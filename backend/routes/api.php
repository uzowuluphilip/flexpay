<?php

declare(strict_types=1);

return [
    ['POST', '/api/auth/register'],
    ['POST', '/api/auth/login'],
    ['POST', '/api/auth/logout'],
    ['GET', '/api/auth/me'],
    ['POST', '/api/auth/verify-email'],
    ['POST', '/api/auth/resend-verification'],
    ['POST', '/api/auth/forgot-password'],
    ['POST', '/api/auth/reset-password'],
];
