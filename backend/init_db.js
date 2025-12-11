const { pool } = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function init() {
    const client = await pool.connect();
    try {
        console.log("⏳ Beginning Database Migration...");
        
        // List your schema files in order of dependency
        // (e.g., users table must exist before transactions table)
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
                console.log(`✅ Executed: ${file}`);
            } else {
                console.warn(`⚠️  Warning: Schema file not found: ${file}`);
            }
        }
        console.log("🚀 Database is ready for Production!");
    } catch (err) {
        console.error("❌ Migration Failed:", err);
    } finally {
        client.release();
        pool.end();
    }
}

init();