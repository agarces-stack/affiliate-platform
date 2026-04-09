const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');

// Mock db and notifications before requiring rank-evaluator
let dbQueries = [];
let dbResponses = [];
let notificationsSent = [];

const mockDb = {
    query: async (sql, params) => {
        dbQueries.push({ sql, params });
        return dbResponses.shift() || { rows: [] };
    },
    pool: {}
};

const mockNotifications = {
    Notify: {
        rankPromotion: (...args) => { notificationsSent.push({ type: 'rank', args }); }
    }
};

require.cache[require.resolve('../../src/models/db')] = {
    exports: mockDb, loaded: true,
    id: require.resolve('../../src/models/db'),
    filename: require.resolve('../../src/models/db')
};
require.cache[require.resolve('../../src/services/notifications')] = {
    exports: mockNotifications, loaded: true,
    id: require.resolve('../../src/services/notifications'),
    filename: require.resolve('../../src/services/notifications')
};

const { evaluateRankUp } = require('../../src/services/rank-evaluator');

describe('evaluateRankUp', () => {
    beforeEach(() => {
        dbQueries = [];
        dbResponses = [];
        notificationsSent = [];
    });

    test('returns null if affiliate not found', async () => {
        dbResponses = [{ rows: [] }]; // affiliate query returns empty
        const result = await evaluateRankUp(999, 1);
        assert.strictEqual(result, null);
    });

    test('returns not promoted if already at highest qualifying rank', async () => {
        dbResponses = [
            { rows: [{ id: 1, rank: 3, total_conversions: 5 }] }, // current affiliate
            { rows: [
                { rank_number: 1, min_personal_sales: 0, min_team_sales: 0, min_direct_recruits: 0 },
                { rank_number: 2, min_personal_sales: 5, min_team_sales: 0, min_direct_recruits: 0 },
                { rank_number: 3, min_personal_sales: 10, min_team_sales: 0, min_direct_recruits: 0 },
                { rank_number: 4, min_personal_sales: 100, min_team_sales: 0, min_direct_recruits: 0 }
            ]}, // ranks
            { rows: [{ total: '2' }] }, // direct recruits
            { rows: [{ total: '0' }] }  // team sales
        ];
        // 5 sales, rank 3 requires 10 sales -> stays at 3
        const result = await evaluateRankUp(1, 1);
        assert.strictEqual(result.promoted, false);
        assert.strictEqual(result.currentRank, 3);
    });

    test('promotes when requirements met', async () => {
        dbResponses = [
            { rows: [{ id: 1, rank: 1, total_conversions: 15 }] },
            { rows: [
                { rank_number: 1, min_personal_sales: 0, min_team_sales: 0, min_direct_recruits: 0, name: 'Agente' },
                { rank_number: 2, min_personal_sales: 5, min_team_sales: 0, min_direct_recruits: 0, name: 'Senior' },
                { rank_number: 3, min_personal_sales: 10, min_team_sales: 0, min_direct_recruits: 0, name: 'Lider' },
                { rank_number: 4, min_personal_sales: 100, min_team_sales: 0, min_direct_recruits: 0, name: 'Manager' }
            ]},
            { rows: [{ total: '2' }] },
            { rows: [{ total: '0' }] },
            { rows: [] }, // UPDATE
            { rows: [] }  // INSERT history
        ];
        const result = await evaluateRankUp(1, 1);
        assert.strictEqual(result.promoted, true);
        assert.strictEqual(result.oldRank, 1);
        assert.strictEqual(result.newRank, 3);
        // Notification should be sent
        assert.strictEqual(notificationsSent.length, 1);
        assert.strictEqual(notificationsSent[0].type, 'rank');
    });

    test('respects team_sales requirement', async () => {
        dbResponses = [
            { rows: [{ id: 1, rank: 1, total_conversions: 20 }] },
            { rows: [
                { rank_number: 1, min_personal_sales: 0, min_team_sales: 0, min_direct_recruits: 0 },
                { rank_number: 2, min_personal_sales: 5, min_team_sales: 100, min_direct_recruits: 0, name: 'Senior' }
            ]},
            { rows: [{ total: '3' }] },
            { rows: [{ total: '50' }] } // only 50 team sales, needs 100
        ];
        const result = await evaluateRankUp(1, 1);
        assert.strictEqual(result.promoted, false);
    });

    test('respects direct_recruits requirement', async () => {
        dbResponses = [
            { rows: [{ id: 1, rank: 1, total_conversions: 50 }] },
            { rows: [
                { rank_number: 1, min_personal_sales: 0, min_team_sales: 0, min_direct_recruits: 0 },
                { rank_number: 2, min_personal_sales: 10, min_team_sales: 0, min_direct_recruits: 5, name: 'Senior' }
            ]},
            { rows: [{ total: '2' }] }, // only 2 recruits, needs 5
            { rows: [{ total: '1000' }] }
        ];
        const result = await evaluateRankUp(1, 1);
        assert.strictEqual(result.promoted, false);
    });

    test('never demotes - only promotes', async () => {
        dbResponses = [
            { rows: [{ id: 1, rank: 5, total_conversions: 5 }] },
            { rows: [
                { rank_number: 1, min_personal_sales: 0, min_team_sales: 0, min_direct_recruits: 0 },
                { rank_number: 2, min_personal_sales: 5, min_team_sales: 0, min_direct_recruits: 0 },
                { rank_number: 5, min_personal_sales: 100, min_team_sales: 0, min_direct_recruits: 0 }
            ]},
            { rows: [{ total: '0' }] },
            { rows: [{ total: '0' }] }
        ];
        // Currently rank 5 with only 5 sales (should require 100), but never demotes
        const result = await evaluateRankUp(1, 1);
        assert.strictEqual(result.promoted, false);
        assert.strictEqual(result.currentRank, 5);
    });
});
