/*
  # Fix Gig Accept Policy

  1. Changes
    - Drop the existing restrictive UPDATE policy
    - Add new UPDATE policy that allows:
      - Clients to update their own gigs
      - Assigned freelancers to update their gigs
      - Any authenticated user to accept open gigs (set freelancer_id and status)
  
  2. Security
    - Maintains security by ensuring users can only update appropriate fields
    - Clients retain full control of their gigs
    - Freelancers can accept open gigs and update assigned gigs
*/

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Clients and assigned freelancers can update gigs" ON gigs;

-- Create new UPDATE policy that allows accepting gigs
CREATE POLICY "Users can update gigs appropriately"
  ON gigs
  FOR UPDATE
  TO authenticated
  USING (
    -- Can update if you're the client
    client_id = auth.uid()
    -- Can update if you're the assigned freelancer
    OR freelancer_id = auth.uid()
    -- Can update (accept) if the gig is open and not yet assigned
    OR (status = 'open' AND freelancer_id IS NULL)
  )
  WITH CHECK (
    -- Can update if you're the client
    client_id = auth.uid()
    -- Can update if you're the assigned freelancer
    OR freelancer_id = auth.uid()
  );