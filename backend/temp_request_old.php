    public function json(): array
    {
        if (array_key_exists('__wallet_payload', $_SERVER) && is_array($_SERVER['__wallet_payload'])) {
            return $_SERVER['__wallet_payload'];
        }

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
