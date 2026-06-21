-- Add notes column to cycles table
ALTER TABLE cycles
ADD COLUMN IF NOT EXISTS notes TEXT;
