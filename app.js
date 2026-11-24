// LNbits Wallet App
const API_BASE = 'api.php?action=';

let currentInvoice = null;
let checkPaymentInterval = null;
let cameraStream = null;
let scannerActive = false;
let qrDetector = null;
let scannerCanvas = null;
let scannerRequestId = 0;

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(tab).classList.add('active');

        if (tab !== 'send') stopQrScanner();
        if (tab === 'history') loadHistory();
    });
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopQrScanner();
});

async function ensureJsQRLoaded() {
    if (typeof window.jsQR === "function") return true;

    const sources = [
        "jsQR.min.js",
        "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js",
        "https://unpkg.com/jsqr@1.4.0/dist/jsQR.js"
    ];

    for (const src of sources) {
        try {
            await new Promise((resolve, reject) => {
                const s = document.createElement("script");
                s.src = src;
                s.onload = () => (typeof window.jsQR === "function" ? resolve() : reject());
                s.onerror = reject;
                document.head.appendChild(s);
            });
            if (typeof window.jsQR === "function") return true;
        } catch (e) {
            // continue to next source
        }
    }
    return typeof window.jsQR === "function";
}

async function startQrScanner() {
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Camera access requires HTTPS (or localhost) and a supported browser', 'error');
        return;
    }

    qrDetector = null;
    if ('BarcodeDetector' in window) {
        try {
            qrDetector = new BarcodeDetector({ formats: ['qr_code'] });
        } catch (err) {
            qrDetector = null;
        }
    }

    if (!qrDetector && typeof window.jsQR !== 'function') {
        const loaded = await ensureJsQRLoaded();
        if (!loaded) {
            showToast('QR scanning is unavailable. Check your internet connection and try again.', 'error');
            return;
        }
    }

    const video = document.getElementById('scanner-video');
    document.getElementById('scanner').classList.remove('hidden');
    document.getElementById('scanner-status').textContent = 'Requesting camera access...';
    document.getElementById('btn-scan').disabled = true;
    const requestId = ++scannerRequestId;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false
        });
        if (requestId !== scannerRequestId) {
            stream.getTracks().forEach(track => track.stop());
            return;
        }
        cameraStream = stream;
        video.srcObject = cameraStream;
        await video.play();
        if (requestId !== scannerRequestId) return;
        scannerCanvas = document.createElement('canvas');
        scannerActive = true;
        document.getElementById('scanner-status').textContent = 'Point your camera at a Lightning invoice QR code.';
        scanQrFrame();
    } catch (err) {
        if (requestId !== scannerRequestId) return;
        stopQrScanner();
        let message = 'Could not start the camera';
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
            message = 'Camera permission was denied. Allow camera access in your browser settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            message = 'No camera was found on this device.';
        }
        document.getElementById('scanner-status').textContent = message;
        document.getElementById('scanner').classList.remove('hidden');
        showToast(message, 'error');
    }
}

async function scanQrFrame() {
    if (!scannerActive) return;

    const video = document.getElementById('scanner-video');
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        try {
            let decoded = null;
            if (qrDetector) {
                const codes = await qrDetector.detect(video);
                decoded = codes.length ? codes[0].rawValue : null;
            } else {
                const canvas = scannerCanvas;
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const context = canvas.getContext('2d', { willReadFrequently: true });
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const image = context.getImageData(0, 0, canvas.width, canvas.height);
                const result = window.jsQR(image.data, image.width, image.height);
                decoded = result ? result.data : null;
            }

            if (!scannerActive) return;
            if (decoded) {
                handleScannedQr(decoded);
                return;
            }
        } catch (err) {
            if (!scannerActive) return;
            stopQrScanner();
            const message = 'Unable to read the camera image. Please try again.';
            document.getElementById('scanner-status').textContent = message;
            document.getElementById('scanner').classList.remove('hidden');
            showToast(message, 'error');
            console.error('QR scanner error:', err);
            return;
        }
    }

    if (scannerActive) setTimeout(scanQrFrame, 200);
}

function handleScannedQr(value) {
    const invoice = value.trim().replace(/^lightning:/i, '').trim();
    if (!/^lnbc/i.test(invoice)) {
        stopQrScanner();
        const message = 'This QR code is not a supported mainnet Lightning invoice.';
        document.getElementById('scanner-status').textContent = message;
        document.getElementById('scanner').classList.remove('hidden');
        showToast(message, 'error');
        return;
    }

    document.getElementById('send-invoice').value = invoice.toLowerCase();
    stopQrScanner();
    document.getElementById('decode-result').classList.add('hidden');
    document.getElementById('pay-result').classList.add('hidden');
    showToast('Invoice scanned. Decoding...', 'success');
    decodeInvoice();
}

function stopQrScanner() {
    scannerRequestId++;
    scannerActive = false;
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    const video = document.getElementById('scanner-video');
    if (video) video.srcObject = null;
    const scanner = document.getElementById('scanner');
    if (scanner) scanner.classList.add('hidden');
    const button = document.getElementById('btn-scan');
    if (button) button.disabled = false;
}

// Load wallet balance on startup
async function loadWallet() {
    try {
        const res = await fetch(API_BASE + 'wallet');
        const data = await res.json();

        if (data.error) {
            showToast('Error: ' + data.error, 'error');
            document.getElementById('balance').textContent = 'Error';
            return;
        }

        const balance = (data.balance / 1000).toLocaleString();
        document.getElementById('balance').textContent = balance;
    } catch (err) {
        showToast('Failed to connect to LNbits', 'error');
        document.getElementById('balance').textContent = 'Offline';
    }
}

