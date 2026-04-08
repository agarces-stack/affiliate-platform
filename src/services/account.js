const db = require('../models/db');

// Registrar movimiento en la cuenta del afiliado
// Esto reemplaza los UPDATE directos a affiliates.balance
async function recordMovement({ companyId, affiliateId, type, direction, amount, referenceType, referenceId, description, holdDays = 0 }) {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Obtener balance actual con lock
        const aff = await client.query(
            'SELECT balance, available_balance, pending_balance FROM affiliates WHERE id = $1 FOR UPDATE',
            [affiliateId]
        );
        if (aff.rows.length === 0) throw new Error('Affiliate not found');

        const currentBalance = parseFloat(aff.rows[0].balance) || 0;
        const currentAvailable = parseFloat(aff.rows[0].available_balance) || 0;
        const currentPending = parseFloat(aff.rows[0].pending_balance) || 0;
        const amt = parseFloat(amount);

        let newBalance, newAvailable, newPending;
        const isAvailable = holdDays <= 0;
        const availableAt = holdDays > 0
            ? new Date(Date.now() + holdDays * 86400000)
            : new Date();

        if (direction === 'credit') {
            newBalance = currentBalance + amt;
            newAvailable = isAvailable ? currentAvailable + amt : currentAvailable;
            newPending = isAvailable ? currentPending : currentPending + amt;
        } else {
            newBalance = Math.max(currentBalance - amt, 0);
            newAvailable = Math.max(currentAvailable - amt, 0);
            newPending = currentPending;
        }

        // Insertar movimiento
        await client.query(
            `INSERT INTO account_movements (company_id, affiliate_id, type, direction, amount,
             balance_after, reference_type, reference_id, available_at, is_available, description)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [companyId, affiliateId, type, direction, amt,
             newBalance, referenceType || null, referenceId || null,
             availableAt, isAvailable, description || null]
        );

        // Actualizar balances
        await client.query(
            'UPDATE affiliates SET balance = $1, available_balance = $2, pending_balance = $3 WHERE id = $4',
            [newBalance, newAvailable, newPending]
        );

        await client.query('COMMIT');
        return { balance: newBalance, available: newAvailable, pending: newPending };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// Liberar comisiones pendientes (correr periódicamente)
async function releasePendingCommissions(companyId) {
    try {
        const pending = await db.query(
            `SELECT id, affiliate_id, amount FROM account_movements
             WHERE company_id = $1 AND is_available = false AND available_at <= NOW()`,
            [companyId]
        );

        let released = 0;
        for (const mov of pending.rows) {
            await db.query('UPDATE account_movements SET is_available = true WHERE id = $1', [mov.id]);
            await db.query(
                `UPDATE affiliates SET
                 available_balance = available_balance + $1,
                 pending_balance = GREATEST(pending_balance - $1, 0)
                 WHERE id = $2`,
                [parseFloat(mov.amount), mov.affiliate_id]
            );
            released++;
        }
        return { released };
    } catch (err) {
        console.error('Release pending error:', err);
        return { error: err.message };
    }
}

module.exports = { recordMovement, releasePendingCommissions };
