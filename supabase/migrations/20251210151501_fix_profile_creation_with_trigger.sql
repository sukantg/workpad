/*
  # Fix Profile Creation with Trigger

  ## Changes
  - Remove the overly permissive anon policy
  - Keep the authenticated user insert policy
  - Update the Auth component to handle profile creation properly

  ## Security Notes
  - Only authenticated users can insert profiles
  - Users can only insert profiles where id matches auth.uid()
*/

-- Drop the anon policy (too permissive)
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;

-- Ensure the authenticated policy exists
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);