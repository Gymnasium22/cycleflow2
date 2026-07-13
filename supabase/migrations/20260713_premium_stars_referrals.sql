-- Premium / Telegram Stars / referrals / gamification / legal

-- Profile extensions
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_plan TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_premium_days INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS log_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_log_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS disclaimer_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doctor_report_credits INTEGER DEFAULT 0;

-- Unique referral codes (nullable until assigned)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code
  ON profiles (referral_code)
  WHERE referral_code IS NOT NULL;

-- Star payment ledger (idempotent by telegram payment charge id)
CREATE TABLE IF NOT EXISTS star_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  telegram_id BIGINT,
  product_id TEXT NOT NULL,
  stars_amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XTR',
  telegram_payment_charge_id TEXT UNIQUE,
  provider_payment_charge_id TEXT,
  invoice_payload TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'refunded', 'failed')),
  raw_update JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_star_payments_user_id ON star_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_star_payments_status ON star_payments(status);

-- Referral events
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_days INTEGER DEFAULT 7,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'rewarded', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  rewarded_at TIMESTAMPTZ,
  UNIQUE (referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- RLS
ALTER TABLE star_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own payments" ON star_payments;
CREATE POLICY "Users can read own payments"
  ON star_payments FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can read own referrals" ON referrals;
CREATE POLICY "Users can read own referrals"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- Assign referral codes for existing profiles that lack one
UPDATE profiles
SET referral_code = lower(substr(md5(id::text || coalesce(telegram_id::text, '')), 1, 8))
WHERE referral_code IS NULL;

-- updated_at trigger already exists for profiles
