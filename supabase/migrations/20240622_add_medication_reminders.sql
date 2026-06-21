-- Medication reminders with intake history
-- Run this in Supabase SQL Editor

-- 1. Medications (pills / vitamins)
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Reminder schedules for each medication
CREATE TABLE IF NOT EXISTS medication_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  time TIME NOT NULL,
  days_of_week INTEGER[] NOT NULL CHECK (array_length(days_of_week, 1) > 0),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Intake logs (pending / taken / skipped)
CREATE TABLE IF NOT EXISTS medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES medication_reminders(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'taken', 'skipped')),
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reminder_id, scheduled_date)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);
CREATE INDEX IF NOT EXISTS idx_medication_reminders_user_enabled ON medication_reminders(user_id, enabled);
CREATE INDEX IF NOT EXISTS idx_medication_logs_reminder_date ON medication_logs(reminder_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_medication_logs_user_date ON medication_logs(user_id, scheduled_date);

-- 5. Enable RLS
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for medications
DROP POLICY IF EXISTS "Users can read own medications" ON medications;
CREATE POLICY "Users can read own medications"
  ON medications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own medications" ON medications;
CREATE POLICY "Users can insert own medications"
  ON medications FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own medications" ON medications;
CREATE POLICY "Users can update own medications"
  ON medications FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own medications" ON medications;
CREATE POLICY "Users can delete own medications"
  ON medications FOR DELETE
  USING (user_id = auth.uid());

-- 7. RLS policies for medication_reminders
DROP POLICY IF EXISTS "Users can read own medication reminders" ON medication_reminders;
CREATE POLICY "Users can read own medication reminders"
  ON medication_reminders FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own medication reminders" ON medication_reminders;
CREATE POLICY "Users can insert own medication reminders"
  ON medication_reminders FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own medication reminders" ON medication_reminders;
CREATE POLICY "Users can update own medication reminders"
  ON medication_reminders FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own medication reminders" ON medication_reminders;
CREATE POLICY "Users can delete own medication reminders"
  ON medication_reminders FOR DELETE
  USING (user_id = auth.uid());

-- 8. RLS policies for medication_logs
DROP POLICY IF EXISTS "Users can read own medication logs" ON medication_logs;
CREATE POLICY "Users can read own medication logs"
  ON medication_logs FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own medication logs" ON medication_logs;
CREATE POLICY "Users can insert own medication logs"
  ON medication_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own medication logs" ON medication_logs;
CREATE POLICY "Users can update own medication logs"
  ON medication_logs FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own medication logs" ON medication_logs;
CREATE POLICY "Users can delete own medication logs"
  ON medication_logs FOR DELETE
  USING (user_id = auth.uid());

-- 9. Updated_at triggers
DROP TRIGGER IF EXISTS update_medications_updated_at ON medications;
CREATE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_medication_reminders_updated_at ON medication_reminders;
CREATE TRIGGER update_medication_reminders_updated_at
  BEFORE UPDATE ON medication_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_medication_logs_updated_at ON medication_logs;
CREATE TRIGGER update_medication_logs_updated_at
  BEFORE UPDATE ON medication_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
