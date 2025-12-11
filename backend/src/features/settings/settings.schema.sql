-- System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    setting_key character varying(50) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description text,
    category character varying(20) DEFAULT 'SYSTEM'
);

-- Contribution Categories
CREATE TABLE IF NOT EXISTS public.contribution_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default Settings Seed
INSERT INTO system_settings (setting_key, setting_value, description, category)
VALUES 
    ('registration_fee', '1500', 'One-time mandatory fee (KES)', 'SACCO'),
    ('min_share_capital', '2000', 'Minimum shares (KES)', 'SACCO'),
    ('min_savings_for_loan', '5000', 'Min savings to apply for loan', 'SACCO'),
    ('min_weekly_deposit', '250', 'Min saving/week (KES)', 'SACCO'),
    ('loan_interest_rate', '12', 'Annual interest rate (%)', 'SACCO'),
    ('loan_multiplier', '3', 'Loan limit multiplier', 'SACCO'),
    ('loan_processing_fee', '500', 'Processing fee (KES)', 'SACCO'),
    ('min_guarantors', '2', 'Min guarantors required', 'SACCO'),
    ('penalty_missed_savings', '50', 'Penalty missed save', 'SACCO'),
    ('sacco_name', 'Secure Sacco', 'Organization Name', 'SYSTEM')
ON CONFLICT (setting_key) DO NOTHING;