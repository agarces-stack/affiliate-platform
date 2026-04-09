const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/db');
const { Notify } = require('../services/notifications');
const { triggerWebhooks } = require('../services/webhooks');

// Admin login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

        const result = await db.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, company_id: user.company_id },
            process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY || '7d' }
        );
        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Affiliate login
router.post('/affiliate/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

        const result = await db.query('SELECT * FROM affiliates WHERE email = $1 AND status = $2', [email, 'approved']);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const affiliate = result.rows[0];
        const valid = await bcrypt.compare(password, affiliate.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: affiliate.id, email: affiliate.email, role: 'affiliate', ref_id: affiliate.ref_id, company_id: affiliate.company_id },
            process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY || '7d' }
        );
        res.json({ token, affiliate: { id: affiliate.id, email: affiliate.email, ref_id: affiliate.ref_id, name: affiliate.first_name } });
    } catch (err) {
        console.error('Affiliate login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Affiliate registration
router.post('/affiliate/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name, company_name, phone, website, company_id, parent_ref_id } = req.body;
        if (!email || !password || !first_name) return res.status(400).json({ error: 'Email, password and first name are required' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });
        if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

        const exists = await db.query('SELECT id FROM affiliates WHERE email = $1', [email]);
        if (exists.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });

        // Buscar parent si viene ref de reclutamiento
        let parent_affiliate_id = null;
        let resolved_company_id = company_id || 1;
        if (parent_ref_id) {
            const parentResult = await db.query(
                'SELECT id, company_id, rank FROM affiliates WHERE ref_id = $1 AND status = $2',
                [parent_ref_id, 'approved']
            );
            if (parentResult.rows.length > 0) {
                const parent = parentResult.rows[0];

                // Verificar si el parent puede reclutar (por rango)
                const rankResult = await db.query(
                    'SELECT can_recruit, max_recruit_depth FROM ranks WHERE company_id = $1 AND rank_number = $2',
                    [parent.company_id, parent.rank || 1]
                );
                const rankConfig = rankResult.rows[0];
                if (rankConfig && !rankConfig.can_recruit) {
                    return res.status(403).json({ error: 'This affiliate cannot recruit new members' });
                }

                // Verificar profundidad máxima de reclutamiento
                if (rankConfig?.max_recruit_depth > 0) {
                    const depthCheck = await db.query(
                        `WITH RECURSIVE upline AS (
                            SELECT id, parent_affiliate_id, 1 as depth FROM affiliates WHERE id = $1
                            UNION ALL
                            SELECT a.id, a.parent_affiliate_id, u.depth + 1
                            FROM affiliates a JOIN upline u ON a.id = u.parent_affiliate_id
                        )
                        SELECT MAX(depth) as current_depth FROM upline`,
                        [parent.id]
                    );
                    const currentDepth = parseInt(depthCheck.rows[0].current_depth) || 0;
                    if (currentDepth >= rankConfig.max_recruit_depth) {
                        return res.status(403).json({ error: 'Maximum recruitment depth reached' });
                    }
                }

                parent_affiliate_id = parent.id;
                resolved_company_id = parent.company_id; // Heredar empresa del parent
            }
        }

        const password_hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
        const ref_id = 'AFF' + Date.now().toString(36).toUpperCase();

        const result = await db.query(
            `INSERT INTO affiliates (company_id, ref_id, email, password_hash, first_name, last_name,
             company_name, phone, website, parent_affiliate_id, rank, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id, ref_id`,
            [resolved_company_id, ref_id, email, password_hash, first_name, last_name,
             company_name, phone, website, parent_affiliate_id, 1, 'pending']
        );
        // Notificar al admin de nuevo registro
        Notify.newAffiliate(resolved_company_id, first_name, email);
        triggerWebhooks(resolved_company_id, 'new_affiliate', { affiliate_id: result.rows[0].id, email, name: first_name, ref_id: result.rows[0].ref_id, parent_ref_id: parent_ref_id || null });
        // Notificar al parent que tiene nuevo recluta
        if (parent_affiliate_id) {
            Notify.newRecruit(resolved_company_id, parent_affiliate_id, first_name);
        }

        res.json({
            status: 'registered',
            affiliate_id: result.rows[0].id,
            ref_id: result.rows[0].ref_id,
            parent_ref_id: parent_ref_id || null
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

module.exports = router;
