const { pool } = require('./src/config/db');
const fs = require('fs');
const path = require('path');

// Wrap logic in an exported function
const init = async () => {
    const client = await pool.connect();
    try {
        const schemaFiles = [
            'src/features/auth/auth.schema.sql',
            'src/features/members/members.schema.sql',
            'src/features/settings/settings.schema.sql',
            'src/features/payments/payments.schema.sql',
            'src/features/deposits/deposits.schema.sql',
            'src/features/loans/loans.schema.sql',
            'src/features/fines/fines.schema.sql',
            'src/features/notifications/notifications.schema.sql',
            'src/features/dividends/dividends.schema.sql',
            'src/features/reports/reports.schema.sql',
            'src/features/cms/cms.schema.sql',
            'src/features/assets/assets.schema.sql'
        ];

        for (const file of schemaFiles) {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                const sql = fs.readFileSync(filePath, 'utf8');
                await client.query(sql);
                // console.log(`✅ Executed: ${file}`); // Optional: Comment out to reduce noise
            } else {
                console.warn(`⚠️  Warning: Schema file not found: ${file}`);
            }
        }
    } catch (err) {
        console.error("❌ Migration Failed:", err);
        throw err; // Re-throw so index.js knows it failed
    } finally {
        client.release();
    }
};

// Allow running manually via `node init_db.js` OR importing
if (require.main === module) {
    init().then(() => {
        console.log("🚀 Manual Migration Complete!");
        pool.end();
    });
}

module.exports = { init };