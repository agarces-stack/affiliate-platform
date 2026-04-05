const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const UAParser = require('ua-parser-js');
const db = require('../models/db');

// ============================================
// CLICK TRACKING
// GET /track?ref_id=ABC123&campaign_id=1
// ============================================
router.get('/', async (req, res) => {
    try {
        const { ref_id, campaign_id, sub_id1, sub_id2, sub_id3 } = req.query;

        if (!ref_id) return res.status(400).send('Missing ref_id');

        // Buscar afiliado
        const affResult = await db.query(
            'SELECT id, company_id FROM affiliates WHERE ref_id = $1 AND status = $2',
            [ref_id, 'approved']
        );
        if (affResult.rows.length === 0) return res.status(404).send('Affiliate not found');
        const affiliate = affResult.rows[0];

        // Buscar campaña
        let campaign = null;
        if (campaign_id) {
            const campResult = await db.query(
                'SELECT id, url, cookie_days FROM campaigns WHERE id = $1 AND company_id = $2 AND status = $3',
                [campaign_id, affiliate.company_id, 'active']
            );
            if (campResult.rows.length > 0) campaign = campResult.rows[0];
        }

        // Si no hay campaign_id, buscar la primera campaña activa del afiliado
        if (!campaign) {
            const campResult = await db.query(
                `SELECT c.id, c.url, c.cookie_days FROM campaigns c
                 JOIN campaign_affiliates ca ON c.id = ca.campaign_id
                 WHERE ca.affiliate_id = $1 AND c.status = 'active' LIMIT 1`,
                [affiliate.id]
            );
            if (campResult.rows.length > 0) campaign = campResult.rows[0];
        }

        if (!campaign) return res.status(404).send('No active campaign found');

        // Parsear user agent
        const parser = new UAParser(req.headers['user-agent']);
        const ua = parser.getResult();

        // Generar click_id unico
        const click_id = uuidv4();

        // Detectar IP
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;

        // Verificar si es click unico (misma IP + afiliado en ultimas 24h)
        const dupeCheck = await db.query(
            `SELECT id FROM clicks WHERE affiliate_id = $1 AND campaign_id = $2
             AND ip_address = $3 AND created_at > NOW() - INTERVAL '24 hours' LIMIT 1`,
            [affiliate.id, campaign.id, ip]
        );
        const is_unique = dupeCheck.rows.length === 0;

        // Detectar bot basico
        const botPatterns = /bot|crawler|spider|scraper|curl|wget|python|java\/|httpclient/i;
        const is_bot = botPatterns.test(req.headers['user-agent'] || '');

        // Guardar click
        await db.query(
            `INSERT INTO clicks (click_id, company_id, campaign_id, affiliate_id,
             ip_address, user_agent, referer, device, browser, os,
             sub_id1, sub_id2, sub_id3, landing_url, is_unique, is_bot)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
            [click_id, affiliate.company_id, campaign.id, affiliate.id,
             ip, req.headers['user-agent'], req.headers['referer'] || '',
             ua.device.type || 'desktop', ua.browser.name || 'unknown', ua.os.name || 'unknown',
             sub_id1 || '', sub_id2 || '', sub_id3 || '',
             campaign.url, is_unique, is_bot]
        );

        // Actualizar contador del afiliado
        await db.query(
            'UPDATE affiliates SET total_clicks = total_clicks + 1 WHERE id = $1',
            [affiliate.id]
        );

        // Setear cookie con click_id
        const cookieDays = campaign.cookie_days || 30;
        res.cookie('_aff_click', click_id, {
            maxAge: cookieDays * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: 'lax'
        });
        res.cookie('_aff_ref', ref_id, {
            maxAge: cookieDays * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: 'lax'
        });

        // Redirigir al landing page con click_id
        const redirectUrl = new URL(campaign.url);
        redirectUrl.searchParams.set('click_id', click_id);
        redirectUrl.searchParams.set('ref_id', ref_id);

        res.redirect(302, redirectUrl.toString());

    } catch (err) {
        console.error('Click tracking error:', err);
        res.status(500).send('Tracking error');
    }
});

module.exports = router;
