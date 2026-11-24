# LNbits Wallet Web App

A simple, self-hosted web wallet for LNbits. Runs on XAMPP (or any PHP server) and connects to your LNbits instance via a PHP proxy.

## Why PHP Proxy?

Since your LNbits runs on WSL (Ubuntu) and this web app runs on Windows (XAMPP), browsers block direct API calls due to CORS. The PHP proxy forwards requests from your web server to LNbits, avoiding this issue entirely.

## Setup

### 1. Configure your credentials

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and set your actual LNbits credentials:

```env
LNBITS_URL=http://localhost:5000
LNBITS_WALLET_ID=your-wallet-id
LNBITS_ADMIN_KEY=your-admin-key
LNBITS_INVOICE_READ_KEY=your-invoice-read-key
```

> **Note:** If LNbits is on WSL and XAMPP is on Windows, `localhost:5000` might not work from PHP. Use the WSL IP address instead (find it with `ip addr` in WSL, usually `172.x.x.x`).

### 2. Place files in XAMPP

Copy all files to your XAMPP htdocs folder, e.g.:

    C:\xampp\htdocs\lnbits-wallet\

### 3. Enable cURL in PHP

Make sure `extension=curl` is uncommented in `C:\xampp\php\php.ini`. Restart Apache if you change it.

### 4. Open in browser

Navigate to:

    http://localhost/lnbits-wallet/

## Features

- Balance display -- Real-time satoshi balance
- Receive -- Create Lightning invoices with QR codes
- Send -- Decode and pay Lightning invoices
- QR scanning -- Scan Lightning invoices using the phone's rear camera
- History -- View incoming/outgoing payments
- Auto-check -- Polls for invoice payment status
- Mobile-friendly -- Responsive design

## Security Warning

This app stores your **Admin Key** server-side in PHP. It is intended for **local/personal use only**. Do not expose this to the internet without additional security (HTTPS, authentication, IP restrictions).

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Failed to connect" | Check `LNBITS_URL` in config. Try WSL IP instead of localhost |
| cURL errors | Enable `extension=curl` in php.ini |
| CORS errors | Should not happen (PHP proxy handles it), but check browser console |
| QR code not showing | Check internet connection (loads from CDN) |
| Camera scanner does not start | Open the site over HTTPS (camera access is blocked on ordinary HTTP pages), allow camera permission, and use a modern browser |

To use the camera from an Android phone, open the site using its HTTPS address on your network. Browsers generally allow camera access on `localhost`, but not when the site is opened from another device over a plain `http://` LAN address.

## API Endpoints Used

- `GET /api/v1/wallet` -- Wallet info
- `GET /api/v1/payments` -- Payment history
- `POST /api/v1/payments` -- Create/pay invoices
- `POST /api/v1/payments/decode` -- Decode invoices
- `GET /api/v1/payments/{hash}` -- Check payment status
