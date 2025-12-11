const db = require('./src/config/db');

async function checkData() {
    try {
        console.log("🔍 Checking Database Connection...");
        
        // 1. Check Users
        const users = await db.query("SELECT id, full_name, email FROM users LIMIT 5");
        console.log(`✅ Found ${users.rows.length} users.`);
        if(users.rows.length > 0) {
            const testUser = users.rows[0];
            console.log(`   Testing with User: ${testUser.full_name} (ID: ${testUser.id})`);

            // 2. Check Transactions (Raw Source)
            const tx = await db.query("SELECT COUNT(*) FROM transactions WHERE user_id = $1", [testUser.id]);
            console.log(`   Transactions Found: ${tx.rows[0].count}`);

            // 3. Check Deposits (Computed Balance Source)
            const dep = await db.query("SELECT * FROM deposits WHERE user_id = $1", [testUser.id]);
            console.log(`   Deposit Records Found: ${dep.rows.length}`);

            // 4. Run the EXACT Query used in the new Service
            const balanceRes = await db.query(
                "SELECT COALESCE(SUM(amount), 0) as balance FROM deposits WHERE user_id = $1 AND status = 'COMPLETED' AND type = 'DEPOSIT'",
                [testUser.id]
            );
            console.log(`   💰 Calculated Savings Balance: KES ${balanceRes.rows[0].balance}`);
            
            if (parseFloat(balanceRes.rows[0].balance) === 0 && dep.rows.length > 0) {
                console.log("   ⚠️  WARNING: Deposits exist but Balance is 0. Checking types...");
                dep.rows.forEach(d => console.log(`      - Amount: ${d.amount} | Type: ${d.type} | Status: ${d.status}`));
            }
        }
    } catch (err) {
        console.error("❌ Database Error:", err.message);
    } finally {
        process.exit();
    }
}

checkData();