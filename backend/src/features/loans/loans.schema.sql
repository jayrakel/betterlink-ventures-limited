-- Loan Applications
CREATE TABLE IF NOT EXISTS public.loan_applications (
    id SERIAL PRIMARY KEY,
    user_id integer NOT NULL REFERENCES public.users(id),
    status character varying(50) DEFAULT 'FEE_PENDING',
    fee_amount numeric(10,2) DEFAULT 500.00,
    fee_transaction_ref character varying(100),
    amount_requested numeric(15,2),
    purpose text,
    repayment_weeks integer,
    guarantor_ids text[],
    amount_repaid numeric(15,2) DEFAULT 0.00,
    interest_amount numeric(15,2) DEFAULT 0,
    total_due numeric(15,2) DEFAULT 0,
    disbursed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Guarantors
CREATE TABLE IF NOT EXISTS public.loan_guarantors (
    id SERIAL PRIMARY KEY,
    loan_application_id integer REFERENCES public.loan_applications(id) ON DELETE CASCADE,
    guarantor_id integer REFERENCES public.users(id),
    amount_guaranteed numeric(15,2) DEFAULT 0,
    status character varying(20) DEFAULT 'PENDING',
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(loan_application_id, guarantor_id)
);

-- Votes
CREATE TABLE IF NOT EXISTS public.votes (
    id SERIAL PRIMARY KEY,
    loan_application_id integer REFERENCES public.loan_applications(id),
    user_id integer REFERENCES public.users(id),
    vote character varying(10) CHECK (vote IN ('YES', 'NO')),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(loan_application_id, user_id)
);

DO $$ 
BEGIN 
    ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP;
    ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS total_due NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS interest_amount NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS fee_transaction_ref VARCHAR(100);
END $$;