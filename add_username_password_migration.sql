-- =============================================
-- Frutos de Copán - Add Username and Password to Users
-- Migration: Add authentication columns to users table
-- =============================================

-- Add username column (allow NULL temporarily for migration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;

-- Add password column (allow NULL temporarily for migration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;

-- Update existing users with default username and password
-- Username will be derived from email (part before @)
-- Password will be a default that should be changed
UPDATE users 
SET 
  username = COALESCE(username, SPLIT_PART(email, '@', 1)),
  password = COALESCE(password, 'frutos123')
WHERE username IS NULL OR password IS NULL;

-- Now make the columns NOT NULL
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ALTER COLUMN password SET NOT NULL;

-- Add unique constraint on username
ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);

-- =============================================
-- VERIFICATION QUERY
-- =============================================

-- Run this to verify the migration was successful
SELECT 
  id,
  name,
  username,
  email,
  role,
  is_active
FROM users
ORDER BY name;
