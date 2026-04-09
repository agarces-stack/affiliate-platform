// Mock PostgreSQL en memoria para simulación
// Implementa lo suficiente de pg.Pool.query() para que los servicios funcionen

class MockDB {
    constructor() {
        this.tables = {
            companies: [],
            users: [],
            affiliates: [],
            campaigns: [],
            products: [],
            goals: [],
            ranks: [],
            rank_commissions: [],
            clicks: [],
            conversions: [],
            mlm_commissions: [],
            payouts: [],
            fraud_logs: [],
            blocked_ips: [],
            notifications: [],
            webhooks: [],
            account_movements: [],
            withdrawal_requests: [],
            rank_history: [],
            commission_tiers: [],
            affiliate_tiers: [],
            progressive_rules: [],
            renewals: [],
            commission_groups: [],
            group_commissions: [],
            postback_logs: [],
            activity_logs: [],
        };
        this.nextId = { default: 1 };
        this._setupSeed();
    }

    _setupSeed() {
        // Empresa
        this.tables.companies.push({
            id: 1, name: 'Test Insurance Co', slug: 'test', domain: 'test.com',
            override_mode: 'difference', max_recruitment_depth: 10,
            payout_schedule: 'on_request', min_payout_amount: 50, payout_hold_days: 0,
            auto_approve_payouts: false, mlm_commission_type: 'amount_based'
        });

        // Admin
        this.tables.users.push({
            id: 1, company_id: 1, email: 'admin@test.com', name: 'Admin',
            role: 'admin', is_active: true, password_hash: '$2a$10$test'
        });

        // Rangos 1-10
        const rankNames = ['Agent', 'Senior Agent', 'Team Lead', 'Senior Lead', 'Manager',
                          'Senior Manager', 'Director', 'Senior Director', 'VP', 'CEO'];
        for (let i = 1; i <= 10; i++) {
            this.tables.ranks.push({
                id: i, company_id: 1, rank_number: i, name: rankNames[i-1],
                can_recruit: true, max_recruit_depth: 0,
                min_personal_sales: i === 1 ? 0 : (i - 1) * 5,
                min_team_sales: 0, min_direct_recruits: 0,
                color: '#3b82f6'
            });
        }
    }

    _getId(table) {
        const key = table;
        if (!this.nextId[key]) {
            const existing = this.tables[table]?.map(r => r.id || 0) || [];
            this.nextId[key] = Math.max(0, ...existing) + 1;
        }
        return this.nextId[key]++;
    }

    async query(sql, params = []) {
        sql = sql.trim().replace(/\s+/g, ' ');
        const sqlLower = sql.toLowerCase();

        // INSERT
        if (sqlLower.startsWith('insert into')) {
            return this._handleInsert(sql, params);
        }

        // SELECT
        if (sqlLower.startsWith('select') || sqlLower.startsWith('with recursive')) {
            return this._handleSelect(sql, params);
        }

        // UPDATE
        if (sqlLower.startsWith('update')) {
            return this._handleUpdate(sql, params);
        }

        // DELETE
        if (sqlLower.startsWith('delete')) {
            return this._handleDelete(sql, params);
        }

        // Transaction commands (BEGIN, COMMIT, ROLLBACK)
        return { rows: [] };
    }

    _handleInsert(sql, params) {
        const tableMatch = sql.match(/insert into (\w+)/i);
        if (!tableMatch) return { rows: [] };
        const table = tableMatch[1];
        if (!this.tables[table]) this.tables[table] = [];

        // Extraer columnas
        const colsMatch = sql.match(/\(([^)]+)\) values/i);
        if (!colsMatch) return { rows: [] };
        const cols = colsMatch[1].split(',').map(c => c.trim());

        const row = { id: this._getId(table), created_at: new Date(), updated_at: new Date() };
        cols.forEach((col, i) => {
            row[col] = params[i];
        });

