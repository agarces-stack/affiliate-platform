const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/db');

// Admin login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, company_id: user.company_id },
        process.env.JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// Affiliate login
router.post('/affiliate/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM affiliates WHERE email = $1 AND status = $2', [email, 'approved']);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const affiliate = result.rows[0];
    const valid = await bcrypt.compare(password, affiliate.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
        { id: affiliate.id, email: affiliate.email, role: 'affiliate', ref_id: affiliate.ref_id, company_id: affiliate.company_id },
        process.env.JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({ token, affiliate: { id: affiliate.id, email: affiliate.email, ref_id: affiliate.ref_id, name: affiliate.first_name } });
});

// Affiliate registration
router.post('/affiliate/register', async (req, res) => {
    const { email, password, first_name, last_name, company_name, phone, website, company_id } = req.body;

    const exists = await db.query('SELECT id FROM affiliates WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 10);
    const ref_id = 'AFF' + Date.now().toString(36).toUpperCase();

    const result = await db.query(
        `INSERT INTO affiliates (company_id, ref_id, email, password_hash, first_name, last_name, company_name, phone, website, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, ref_id`,
        [company_id || 1, ref_id, email, password_hash, first_name, last_name, company_name, phone, website, 'pending']
    );
    res.json({ status: 'registered', affiliate_id: result.rows[0].id, ref_id: result.rows[0].ref_id });
});

module.exports = router;
