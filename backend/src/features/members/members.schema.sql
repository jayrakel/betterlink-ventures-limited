CREATE TABLE IF NOT EXISTS member_movement_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL, -- JOINED, LEFT, SUSPENDED
    reason TEXT,
    recorded_by INTEGER REFERENCES users(id),
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);