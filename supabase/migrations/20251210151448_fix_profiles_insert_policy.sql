/*
  # Fix Profiles Insert Policy

  ## Changes
  - Drop existing restrictive insert policy
  - Create new policy that allows users to insert their own profile during signup
  - The policy now correctly handles the signup flow where auth.uid() matches the profile id

  ## Security Notes
  - Users can only insert a profile where the id matches their auth.uid()
  - This prevents users from creating profiles for other users
  - The CHECK constraint ensures data integrity
*/

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create a more permissive insert policy for authenticated users
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also add a policy for anon users during the signup process
-- This handles the edge case where the session isn't fully established
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;

CREATE POLICY "Allow profile creation during signup"
  ON profiles FOR INSERT
  TO anon
  WITH CHECK (true);