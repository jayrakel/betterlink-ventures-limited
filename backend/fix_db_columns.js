const db = require('./src/config/db');

async function fixDatabase() {
    const client = await db.pool.connect();
    try {
        console.log("🔧 Starting Comprehensive Database Repair...");
        await client.query('BEGIN');

        // --- 1. FIX FIXED ASSETS (value -> current_value) ---
        console.log("👉 Checking 'fixed_assets' table...");
        
        // Check if 'current_value' exists
        const checkAssetCol = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='fixed_assets' AND column_name='current_value'
        `);

        if (checkAssetCol.rows.length === 0) {
            console.log("   ⚠️ Column 'current_value' missing. Checking for old 'value' column...");
            
            // Check if old 'value' column exists
            const checkOldCol = await client.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name='fixed_assets' AND column_name='value'
            `);

            if (checkOldCol.rows.length > 0) {
                console.log("   🔄 Migrating 'value' to 'current_value'...");
                await client.query(`ALTER TABLE fixed_assets RENAME COLUMN value TO current_value;`);
                await client.query(`ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS purchase_value NUMERIC(15,2) DEFAULT 0;`);
                // Initialize purchase_value with current_value for existing records
                await client.query(`UPDATE fixed_assets SET purchase_value = current_value WHERE purchase_value = 0;`);
            } else {
                console.log("   ➕ Adding 'current_value' and 'purchase_value' columns...");
                await client.query(`ALTER TABLE fixed_assets ADD COLUMN current_value NUMERIC(15,2) DEFAULT 0;`);
                await client.query(`ALTER TABLE fixed_assets ADD COLUMN purchase_value NUMERIC(15,2) DEFAULT 0;`);
            }
        }
        
        // Ensure purchase_date exists
        await client.query(`ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS purchase_date DATE DEFAULT CURRENT_DATE;`);
        console.log("   ✅ Fixed Assets table aligned.");


        // --- 2. FIX LOAN APPLICATIONS (disbursed_at) ---
        console.log("👉 Checking 'loan_applications' table...");
        await client.query(`ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP;`);
        await client.query(`ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS total_due NUMERIC(15,2) DEFAULT 0;`);
        await client.query(`ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS interest_amount NUMERIC(15,2) DEFAULT 0;`);
        console.log("   ✅ Loan Applications table aligned.");


        // --- 3. FIX DIVIDEND ALLOCATIONS (payment_date) ---
        console.log("👉 Checking 'dividend_allocations' table...");
        // Ensure table exists first (in case it wasn't created)
        await client.query(`
            CREATE TABLE IF NOT EXISTS dividend_allocations (
                id SERIAL PRIMARY KEY,
                dividend_id INTEGER,
                member_id INTEGER,
                share_value NUMERIC(15, 2),
                dividend_amount NUMERIC(15, 2) NOT NULL,
                status VARCHAR(20) DEFAULT 'PENDING',
                payment_method VARCHAR(50),
                payment_date DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // If it existed but lacked the column
        await client.query(`ALTER TABLE dividend_allocations ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE;`);
        console.log("   ✅ Dividend Allocations table aligned.");

        await client.query('COMMIT');
        console.log("🚀 DATABASE SUCCESSFULLY REPAIRED! You can now use the Reports.");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Repair Failed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

fixDatabase();