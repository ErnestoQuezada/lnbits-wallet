<?php
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = $_GET['action'] ?? '';

function lnbits_request($endpoint, $method = 'GET', $data = null, $api_key = null) {
    $url = rtrim(LNBITS_URL, '/') . $endpoint;
    $ch = curl_init($url);

    $headers = ['Content-Type: application/json'];
    if ($api_key) {
        $headers[] = 'X-Api-Key: ' . $api_key;
    }

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
    }

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        echo json_encode(['error' => 'cURL Error: ' . $error]);
        exit;
    }

    http_response_code($http_code);
    echo $response;
}

switch ($action) {
    case 'wallet':
        // Get wallet details and balance
        lnbits_request('/api/v1/wallet', 'GET', null, ADMIN_KEY);
        break;

    case 'payments':
        // Get payment history
        $limit = intval($_GET['limit'] ?? 50);
        lnbits_request('/api/v1/payments?limit=' . $limit, 'GET', null, ADMIN_KEY);
        break;

    case 'create_invoice':
        // Create a new invoice
        $input = json_decode(file_get_contents('php://input'), true);
        $data = [
            'out' => false,
            'amount' => intval($input['amount'] ?? 0),
            'memo' => $input['memo'] ?? 'LNbits Wallet',
            'unit' => $input['unit'] ?? 'sat'
        ];
        lnbits_request('/api/v1/payments', 'POST', $data, ADMIN_KEY);
        break;

    case 'pay_invoice':
        // Pay an invoice
        $input = json_decode(file_get_contents('php://input'), true);
        $data = [
            'out' => true,
            'bolt11' => $input['bolt11'] ?? ''
        ];
        lnbits_request('/api/v1/payments', 'POST', $data, ADMIN_KEY);
        break;

    case 'decode_invoice':
        // Decode an invoice without paying
        $input = json_decode(file_get_contents('php://input'), true);
        $data = [
            'data' => $input['bolt11'] ?? ''
        ];
        lnbits_request('/api/v1/payments/decode', 'POST', $data, INVOICE_READ_KEY);
        break;

    case 'check_payment':
        // Check if a payment has been received
        $payment_hash = $_GET['hash'] ?? '';
        if (empty($payment_hash)) {
            echo json_encode(['error' => 'Payment hash required']);
            exit;
        }
        lnbits_request('/api/v1/payments/' . urlencode($payment_hash), 'GET', null, INVOICE_READ_KEY);
        break;

    default:
        echo json_encode(['error' => 'Unknown action: ' . $action]);
        break;
}
?>
