-- TransFi Integration Tables for Supabase
-- Run this in your Supabase SQL Editor

-- 1. transfi_users - Store user information
CREATE TABLE IF NOT EXISTS transfi_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfi_user_id VARCHAR(255) UNIQUE,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('individual', 'business')),
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    business_name VARCHAR(255),
    country VARCHAR(10) NOT NULL,
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfi_users_email ON transfi_users(email);
CREATE INDEX IF NOT EXISTS idx_transfi_users_transfi_id ON transfi_users(transfi_user_id);

-- 2. transfi_orders - Store order information
CREATE TABLE IF NOT EXISTS transfi_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfi_order_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES transfi_users(id),
    order_type VARCHAR(50) NOT NULL CHECK (order_type IN ('payin', 'payout', 'crypto_payin', 'crypto_payout')),
    status VARCHAR(50) DEFAULT 'pending',
    deposit_amount DECIMAL(20, 8),
    deposit_currency VARCHAR(20),
    withdraw_amount DECIMAL(20, 8),
    withdraw_currency VARCHAR(20),
    payment_code VARCHAR(100),
    payment_url TEXT,
    wallet_address VARCHAR(255),
    total_fee DECIMAL(20, 8),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfi_orders_transfi_id ON transfi_orders(transfi_order_id);
CREATE INDEX IF NOT EXISTS idx_transfi_orders_user_id ON transfi_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_transfi_orders_status ON transfi_orders(status);

-- 3. transfi_kyc_records - Store KYC information
CREATE TABLE IF NOT EXISTS transfi_kyc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES transfi_users(id) NOT NULL,
    kyc_level VARCHAR(20) DEFAULT 'standard' CHECK (kyc_level IN ('standard', 'advanced')),
    status VARCHAR(50) DEFAULT 'not_started',
    redirect_url TEXT,
    reject_labels TEXT[],
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfi_kyc_user_id ON transfi_kyc_records(user_id);
CREATE INDEX IF NOT EXISTS idx_transfi_kyc_status ON transfi_kyc_records(status);

-- 4. transfi_payout_contacts - Store payout recipient contacts
CREATE TABLE IF NOT EXISTS transfi_payout_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfi_recipient_id VARCHAR(255) UNIQUE,
    user_id UUID REFERENCES transfi_users(id),
    contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('individual', 'business')),
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    business_name VARCHAR(255),
    country VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfi_contacts_email ON transfi_payout_contacts(email);
CREATE INDEX IF NOT EXISTS idx_transfi_contacts_user_id ON transfi_payout_contacts(user_id);

-- 5. transfi_webhook_events - Store webhook events for auditing
CREATE TABLE IF NOT EXISTS transfi_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    order_id UUID REFERENCES transfi_orders(id),
    status VARCHAR(20) DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
    error_message TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfi_webhook_event_type ON transfi_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_transfi_webhook_order_id ON transfi_webhook_events(order_id);
CREATE INDEX IF NOT EXISTS idx_transfi_webhook_status ON transfi_webhook_events(status);

-- Enable Row Level Security (optional - uncomment if needed)
-- ALTER TABLE transfi_users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transfi_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transfi_kyc_records ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transfi_payout_contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transfi_webhook_events ENABLE ROW LEVEL SECURITY;