// Create Invoice
async function createInvoice() {
    const amount = parseInt(document.getElementById('recv-amount').value);
    const memo = document.getElementById('recv-memo').value || 'LNbits Wallet';

    if (!amount || amount < 1) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    const btn = document.getElementById('btn-create');
    btn.disabled = true;
    btn.textContent = 'Creating...';

    try {
        const res = await fetch(API_BASE + 'create_invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, memo })
        });

        const data = await res.json();

        if (data.error) {
            showToast('Error: ' + data.error, 'error');
            return;
        }

        currentInvoice = data;

        // Show result
        const resultDiv = document.getElementById('invoice-result');
        resultDiv.classList.remove('hidden');

        // Generate QR
        document.getElementById('qrcode').innerHTML = '';
        new QRCode(document.getElementById('qrcode'), {
            text: data.payment_request,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });

        document.getElementById('invoice-text').value = data.payment_request;

        // Start checking payment status
        const statusDiv = document.getElementById('payment-status');
        statusDiv.className = 'payment-status pending';
        statusDiv.textContent = 'Waiting for payment...';

        if (checkPaymentInterval) clearInterval(checkPaymentInterval);
        checkPaymentInterval = setInterval(() => checkPayment(data.payment_hash), 3000);

        showToast('Invoice created!', 'success');
    } catch (err) {
        showToast('Failed to create invoice', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Invoice';
    }
}

// Check payment status
async function checkPayment(paymentHash) {
    try {
        const res = await fetch(API_BASE + 'check_payment&hash=' + paymentHash);
        const data = await res.json();

        const statusDiv = document.getElementById('payment-status');

        if (data.paid === true) {
            statusDiv.className = 'payment-status paid';
            statusDiv.textContent = 'Payment received!';
            clearInterval(checkPaymentInterval);
            loadWallet();
            showToast('Payment received!', 'success');
        }
    } catch (err) {
        console.error('Check payment error:', err);
    }
}

// Copy invoice
function copyInvoice() {
    const text = document.getElementById('invoice-text');
    text.select();
    document.execCommand('copy');
    showToast('Invoice copied to clipboard', 'success');
}

// Decode Invoice
async function decodeInvoice() {
    const bolt11 = document.getElementById('send-invoice').value.trim();

    if (!bolt11 || !/^lnbc/i.test(bolt11)) {
        showToast('Please paste a valid Lightning invoice', 'error');
        return;
    }

    const btn = document.getElementById('btn-decode');
    btn.disabled = true;
    btn.textContent = 'Decoding...';

    try {
        const res = await fetch(API_BASE + 'decode_invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bolt11 })
        });

        const data = await res.json();

        if (data.error) {
            showToast('Error: ' + data.error, 'error');
            return;
        }

        const resultDiv = document.getElementById('decode-result');
        resultDiv.classList.remove('hidden');

        const amountMsat = data.amount_msat || data.amount * 1000 || 0;
        document.getElementById('decode-amount').textContent = (amountMsat / 1000).toLocaleString() + ' sats';
        document.getElementById('decode-memo').textContent = data.description || 'No description';

        const expiryDate = data.date_string ? new Date(data.date_string).toLocaleString() : 'Unknown';
        document.getElementById('decode-expiry').textContent = expiryDate;

    } catch (err) {
        showToast('Failed to decode invoice', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Decode Invoice';
    }
}

// Pay Invoice
async function payInvoice() {
    const bolt11 = document.getElementById('send-invoice').value.trim();

    if (!confirm('Are you sure you want to pay this invoice?')) {
        return;
    }

    const btn = document.getElementById('btn-pay');
    btn.disabled = true;
    btn.textContent = 'Paying...';

    try {
        const res = await fetch(API_BASE + 'pay_invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bolt11 })
        });

        const data = await res.json();
        const resultDiv = document.getElementById('pay-result');
        resultDiv.classList.remove('hidden');

        if (data.error) {
            resultDiv.innerHTML = '<div class="payment-status" style="background: #ffebee; color: #c62828;">Payment failed: ' + data.error + '</div>';
            showToast('Payment failed', 'error');
        } else if (data.payment_hash) {
            resultDiv.innerHTML = '<div class="payment-status paid">Payment sent! Hash: ' + data.payment_hash.substring(0, 16) + '...</div>';
            document.getElementById('send-invoice').value = '';
            document.getElementById('decode-result').classList.add('hidden');
            loadWallet();
            showToast('Payment sent!', 'success');
        } else {
            resultDiv.innerHTML = '<div class="payment-status pending">Unexpected response</div>';
        }
    } catch (err) {
        showToast('Failed to send payment', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Pay Invoice';
    }
}

// Load History
async function loadHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '<p class="empty">Loading...</p>';

    try {
        const res = await fetch(API_BASE + 'payments&limit=50');
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            list.innerHTML = '<p class="empty">No transactions yet</p>';
            return;
        }

        list.innerHTML = data.map(payment => {
            const isIncoming = !payment.pending && payment.amount > 0;
            const isOutgoing = payment.amount < 0;
            const amount = Math.abs(payment.amount / 1000);
            const date = new Date(payment.time * 1000).toLocaleString();
            const memo = payment.memo || 'No memo';
            const amountClass = isIncoming ? 'incoming' : (isOutgoing ? 'outgoing' : '');
            const sign = isIncoming ? '+' : '';

            return '<div class="history-item">' +
                '<div class="history-info">' +
                    '<div class="history-memo">' + escapeHtml(memo) + '</div>' +
                    '<div class="history-date">' + date + '</div>' +
                '</div>' +
                '<div class="history-amount ' + amountClass + '">' + sign + amount.toLocaleString() + '</div>' +
            '</div>';
        }).join('');
    } catch (err) {
        list.innerHTML = '<p class="empty">Failed to load history</p>';
    }
}

// Utility: Show toast
function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + (type || '');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Utility: Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize
loadWallet();
