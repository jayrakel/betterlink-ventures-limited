CREATE TABLE IF NOT EXISTS fixed_assets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    purchase_value NUMERIC(15, 2) NOT NULL,
    current_value NUMERIC(15, 2) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
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
    expense_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);