import { useState, useEffect } from 'react';
import { CheckCircle, Clock, Upload, Loader2, DollarSign, X } from 'lucide-react';
import { supabase, Milestone } from '../lib/supabase';
import Toast from './Toast';

interface MilestoneTrackerProps {
  gigId: string;
  userId: string;
  userType: 'client' | 'freelancer';
  totalBudget: number;
}

export default function MilestoneTracker({ gigId, userId, userType, totalBudget }: MilestoneTrackerProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    loadMilestones();
    if (userType === 'freelancer') {
      checkWalletConnection();
    }

    const subscription = supabase
      .channel('milestones-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'milestones',
        filter: `gig_id=eq.${gigId}`
      }, () => {
        loadMilestones();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [gigId, userType]);

  const checkWalletConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setHasWallet(!!data?.wallet_address);
    } catch (err) {
      console.error('Error checking wallet:', err);
      setHasWallet(false);
    }
  };

  const loadMilestones = async () => {
    try {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('gig_id', gigId)
        .order('sequence_order', { ascending: true });

      if (error) throw error;
      setMilestones(data || []);
    } catch (err) {
      console.error('Error loading milestones:', err);
    } finally {
      setLoading(false);
    }
  };

  const openSubmitModal = (milestone: Milestone) => {
    if (!hasWallet) {
      setToast({
        message: 'Please connect your wallet before submitting milestones',
        type: 'error'
      });
      return;
    }
    setSelectedMilestone(milestone);
    setSubmissionNotes('');
    setShowSubmitModal(true);
  };

  const closeSubmitModal = () => {
    setShowSubmitModal(false);
    setSelectedMilestone(null);
    setSubmissionNotes('');
  };

  const handleSubmitMilestone = async () => {
    if (!selectedMilestone || !submissionNotes.trim()) {
      setToast({ message: 'Please provide submission notes', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('milestones')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submission_notes: submissionNotes.trim(),
        })
        .eq('id', selectedMilestone.id);

      if (error) throw error;

      setToast({ message: 'Milestone submitted for review', type: 'success' });
      closeSubmitModal();
      loadMilestones();
    } catch (err) {
      console.error('Error submitting milestone:', err);
      setToast({ message: 'Failed to submit milestone', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveMilestone = async (milestoneId: string) => {
    setSubmitting(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/milestone-orchestrator`;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          milestone_id: milestoneId,
          client_signature: 'temp_signature',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve milestone');
      }

      setToast({ message: 'Milestone approved and payment released', type: 'success' });
      loadMilestones();
    } catch (err) {
      console.error('Error approving milestone:', err);
      setToast({ message: err instanceof Error ? err.message : 'Failed to approve milestone', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-zinc-400" />;
      case 'submitted':
        return <Upload className="w-5 h-5 text-purple-400" />;
      case 'approved':
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      default:
        return <Clock className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-zinc-700 text-zinc-300';
      case 'submitted':
        return 'bg-purple-400/10 text-purple-400';
      case 'approved':
        return 'bg-yellow-400/10 text-yellow-400';
      case 'paid':
        return 'bg-green-400/10 text-green-400';
      default:
        return 'bg-zinc-700 text-zinc-300';
    }
  };

  if (loading) {
    return <div className="text-zinc-400">Loading milestones...</div>;
  }

  if (milestones.length === 0) {
    return null;
  }

  const totalPaid = milestones
    .filter(m => m.status === 'paid')
    .reduce((sum, m) => sum + Number(m.amount), 0);

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Milestone Payments</h2>
          <div className="text-sm text-zinc-400">
            <span className="text-green-400 font-semibold">${totalPaid.toFixed(2)}</span> / ${totalBudget} paid
          </div>
        </div>

        <div className="space-y-4">
          {milestones.map((milestone, index) => (
            <div
              key={milestone.id}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 hover:border-yellow-400/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="mt-1">{getStatusIcon(milestone.status)}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{milestone.title}</h3>
                    <p className="text-zinc-400 text-sm mb-3">{milestone.description}</p>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className={`px-3 py-1 rounded-full font-semibold ${getStatusColor(milestone.status)}`}>
                        {milestone.status.toUpperCase()}
                      </span>
                      {milestone.submitted_at && (
                        <span className="text-zinc-500">
                          Submitted: {new Date(milestone.submitted_at).toLocaleDateString()}
                        </span>
                      )}
                      {milestone.approved_at && (
                        <span className="text-zinc-500">
                          Approved: {new Date(milestone.approved_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <div className="flex items-center space-x-2 bg-yellow-400/10 px-4 py-2 rounded-lg">
                    <DollarSign className="w-4 h-4 text-yellow-400" />
                    <span className="text-white font-semibold">{milestone.amount}</span>
                    <span className="text-zinc-400 text-sm">USDC</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">{milestone.percentage}% of total</div>
                </div>
              </div>

              {userType === 'freelancer' && milestone.status === 'pending' && (
                <>
                  <button
                    onClick={() => openSubmitModal(milestone)}
                    disabled={submitting || !hasWallet || (index > 0 && milestones[index - 1].status !== 'paid')}
                    className="w-full mt-4 py-2 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Submit Milestone</span>
                  </button>
                  {!hasWallet && (
                    <p className="text-xs text-red-400 mt-2 text-center">
                      Connect your wallet to submit milestones
                    </p>
                  )}
                  {hasWallet && index > 0 && milestones[index - 1].status !== 'paid' && (
                    <p className="text-xs text-zinc-500 mt-2 text-center">
                      Complete previous milestone first
                    </p>
                  )}
                </>
              )}

              {milestone.submission_notes && (
                <div className="mt-4 p-4 bg-zinc-700/50 rounded-lg">
                  <h4 className="text-sm font-semibold text-yellow-400 mb-2">Submission Notes</h4>
                  <p className="text-zinc-300 text-sm whitespace-pre-wrap">{milestone.submission_notes}</p>
                </div>
              )}

              {userType === 'client' && milestone.status === 'submitted' && (
                <button
                  onClick={() => handleApproveMilestone(milestone.id)}
                  disabled={submitting}
                  className="w-full mt-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve & Release ${milestone.amount} USDC</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-zinc-800 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-zinc-300 font-medium">Progress</span>
            <span className="text-white font-semibold">
              {milestones.filter(m => m.status === 'paid').length} / {milestones.length} milestones completed
            </span>
          </div>
          <div className="mt-3 w-full bg-zinc-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-yellow-400 to-green-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(totalPaid / totalBudget) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {showSubmitModal && selectedMilestone && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Submit Milestone</h3>
              <button
                onClick={closeSubmitModal}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                disabled={submitting}
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mb-4">
                <h4 className="text-lg font-semibold text-white mb-1">{selectedMilestone.title}</h4>
                <p className="text-zinc-400 text-sm mb-3">{selectedMilestone.description}</p>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-yellow-400" />
                  <span className="text-white font-semibold">{selectedMilestone.amount} USDC</span>
                </div>
              </div>

              <label className="block text-sm font-semibold text-zinc-300 mb-2">
                Submission Notes <span className="text-red-400">*</span>
              </label>
              <textarea
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                placeholder="Describe what you've completed for this milestone. Include any relevant details, links to deliverables, or notes for the client..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-white placeholder-zinc-500 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all resize-none"
                rows={6}
                disabled={submitting}
              />
              <p className="text-xs text-zinc-500 mt-2">
                This information will be sent to the client for review
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={closeSubmitModal}
                disabled={submitting}
                className="flex-1 py-3 bg-zinc-800 text-white rounded-lg font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitMilestone}
                disabled={submitting || !submissionNotes.trim()}
                className="flex-1 py-3 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Submit for Review</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
