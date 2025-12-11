CREATE TABLE IF NOT EXISTS member_fines (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    original_amount DECIMAL(15,2) NOT NULL,
    current_balance DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    interest_stage VARCHAR(50) DEFAULT 'NONE',
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_stage_1_applied TIMESTAMP,
    date_stage_2_applied TIMESTAMP,
    description TEXT
);