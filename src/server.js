require('dotenv').config({ path: './config/.env' });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const trackingRoutes = require('./routes/tracking');
const affiliateRoutes = require('./routes/affiliates');
const campaignRoutes = require('./routes/campaigns');
const conversionRoutes = require('./routes/conversions');
const reportRoutes = require('./routes/reports');
const authRoutes = require('./routes/auth');
const couponRoutes = require('./routes/coupons');
const payoutRoutes = require('./routes/payouts');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// ============================================
// TRACKING ROUTES (publicas - no auth)
// ============================================
app.use('/track', trackingRoutes);      // Click tracking
app.use('/postback', conversionRoutes); // Conversion postback

// ============================================
// API ROUTES (requieren auth)
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/conversions', conversionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/payouts', payoutRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Pixel image (1x1 transparent gif)
app.get('/pixel.gif', (req, res) => {
    const buf = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache' });
    res.send(buf);
});

app.listen(PORT, () => {
    console.log(`Affiliate Platform running on port ${PORT}`);
    console.log(`Tracking URL: ${process.env.TRACKING_DOMAIN || 'http://localhost:' + PORT}`);
});
