-- Migration: Add username feature
-- Description: Add unique username field to users, defaulting to email prefix

-- Add username column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Populate existing users with username from email (before @ symbol)
-- Handle duplicates by appending a random suffix
UPDATE public.users
SET username =
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.users u2
      WHERE u2.username = split_part(users.email, '@', 1)
      AND u2.id != users.id
    )
    THEN split_part(users.email, '@', 1) || '_' || substr(md5(random()::text), 1, 4)
    ELSE split_part(users.email, '@', 1)
  END
WHERE username IS NULL;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- Update the handle_new_user function to set default username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_base_username TEXT;
  v_username TEXT;
  v_suffix INTEGER := 0;
BEGIN
  -- Extract base username from email
  v_base_username := split_part(NEW.email, '@', 1);
  v_username := v_base_username;

  -- Handle duplicates by appending incrementing suffix
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = v_username) LOOP
    v_suffix := v_suffix + 1;
    v_username := v_base_username || v_suffix::TEXT;
  END LOOP;

  INSERT INTO public.users (id, email, display_name, avatar_url, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', v_base_username),
    NEW.raw_user_meta_data->>'avatar_url',
    v_username
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make username NOT NULL after populating (for new users)
-- Note: Existing NULL usernames were already populated above
ALTER TABLE public.users
ALTER COLUMN username SET NOT NULL;
