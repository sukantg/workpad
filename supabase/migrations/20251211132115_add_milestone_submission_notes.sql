/*
  # Add Submission Notes to Milestones

  1. Changes to Existing Tables
    - Add `submission_notes` (text) to milestones table
      - This will store the freelancer's submission information
      - Required when submitting a milestone for review
      - Helps clients understand what was completed

  2. Purpose
    - Allows freelancers to provide detailed information about their work
    - Improves transparency in the milestone approval process
    - Creates an audit trail of what was delivered
*/

-- Add submission_notes column to milestones table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'milestones' AND column_name = 'submission_notes'
  ) THEN
    ALTER TABLE milestones ADD COLUMN submission_notes text;
  END IF;
END $$;
