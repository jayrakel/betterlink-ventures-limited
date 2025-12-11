CREATE TABLE IF NOT EXISTS financial_reports (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(50),
    report_date DATE NOT NULL,
    report_data JSONB,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);