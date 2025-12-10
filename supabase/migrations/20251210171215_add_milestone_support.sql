/*
  # Add Milestone Support for Multi-Stage Escrow

  1. New Tables
    - `milestones`
      - `id` (uuid, primary key)
      - `gig_id` (uuid, foreign key to gigs)
      - `title` (text) - Milestone name/description
      - `description` (text) - Detailed milestone requirements
      - `percentage` (numeric) - Percentage of total budget (e.g., 25.00)
      - `amount` (numeric) - Calculated amount in USDC
      - `sequence_order` (integer) - Order of milestone (1, 2, 3, etc.)
      - `status` (text) - 'pending', 'submitted', 'approved', 'paid'
      - `submitted_at` (timestamptz) - When freelancer submitted milestone
      - `approved_at` (timestamptz) - When client approved milestone
      - `paid_at` (timestamptz) - When payment was released
      - `transaction_signature` (text) - Solana transaction signature
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes to Existing Tables
    - Add `has_milestones` (boolean) to gigs table
    - Add `total_paid_amount` (numeric) to gigs table to track cumulative payments
    - Add `escrow_pda` (text) to gigs table to store Solana PDA address
    - Add `milestone_count` (integer) to gigs table

  3. Security
    - Enable RLS on `milestones` table
    - Add policies for clients and freelancers to view their milestones
    - Add policies for freelancers to submit milestone completion
    - Add policies for clients to approve milestones
    
  4. Indexes
    - Add index on gig_id for faster milestone queries
    - Add index on status for filtering
*/

-- Add milestone support fields to gigs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gigs' AND column_name = 'has_milestones'
  ) THEN
    ALTER TABLE gigs ADD COLUMN has_milestones boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gigs' AND column_name = 'total_paid_amount'
  ) THEN
    ALTER TABLE gigs ADD COLUMN total_paid_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gigs' AND column_name = 'escrow_pda'
  ) THEN
    ALTER TABLE gigs ADD COLUMN escrow_pda text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gigs' AND column_name = 'milestone_count'
  ) THEN
    ALTER TABLE gigs ADD COLUMN milestone_count integer DEFAULT 0;
  END IF;
END $$;

-- Create milestones table
CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  percentage numeric NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  amount numeric NOT NULL CHECK (amount > 0),
  sequence_order integer NOT NULL CHECK (sequence_order > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'paid')),
  submitted_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  transaction_signature text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (gig_id, sequence_order)
);

-- Enable RLS
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for milestones
CREATE POLICY "Clients and freelancers can view milestones"
  ON milestones
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = milestones.gig_id
      AND (gigs.client_id = auth.uid() OR gigs.freelancer_id = auth.uid())
    )
  );

CREATE POLICY "Clients can create milestones"
  ON milestones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = milestones.gig_id
      AND gigs.client_id = auth.uid()
    )
  );

CREATE POLICY "Freelancers can submit milestones"
  ON milestones
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = milestones.gig_id
      AND gigs.freelancer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = milestones.gig_id
      AND gigs.freelancer_id = auth.uid()
    )
  );

CREATE POLICY "Clients can approve milestones"
  ON milestones
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = milestones.gig_id
      AND gigs.client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = milestones.gig_id
      AND gigs.client_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_milestones_gig_id ON milestones(gig_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_sequence ON milestones(gig_id, sequence_order);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_milestones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_milestones_timestamp
  BEFORE UPDATE ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_milestones_updated_at();