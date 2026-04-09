const { test, describe } = require('node:test');
const assert = require('node:assert');
const { capLimit, isValidEmail, isStrongPassword, isValidWebhookUrl } = require('../../src/utils/security');

describe('capLimit', () => {
    test('returns default when no value', () => {
        assert.strictEqual(capLimit(undefined, 50, 200), 50);
        assert.strictEqual(capLimit(null, 50, 200), 50);
        assert.strictEqual(capLimit('', 50, 200), 50);
    });

    test('parses string numbers', () => {
        assert.strictEqual(capLimit('10'), 10);
        assert.strictEqual(capLimit('100'), 100);
    });

    test('caps at max limit', () => {
        assert.strictEqual(capLimit('999999', 50, 200), 200);
        assert.strictEqual(capLimit('500'), 200);
    });

    test('enforces minimum of 1', () => {
        assert.strictEqual(capLimit('0'), 1);
        assert.strictEqual(capLimit('-10'), 1);
    });

    test('ignores invalid strings', () => {
        assert.strictEqual(capLimit('abc', 50, 200), 50);
    });
});

describe('isValidEmail', () => {
    test('accepts valid emails', () => {
        assert.strictEqual(isValidEmail('user@example.com'), true);
        assert.strictEqual(isValidEmail('admin@magnetraffic.com'), true);
        assert.strictEqual(isValidEmail('test.user+tag@sub.domain.co'), true);
    });

    test('rejects invalid emails', () => {
        assert.strictEqual(isValidEmail('notanemail'), false);
        assert.strictEqual(isValidEmail('@nodomain.com'), false);
        assert.strictEqual(isValidEmail('no@tld'), false);
        assert.strictEqual(isValidEmail('spaces in@email.com'), false);
        assert.strictEqual(isValidEmail(''), false);
        assert.strictEqual(isValidEmail(null), false);
    });
});

describe('isStrongPassword', () => {
    test('accepts 8+ chars', () => {
        assert.strictEqual(isStrongPassword('12345678'), true);
        assert.strictEqual(isStrongPassword('MyP@ssw0rd'), true);
    });

    test('rejects short passwords', () => {
        assert.strictEqual(isStrongPassword('1234567'), false);
        assert.strictEqual(isStrongPassword(''), false);
        assert.strictEqual(isStrongPassword(null), false);
        assert.strictEqual(isStrongPassword(undefined), false);
    });
});

describe('isValidWebhookUrl (SSRF protection)', () => {
    test('accepts valid external URLs', () => {
        assert.strictEqual(isValidWebhookUrl('https://example.com/webhook'), true);
        assert.strictEqual(isValidWebhookUrl('https://n8n.domain.com/hook/abc'), true);
        assert.strictEqual(isValidWebhookUrl('http://api.service.io'), true);
    });

    test('rejects localhost (SSRF)', () => {
        assert.strictEqual(isValidWebhookUrl('http://localhost:3000'), false);
        assert.strictEqual(isValidWebhookUrl('http://127.0.0.1/api'), false);
        assert.strictEqual(isValidWebhookUrl('http://0.0.0.0'), false);
    });

    test('rejects private IPs (SSRF)', () => {
        assert.strictEqual(isValidWebhookUrl('http://10.0.0.1/internal'), false);
        assert.strictEqual(isValidWebhookUrl('http://192.168.1.1/router'), false);
        assert.strictEqual(isValidWebhookUrl('http://172.16.0.1'), false);
    });

    test('rejects AWS metadata endpoint', () => {
        assert.strictEqual(isValidWebhookUrl('http://169.254.169.254/latest/meta-data/'), false);
    });

    test('rejects invalid protocols', () => {
        assert.strictEqual(isValidWebhookUrl('ftp://example.com'), false);
        assert.strictEqual(isValidWebhookUrl('file:///etc/passwd'), false);
        assert.strictEqual(isValidWebhookUrl('javascript:alert(1)'), false);
    });

    test('rejects malformed URLs', () => {
        assert.strictEqual(isValidWebhookUrl('not a url'), false);
        assert.strictEqual(isValidWebhookUrl(''), false);
    });
});
