const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const { askAI, applyAIConfig } = require('../services/ai-assistant');

// Preview: AI genera la config pero no la aplica
router.post('/preview', adminAuth, async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        const config = await askAI(prompt, req.user.company_id);
        res.json({ status: 'preview', config });
    } catch (err) {
        console.error('AI preview error:', err);
        res.status(500).json({ error: 'AI request failed. Please try again.' });
    }
});

// Apply: Aplica la config generada por AI
router.post('/apply', adminAuth, async (req, res) => {
    try {
        const { config } = req.body;
        if (!config) return res.status(400).json({ error: 'Config is required' });

        const results = await applyAIConfig(config, req.user.company_id);
        res.json({ status: 'applied', results });
    } catch (err) {
        console.error('AI apply error:', err);
        res.status(500).json({ error: 'Failed to apply configuration.' });
    }
});

// All-in-one: AI genera y aplica
router.post('/create', adminAuth, async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        const config = await askAI(prompt, req.user.company_id);
        const results = await applyAIConfig(config, req.user.company_id);
        res.json({ status: 'created', config, results });
    } catch (err) {
        console.error('AI create error:', err);
        res.status(500).json({ error: 'AI request failed. Please try again.' });
    }
});

module.exports = router;
