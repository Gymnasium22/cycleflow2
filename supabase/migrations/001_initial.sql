-- Add missing columns for existing tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Профили пользователей, созданные на основе Telegram
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  language_code TEXT DEFAULT 'ru',
  cycle_length INTEGER DEFAULT 28,
  period_length INTEGER DEFAULT 5,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Циклы: начало и конец каждой менструации
CREATE TABLE IF NOT EXISTS cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  period_length INTEGER DEFAULT 5,
  cycle_length INTEGER DEFAULT 28,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, start_date)
);

-- Симптомы и самочувствие по дням
CREATE TABLE IF NOT EXISTS symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  symptom_type TEXT NOT NULL,
  intensity INTEGER CHECK (intensity BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date, symptom_type)
);

-- Настройки уведомлений
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notify_period BOOLEAN DEFAULT true,
  notify_ovulation BOOLEAN DEFAULT false,
  notify_time TIME DEFAULT '09:00',
  period_reminder_days INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_cycles_user_id ON cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_cycles_start_date ON cycles(start_date);
CREATE INDEX IF NOT EXISTS idx_symptoms_user_date ON symptoms(user_id, date);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON profiles(telegram_id);

-- Включить RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Политики для profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Политики для cycles
DROP POLICY IF EXISTS "Users can read own cycles" ON cycles;
CREATE POLICY "Users can read own cycles"
  ON cycles FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own cycles" ON cycles;
CREATE POLICY "Users can insert own cycles"
  ON cycles FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own cycles" ON cycles;
CREATE POLICY "Users can update own cycles"
  ON cycles FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own cycles" ON cycles;
CREATE POLICY "Users can delete own cycles"
  ON cycles FOR DELETE
  USING (user_id = auth.uid());

-- Политики для symptoms
DROP POLICY IF EXISTS "Users can read own symptoms" ON symptoms;
CREATE POLICY "Users can read own symptoms"
  ON symptoms FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own symptoms" ON symptoms;
CREATE POLICY "Users can insert own symptoms"
  ON symptoms FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own symptoms" ON symptoms;
CREATE POLICY "Users can update own symptoms"
  ON symptoms FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own symptoms" ON symptoms;
CREATE POLICY "Users can delete own symptoms"
  ON symptoms FOR DELETE
  USING (user_id = auth.uid());

-- Политики для settings
DROP POLICY IF EXISTS "Users can read own settings" ON settings;
CREATE POLICY "Users can read own settings"
  ON settings FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own settings" ON settings;
CREATE POLICY "Users can insert own settings"
  ON settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own settings" ON settings;
CREATE POLICY "Users can update own settings"
  ON settings FOR UPDATE
  USING (user_id = auth.uid());

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cycles_updated_at ON cycles;
CREATE TRIGGER update_cycles_updated_at
  BEFORE UPDATE ON cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_symptoms_updated_at ON symptoms;
CREATE TRIGGER update_symptoms_updated_at
  BEFORE UPDATE ON symptoms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
