# Testing Guide - MagnetRaffic

## Stack

- **Test runner:** Node.js built-in (`node:test`) - no external dependencies
- **Assertion library:** Node.js built-in (`node:assert`)
- **Mocking:** Native module cache injection (no mocking library needed)
- **Coverage:** 0 extra packages

## Run Tests

```bash
# Run all tests
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Run specific test file
node --test tests/unit/security.test.js
```

## Test Suites

| File | Tests | Coverage |
|------|-------|----------|
| `security.test.js` | 15 | capLimit, isValidEmail, isStrongPassword, isValidWebhookUrl |
| `tier-evaluator.test.js` | 12 | getTimeframeDates, calculateProgressiveCommission |
| `rag.test.js` | 7 | chunkText document splitting |
| `rank-evaluator.test.js` | 6 | evaluateRankUp with mocked DB |
| **TOTAL** | **40** | **All critical financial logic** |

## What's Tested

### Critical Financial Flows
- Progressive commission calculation (tiered by amount)
- Rank promotion evaluation (requirements, never demotes)
- Tier timeframe calculations (all_time, monthly, yearly)

### Security
- Pagination limit capping (DoS protection)
- Email validation
- Password strength
- SSRF protection in webhooks (localhost, private IPs, AWS metadata)

### AI / RAG
- Document chunking with overlap
- Size limits enforcement
- Short text filtering

## Mocking Pattern

Tests mock the `db` module by injecting into `require.cache`:

```javascript
const mockDb = { query: async () => ({ rows: [] }), pool: {} };
require.cache[require.resolve('../../src/models/db')] = {
    exports: mockDb, loaded: true,
    id: require.resolve('../../src/models/db'),
    filename: require.resolve('../../src/models/db')
};

// Now require the service - it will use mockDb
const { evaluateRankUp } = require('../../src/services/rank-evaluator');
```

## Bugs Found by Tests

### Bug 1: capLimit('0') returned default
- **Issue:** `parseInt('0') || defaultLimit` returns defaultLimit because 0 is falsy
- **Fix:** Use `isNaN(parsed)` check instead of `||` fallback

### Bug 2: isStrongPassword accepted non-strings
- **Issue:** No type check, could accept objects with `.length` property
- **Fix:** Explicit `typeof password === 'string'` check

## What's NOT Tested Yet

- Route handlers (integration tests needed with test DB)
- Fraud detection logic (depends heavily on DB queries)
- MLM override commission cascade (integration)
- Payment provider integrations (PayPal sandbox needed)
- Frontend JS modules (would need jsdom)

## Adding New Tests

1. Create file in `tests/unit/[name].test.js`
2. Use `describe()` and `test()` from `node:test`
3. Use `assert` from `node:assert`
4. Mock DB if needed via `require.cache` injection
5. Run `npm test` to verify

Example:
```javascript
const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('myFeature', () => {
    test('does the right thing', () => {
        assert.strictEqual(myFunction(2, 2), 4);
    });
});
```
