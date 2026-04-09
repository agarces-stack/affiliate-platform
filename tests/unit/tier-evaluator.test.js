const { test, describe, mock } = require('node:test');
const assert = require('node:assert');

// Mock the db module BEFORE requiring tier-evaluator
const mockDb = {
    query: async () => ({ rows: [] }),
    pool: { connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }) }
};
require.cache[require.resolve('../../src/models/db')] = {
    exports: mockDb,
    loaded: true,
    id: require.resolve('../../src/models/db'),
    filename: require.resolve('../../src/models/db')
};

const { getTimeframeDates, calculateProgressiveCommission } = require('../../src/services/tier-evaluator');

describe('getTimeframeDates', () => {
    test('all_time returns null for both dates', () => {
        const { startDate, endDate } = getTimeframeDates('all_time');
        assert.strictEqual(startDate, null);
        assert.strictEqual(endDate, null);
    });

    test('this_month starts at day 1', () => {
        const { startDate, endDate } = getTimeframeDates('this_month');
        assert.ok(startDate instanceof Date);
        assert.strictEqual(startDate.getDate(), 1);
        assert.strictEqual(endDate, null);
    });

    test('last_month has start and end dates', () => {
        const { startDate, endDate } = getTimeframeDates('last_month');
        assert.ok(startDate instanceof Date);
        assert.ok(endDate instanceof Date);
        assert.strictEqual(startDate.getDate(), 1);
    });

    test('this_year starts January 1', () => {
        const { startDate } = getTimeframeDates('this_year');
        assert.strictEqual(startDate.getMonth(), 0);
        assert.strictEqual(startDate.getDate(), 1);
    });

    test('last_year has full year range', () => {
        const { startDate, endDate } = getTimeframeDates('last_year');
        assert.strictEqual(startDate.getMonth(), 0);
        assert.strictEqual(startDate.getDate(), 1);
        assert.strictEqual(endDate.getMonth(), 11);
        assert.strictEqual(endDate.getDate(), 31);
    });

    test('unknown timeframe defaults to all_time', () => {
        const { startDate, endDate } = getTimeframeDates('invalid');
        assert.strictEqual(startDate, null);
        assert.strictEqual(endDate, null);
    });
});

describe('calculateProgressiveCommission', () => {
    test('returns null when no rules configured', async () => {
        mockDb.query = async () => ({ rows: [] });
        const result = await calculateProgressiveCommission(1000, 1, null, 1);
        assert.strictEqual(result, null);
    });

    test('calculates single-tier commission correctly', async () => {
        mockDb.query = async () => ({
            rows: [
                { min_amount: 0, max_amount: null, commission_percent: 10, commission_fixed: 0 }
            ]
        });
        const result = await calculateProgressiveCommission(500, 1, null, 1);
        // 500 * 10% = 50
        assert.strictEqual(result, 50);
    });

    test('calculates tiered commission - stays in first tier', async () => {
        mockDb.query = async () => ({
            rows: [
                { min_amount: 0, max_amount: 1000, commission_percent: 5, commission_fixed: 0 },
                { min_amount: 1000, max_amount: 5000, commission_percent: 7, commission_fixed: 0 },
                { min_amount: 5000, max_amount: null, commission_percent: 10, commission_fixed: 0 }
            ]
        });
        const result = await calculateProgressiveCommission(500, 1, null, 1);
        // 500 * 5% = 25
        assert.strictEqual(result, 25);
    });

    test('calculates tiered commission - crosses tiers', async () => {
        mockDb.query = async () => ({
            rows: [
                { min_amount: 0, max_amount: 1000, commission_percent: 5, commission_fixed: 0 },
                { min_amount: 1000, max_amount: 5000, commission_percent: 7, commission_fixed: 0 },
                { min_amount: 5000, max_amount: null, commission_percent: 10, commission_fixed: 0 }
            ]
        });
        // Amount: 3000
        // Tier 1 (0-1000): 1000 * 5% = 50
        // Tier 2 (1000-3000 of 5000): 2000 * 7% = 140
        // Total: 190
        const result = await calculateProgressiveCommission(3000, 1, null, 1);
        assert.strictEqual(result, 190);
    });

    test('handles fixed commission per tier', async () => {
        mockDb.query = async () => ({
            rows: [
                { min_amount: 0, max_amount: 1000, commission_percent: 5, commission_fixed: 10 }
            ]
        });
        // 500 * 5% + 10 = 25 + 10 = 35
        const result = await calculateProgressiveCommission(500, 1, null, 1);
        assert.strictEqual(result, 35);
    });

    test('handles 0 amount', async () => {
        mockDb.query = async () => ({
            rows: [
                { min_amount: 0, max_amount: null, commission_percent: 10, commission_fixed: 5 }
            ]
        });
        const result = await calculateProgressiveCommission(0, 1, null, 1);
        assert.strictEqual(result, 0);
    });
});
