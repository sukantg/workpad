import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
  
  const errorMessage = `Missing Supabase environment variables: ${missingVars.join(', ')}\n\n` +
    `Please create a .env file in the project root with:\n` +
    `VITE_SUPABASE_URL=your_supabase_project_url\n` +
    `VITE_SUPABASE_ANON_KEY=your_supabase_anon_key\n\n` +
    `Get these values from your Supabase project settings: https://app.supabase.com`;
  
  console.error(errorMessage);
  throw new Error(errorMessage);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  user_type: 'client' | 'freelancer';
  wallet_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Gig {
  id: string;
  client_id: string;
  title: string;
  description: string;
  budget: number;
  status: 'open' | 'in_progress' | 'submitted' | 'completed' | 'cancelled';
  freelancer_id: string | null;
  escrow_address: string | null;
  has_milestones: boolean;
  total_paid_amount: number;
  escrow_pda: string | null;
  milestone_count: number;
  created_at: string;
  updated_at: string;
  client?: Profile;
  freelancer?: Profile;
}

export interface Milestone {
  id: string;
  gig_id: string;
  title: string;
  description: string;
  percentage: number;
  amount: number;
  sequence_order: number;
  status: 'pending' | 'submitted' | 'approved' | 'paid';
  submission_notes: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  transaction_signature: string | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  gig_id: string;
  freelancer_id: string;
  deliverable_url: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
}

export interface Transaction {
  id: string;
  gig_id: string;
  transaction_type: 'escrow' | 'release' | 'refund';
  amount: number;
  tx_signature: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
}
