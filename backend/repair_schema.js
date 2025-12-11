const db = require('./src/config/db');

async function repair() {
    try {
        console.log("🔧 Starting Schema Repair...");

        // 1. Fix Fixed Assets Table (Add purchase_date)
        await db.query(`
            ALTER TABLE fixed_assets 
            ADD COLUMN IF NOT EXISTS purchase_date DATE DEFAULT CURRENT_DATE;
        `);
        console.log("✅ Fixed: 'fixed_assets' now has 'purchase_date'");

        // 2. Fix Dividend Allocations Table (Add payment_date)
        await db.query(`
            ALTER TABLE dividend_allocations 
            ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE;
        `);
        console.log("✅ Fixed: 'dividend_allocations' now has 'payment_date'");

        // 3. Fix Loan Applications (Ensure disbursed_at exists)
        await db.query(`
            ALTER TABLE loan_applications 
            ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP;
        `);
        console.log("✅ Verified: 'loan_applications' has 'disbursed_at'");

        console.log("🚀 Repair Complete! Try running the reports now.");
        process.exit();

    } catch (err) {
        console.error("❌ Repair Failed:", err.message);
        process.exit(1);
    }
}

repair();