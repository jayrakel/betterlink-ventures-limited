const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet'); 
const cookieParser = require('cookie-parser'); 
const path = require('path');
const bcrypt = require('bcrypt'); // Required for Admin creation
require('dotenv').config();

// Config & Database
const db = require('./src/config/db');
const { init } = require('./init_db'); // Automatic Migration Script

// Middleware
const { authenticateUser } = require('./src/features/auth/auth.middleware');

// Features (Routes)
const authRoutes = require('./src/features/auth/auth.routes');
const memberRoutes = require('./src/features/members/members.routes');
const settingsRoutes = require('./src/features/settings/settings.routes');
const loanRoutes = require('./src/features/loans/loans.routes');
const depositRoutes = require('./src/features/deposits/deposits.routes');
const paymentRoutes = require('./src/features/payments/payments.routes');
const dividendRoutes = require('./src/features/dividends/dividends.routes');
const reportRoutes = require('./src/features/reports/reports.routes');
const cmsRoutes = require('./src/features/cms/cms.routes');
const assetRoutes = require('./src/features/assets/assets.routes');
const finesRoutes = require('./src/features/fines/fines.routes');
const notificationRoutes = require('./src/features/notifications/notifications.routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1); 

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(helmet()); 
app.use(cors({ 
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error('Not allowed by CORS'));
    }, 
    credentials: true
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser()); 

// Rate Limits
const loginLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 20 });
const apiLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 200 });

// --- ROUTES MOUNTING ---
app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/auth', apiLimiter, memberRoutes); // Profile routes
app.use('/api/settings', settingsRoutes);
app.use('/api/loan', apiLimiter, loanRoutes);
app.use('/api/deposits', apiLimiter, depositRoutes);
app.use('/api/payments', apiLimiter, paymentRoutes);
app.use('/api/dividends', apiLimiter, dividendRoutes);
app.use('/api/reports', apiLimiter, reportRoutes);
app.use('/api/advanced-reports', apiLimiter, reportRoutes); // Alias for compatibility
app.use('/api/cms', apiLimiter, cmsRoutes);
app.use('/api/management', apiLimiter, assetRoutes); // Assets & Expenses
app.use('/api/fines', apiLimiter, finesRoutes);

// Notifications (Protected)
app.use('/api/notifications', authenticateUser, notificationRoutes); 
app.use('/api/loan/notifications', authenticateUser, notificationRoutes); // Legacy support

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal System Error" });
});

// --- SYSTEM INITIALIZATION ---
const startServer = async () => {
    try {
        console.log("⏳ Starting System Initialization...");

        // 1. Run Database Migrations (Creates tables & adds columns)
        await init(); 
        console.log("✅ Database Schema Verified.");

        // 2. Ensure Admin Exists
        const result = await db.query("SELECT COUNT(*) FROM users");
        if (parseInt(result.rows[0].count) === 0) {
            const hash = await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123', 10);
            await db.query(
                `INSERT INTO users (full_name, email, password_hash, role, phone_number, must_change_password, is_email_verified) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ['System Administrator', 'admin@sacco.com', hash, 'ADMIN', '0700000000', true, true]
            );
            console.log("✅ DEFAULT ADMIN CREATED");
        }

        // 3. Start Server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT} (Modular Architecture)`);
        });

    } catch (err) {
        console.error("❌ Startup Failed:", err);
        process.exit(1); // Stop the app if DB fails
    }
};

startServer();

module.exports = app;