-- 1. Create Tables (If they don't exist)
CREATE TABLE IF NOT EXISTS fixed_assets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    purchase_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    current_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    location VARCHAR(255),
    description TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    purchase_date DATE DEFAULT CURRENT_DATE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS operational_expenses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'GENERAL',
    amount NUMERIC(15, 2) NOT NULL,
    description TEXT,
    receipt_ref VARCHAR(100),
    incurred_by INTEGER,
    asset_id INTEGER REFERENCES fixed_assets(id),
    expense_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Auto-Repair Block (Runs every time init_db.js is called)
DO $$ 
BEGIN 
    -- Fix 1: Rename legacy 'value' column to 'current_value' to prevent data loss
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fixed_assets' AND column_name='value') THEN
        ALTER TABLE fixed_assets RENAME COLUMN value TO current_value;
    END IF;

    -- Fix 2: Rename 'added_by' to 'created_by' if it exists (legacy support)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fixed_assets' AND column_name='added_by') THEN
        ALTER TABLE fixed_assets RENAME COLUMN added_by TO created_by;
    END IF;

    -- Fix 3: Ensure all required columns exist (Safe to run multiple times)
    ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS purchase_value NUMERIC(15, 2) DEFAULT 0;
    ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS current_value NUMERIC(15, 2) DEFAULT 0;
    ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS purchase_date DATE DEFAULT CURRENT_DATE;
    ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

    -- Fix 4: Data consistency (If purchase_value is 0, assume it equals current_value)
    UPDATE fixed_assets SET purchase_value = current_value WHERE purchase_value = 0 AND current_value > 0;
END $$;