<?php
/**
 * LNbits Wallet Configuration
 * Loads settings from .env file or environment variables.
 */

// Load from .env file if it exists
$env_file = __DIR__ . '/.env';
if (file_exists($env_file)) {
    $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if (!empty($key) && !isset($_ENV[$key])) {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}

// Define constants from environment variables with safe defaults
if (!defined('LNBITS_URL')) {
    define('LNBITS_URL', getenv('LNBITS_URL') ?: 'http://localhost:5000');
}
if (!defined('WALLET_ID')) {
    define('WALLET_ID', getenv('LNBITS_WALLET_ID') ?: '');
}
if (!defined('ADMIN_KEY')) {
    define('ADMIN_KEY', getenv('LNBITS_ADMIN_KEY') ?: '');
}
if (!defined('INVOICE_READ_KEY')) {
    define('INVOICE_READ_KEY', getenv('LNBITS_INVOICE_READ_KEY') ?: '');
}
?>