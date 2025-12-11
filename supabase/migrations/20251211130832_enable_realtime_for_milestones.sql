/*
  # Enable Realtime for Milestones

  1. Changes
    - Enable realtime replication for milestones table
    - Allows frontend to subscribe to milestone changes in real-time
  
  2. Benefits
    - UI automatically updates when milestone status changes
    - No manual refresh needed
    - Better user experience with instant feedback
*/

-- Enable realtime for milestones table
ALTER PUBLICATION supabase_realtime ADD TABLE milestones;
