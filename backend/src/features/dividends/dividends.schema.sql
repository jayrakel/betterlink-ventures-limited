CREATE TABLE IF NOT EXISTS dividends (
    id SERIAL PRIMARY KEY,
    financial_year INTEGER NOT NULL,
    dividend_rate NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    declared_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dividend_allocations (
    id SERIAL PRIMARY KEY,
    dividend_id INTEGER REFERENCES dividends(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES users(id),
    share_value NUMERIC(15, 2),
    dividend_amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    payment_method VARCHAR(50),
    transaction_id INTEGER REFERENCES transactions(id),
    payment_date DATE, -- ✅ Added this
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$ 
BEGIN 
    ALTER TABLE dividend_allocations ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE;
END $$;