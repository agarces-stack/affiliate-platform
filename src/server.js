require('dotenv').config({ path: './config/.env' });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const trackingRoutes = require('./routes/tracking');
const affiliateRoutes = require('./routes/affiliates');
const campaignRoutes = require('./routes/campaigns');
const conversionRoutes = require('./routes/conversions');
const reportRoutes = require('./routes/reports');
const authRoutes = require('./routes/auth');
const couponRoutes = require('./routes/coupons');
const payoutRoutes = require('./routes/payouts');
const fraudRoutes = require('./routes/fraud');
const rankRoutes = require('./routes/ranks');
const teamRoutes = require('./routes/team');
const notificationRoutes = require('./routes/notifications');
const webhookRoutes = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// SECURITY & LOGGING MIDDLEWARE
// ============================================
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for inline scripts in frontend
    crossOriginEmbedderPolicy: false
}));

// Request logging
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// Rate limiting - general API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    message: { error: 'Too many requests, try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting - auth (más estricto)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 intentos de login por 15 min
    message: { error: 'Too many login attempts, try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting - tracking (más permisivo)
const trackLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // 200 clicks/postbacks por minuto por IP
    message: 'Rate limited',
    standardHeaders: true,
    legacyHeaders: false,
});

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : undefined;
app.use(cors(allowedOrigins ? {
    origin: allowedOrigins,
    credentials: true
} : undefined));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Trust proxy (for correct IP behind Nginx)
app.set('trust proxy', 1);

// ============================================
// TRACKING ROUTES (publicas - no auth)
// ============================================
app.use('/track', trackLimiter, trackingRoutes);
app.use('/postback', trackLimiter, conversionRoutes);

// ============================================
// API ROUTES (requieren auth)
// ============================================
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/affiliates', apiLimiter, affiliateRoutes);
app.use('/api/campaigns', apiLimiter, campaignRoutes);
app.use('/api/conversions', apiLimiter, conversionRoutes);
app.use('/api/reports', apiLimiter, reportRoutes);
app.use('/api/coupons', apiLimiter, couponRoutes);
app.use('/api/payouts', apiLimiter, payoutRoutes);
app.use('/api/fraud', apiLimiter, fraudRoutes);
app.use('/api/ranks', apiLimiter, rankRoutes);
app.use('/api/team', apiLimiter, teamRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/webhooks', apiLimiter, webhookRoutes);

// ============================================
// FRONTEND ROUTES
// ============================================
const path = require('path');
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../frontend/admin/dashboard.html')));
app.get('/affiliate', (req, res) => res.sendFile(path.join(__dirname, '../frontend/affiliate/portal.html')));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Pixel image (1x1 transparent gif)
app.get('/pixel.gif', (req, res) => {
    const buf = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache' });
    res.send(buf);
});

app.listen(PORT, () => {
    console.log(`MagnetRaffic running on port ${PORT}`);
    console.log(`Tracking URL: ${process.env.TRACKING_DOMAIN || 'http://localhost:' + PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