        this.tables[table].push(row);
        return { rows: [row], rowCount: 1 };
    }

    _handleSelect(sql, params) {
        // Handle COUNT queries
        const countMatch = sql.match(/select count\(\*\)(?:\s+as\s+(\w+))?\s+from (\w+)/i);
        if (countMatch) {
            const alias = countMatch[1] || 'count';
            const table = countMatch[2];
            const rows = this.tables[table] || [];
            const filtered = this._applyWhere(rows, sql, params);
            return { rows: [{ [alias]: String(filtered.length), c: String(filtered.length), total: String(filtered.length) }] };
        }

        // Handle SELECT * FROM table WHERE ...
        const fromMatch = sql.match(/from (\w+)/i);
        if (!fromMatch) return { rows: [] };
        const table = fromMatch[1];
        const rows = [...(this.tables[table] || [])];

        const filtered = this._applyWhere(rows, sql, params);

        // Handle ORDER BY
        const orderMatch = sql.match(/order by (\w+)(?:\.\w+)?\s+(asc|desc)?/i);
        if (orderMatch) {
            const col = orderMatch[1];
            const dir = (orderMatch[2] || 'asc').toLowerCase();
            filtered.sort((a, b) => {
                const av = a[col], bv = b[col];
                if (av < bv) return dir === 'asc' ? -1 : 1;
                if (av > bv) return dir === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // Handle LIMIT
        const limitMatch = sql.match(/limit \$(\d+)|limit (\d+)/i);
        let limit = Infinity;
        if (limitMatch) {
            limit = limitMatch[1] ? parseInt(params[parseInt(limitMatch[1]) - 1]) : parseInt(limitMatch[2]);
        }

        return { rows: filtered.slice(0, limit) };
    }

    _applyWhere(rows, sql, params) {
        // Simplificación: aplicar filtros básicos por $1, $2...
        const whereMatch = sql.match(/where (.+?)(?:order by|group by|limit|$)/is);
        if (!whereMatch) return rows;

        const conditions = whereMatch[1];
        return rows.filter(row => {
            // Matchear patrones como "col = $1"
            const matches = [...conditions.matchAll(/(\w+(?:\.\w+)?)\s*=\s*\$(\d+)/g)];
            for (const m of matches) {
                let col = m[1];
                if (col.includes('.')) col = col.split('.')[1];
                const paramIdx = parseInt(m[2]) - 1;
                const expected = params[paramIdx];
                if (expected !== undefined && row[col] !== expected) {
                    return false;
                }
            }
            return true;
        });
    }

    _handleUpdate(sql, params) {
        const tableMatch = sql.match(/update (\w+)/i);
        if (!tableMatch) return { rows: [], rowCount: 0 };
        const table = tableMatch[1];
        const rows = this.tables[table] || [];

        const filtered = this._applyWhere(rows, sql, params);

        // Extraer SETs
        const setMatch = sql.match(/set (.+?)(?:where|returning|$)/is);
        if (setMatch) {
            const sets = setMatch[1].split(',').map(s => s.trim());
            filtered.forEach(row => {
                sets.forEach(setClause => {
                    const assignMatch = setClause.match(/(\w+)\s*=\s*(.+)/);
                    if (!assignMatch) return;
                    const col = assignMatch[1];
                    const value = assignMatch[2].trim();

                    // $N params
                    const paramMatch = value.match(/\$(\d+)/);
                    if (paramMatch) {
                        row[col] = params[parseInt(paramMatch[1]) - 1];
                    }
                    // Incrementos: col + $N
                    else if (value.match(/(\w+)\s*\+\s*\$(\d+)/)) {
                        const incMatch = value.match(/(\w+)\s*\+\s*\$(\d+)/);
                        const current = parseFloat(row[incMatch[1]]) || 0;
                        const add = parseFloat(params[parseInt(incMatch[2]) - 1]) || 0;
                        row[col] = current + add;
                    }
                });
                row.updated_at = new Date();
            });
        }

        return { rows: filtered, rowCount: filtered.length };
    }

    _handleDelete(sql, params) {
        const tableMatch = sql.match(/delete from (\w+)/i);
        if (!tableMatch) return { rows: [], rowCount: 0 };
        const table = tableMatch[1];
        const rows = this.tables[table] || [];
        const filtered = this._applyWhere(rows, sql, params);
        this.tables[table] = rows.filter(r => !filtered.includes(r));
        return { rows: [], rowCount: filtered.length };
    }

    // Mock pool.connect() for transactions
    async connect() {
        return {
            query: (sql, params) => this.query(sql, params),
            release: () => {}
        };
    }

    reset() {
        Object.keys(this.tables).forEach(t => this.tables[t] = []);
        this.nextId = {};
        this._setupSeed();
    }

    // Helpers para inspección
    count(table) { return (this.tables[table] || []).length; }
    get(table, id) { return (this.tables[table] || []).find(r => r.id === id); }
    filter(table, fn) { return (this.tables[table] || []).filter(fn); }
}

const mockDbInstance = new MockDB();

module.exports = {
    query: (sql, params) => mockDbInstance.query(sql, params),
    pool: {
        connect: () => mockDbInstance.connect()
    },
    _instance: mockDbInstance,
    reset: () => mockDbInstance.reset(),
};
