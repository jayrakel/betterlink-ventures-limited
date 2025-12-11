-- Deposits (Account Balances)
CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(50) DEFAULT 'DEPOSIT', -- DEPOSIT, SHARE_CAPITAL, WITHDRAWAL
    category VARCHAR(50) DEFAULT 'DEPOSIT', -- For custom categories like WELFARE
    transaction_ref VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);