// Security utilities

// Cap pagination limit
function capLimit(value, defaultLimit = 50, maxLimit = 200) {
    const parsed = parseInt(value);
    // If NaN or undefined, use default. If valid (including 0), clamp it.
    if (isNaN(parsed)) return defaultLimit;
    return Math.min(Math.max(parsed, 1), maxLimit);
}

// Validate email format
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate password strength
function isStrongPassword(password) {
    return typeof password === 'string' && password.length >= 8;
}

// Sanitize error message (don't leak internals)
function safeError(err, fallback = 'An error occurred') {
    console.error(fallback + ':', err.message || err);
    return fallback;
}

// Validate webhook URL (prevent SSRF)
function isValidWebhookUrl(url) {
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) return false;
        const host = parsed.hostname.toLowerCase();
        // Block internal/private IPs
        if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false;
        if (host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('172.')) return false;
        if (host === '169.254.169.254') return false; // AWS metadata
        return true;
    } catch {
        return false;
    }
}

module.exports = { capLimit, isValidEmail, isStrongPassword, safeError, isValidWebhookUrl };
