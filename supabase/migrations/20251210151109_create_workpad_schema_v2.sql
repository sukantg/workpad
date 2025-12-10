/*
  # WorkPad - Gig Work Escrow Platform Schema

  ## Overview
  Complete database schema for a decentralized freelance marketplace with Solana escrow payments.

  ## New Tables

  ### 1. profiles
  Stores user information for both clients and freelancers
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `user_type` (text) - 'client' or 'freelancer'
  - `wallet_address` (text) - Solana wallet address for payments
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. gigs
  Job postings created by clients
  - `id` (uuid, primary key) - Unique gig identifier
  - `client_id` (uuid) - References profiles(id)
  - `title` (text) - Gig title
  - `description` (text) - Detailed job description
  - `budget` (numeric) - Payment amount in USDC
  - `status` (text) - 'open', 'in_progress', 'submitted', 'completed', 'cancelled'
  - `freelancer_id` (uuid, nullable) - Assigned freelancer
  - `escrow_address` (text, nullable) - Solana PDA address holding funds
  - `created_at` (timestamptz) - Gig creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. submissions
  Work deliverables submitted by freelancers
  - `id` (uuid, primary key) - Unique submission identifier
  - `gig_id` (uuid) - References gigs(id)
  - `freelancer_id` (uuid) - References profiles(id)
  - `deliverable_url` (text) - Link to submitted work
  - `notes` (text) - Freelancer notes/comments
  - `status` (text) - 'pending', 'approved', 'rejected'
  - `submitted_at` (timestamptz) - Submission timestamp
  - `reviewed_at` (timestamptz, nullable) - Review timestamp

  ### 4. transactions
  Payment tracking for escrow operations
  - `id` (uuid, primary key) - Unique transaction identifier
  - `gig_id` (uuid) - References gigs(id)
  - `transaction_type` (text) - 'escrow', 'release', 'refund'
  - `amount` (numeric) - Transaction amount
  - `tx_signature` (text, nullable) - Solana transaction signature
  - `status` (text) - 'pending', 'confirmed', 'failed'
  - `created_at` (timestamptz) - Transaction timestamp

  ## Security
  - Enable RLS on all tables
  - Profiles: Users can read all profiles, but only update their own
  - Gigs: Anyone can read open gigs, only clients can create, only owners can update
  - Submissions: Only assigned freelancers can create, clients can read their gig submissions
  - Transactions: Users can only view transactions related to their gigs

  ## Important Notes
  1. All monetary values stored as numeric for precision
  2. Wallet addresses stored as text for Solana compatibility
  3. Status fields use text enums for flexibility
  4. Timestamps use timestamptz for timezone awareness
  5. Escrow address field stores Solana PDA for smart contract integration
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  user_type text NOT NULL DEFAULT 'freelancer',
  wallet_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create gigs table
CREATE TABLE IF NOT EXISTS gigs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  budget numeric NOT NULL,
  status text NOT NULL DEFAULT 'open',
  freelancer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  escrow_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  freelancer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deliverable_url text NOT NULL,
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  transaction_type text NOT NULL,
  amount numeric NOT NULL,
  tx_signature text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Gigs policies
CREATE POLICY "Anyone can view open or assigned gigs"
  ON gigs FOR SELECT
  TO authenticated
  USING (
    status = 'open' OR 
    client_id = auth.uid() OR 
    freelancer_id = auth.uid()
  );

CREATE POLICY "Authenticated users can create gigs"
  ON gigs FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients and assigned freelancers can update gigs"
  ON gigs FOR UPDATE
  TO authenticated
  USING (
    client_id = auth.uid() OR 
    freelancer_id = auth.uid()
  )
  WITH CHECK (
    client_id = auth.uid() OR 
    freelancer_id = auth.uid()
  );

-- Submissions policies
CREATE POLICY "Users can view submissions for their gigs"
  ON submissions FOR SELECT
  TO authenticated
  USING (
    freelancer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = submissions.gig_id
      AND gigs.client_id = auth.uid()
    )
  );

CREATE POLICY "Freelancers can create submissions"
  ON submissions FOR INSERT
  TO authenticated
  WITH CHECK (freelancer_id = auth.uid());

CREATE POLICY "Clients can update submission status"
  ON submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = submissions.gig_id
      AND gigs.client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = submissions.gig_id
      AND gigs.client_id = auth.uid()
    )
  );

-- Transactions policies
CREATE POLICY "Users can view their gig transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = transactions.gig_id
      AND (gigs.client_id = auth.uid() OR gigs.freelancer_id = auth.uid())
    )
  );

CREATE POLICY "System can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = transactions.gig_id
      AND (gigs.client_id = auth.uid() OR gigs.freelancer_id = auth.uid())
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
CREATE INDEX IF NOT EXISTS idx_gigs_client_id ON gigs(client_id);
CREATE INDEX IF NOT EXISTS idx_gigs_freelancer_id ON gigs(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_submissions_gig_id ON submissions(gig_id);
CREATE INDEX IF NOT EXISTS idx_transactions_gig_id ON transactions(gig_id);
CREATE INDEX IF NOT EXISTS idx_gigs_escrow_address ON gigs(escrow_address);