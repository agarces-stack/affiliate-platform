const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

router.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/admin/dashboard.html'));
});

router.get('/affiliate', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/affiliate/portal.html'));
});

module.exports = router;
