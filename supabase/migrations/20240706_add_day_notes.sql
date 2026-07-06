-- Day notes: free-form journal entries per calendar day
CREATE TABLE IF NOT EXISTS day_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_day_notes_user_date ON day_notes(user_id, date);

ALTER TABLE day_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own day notes" ON day_notes;
CREATE POLICY "Users can read own day notes"
  ON day_notes FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own day notes" ON day_notes;
CREATE POLICY "Users can insert own day notes"
  ON day_notes FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own day notes" ON day_notes;
CREATE POLICY "Users can update own day notes"
  ON day_notes FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own day notes" ON day_notes;
CREATE POLICY "Users can delete own day notes"
  ON day_notes FOR DELETE
  USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_day_notes_updated_at ON day_notes;
CREATE TRIGGER update_day_notes_updated_at
  BEFORE UPDATE ON day_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();