-- 002_docs.sql — Day 10: AI-generated documentation stored per review
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS generated_docs TEXT;
