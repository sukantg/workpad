import { useState, useEffect } from 'react';
import { ArrowLeft, DollarSign, User, Calendar, CheckCircle, XCircle, Upload, ExternalLink, Loader2 } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase, Gig, Submission, Profile } from '../lib/supabase';
import Toast from './Toast';
import TransactionHistory from './TransactionHistory';
import MilestoneTracker from './MilestoneTracker';

interface GigDetailProps {
  gigId: string;
  userId: string;
  userType: 'client' | 'freelancer';
  onBack: () => void;
}

export default function GigDetail({ gigId, userId, userType, onBack }: GigDetailProps) {
  const { publicKey, connected } = useWallet();
  const [gig, setGig] = useState<Gig | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [submissionForm, setSubmissionForm] = useState({
    deliverable_url: '',
    notes: '',
  });
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);

  useEffect(() => {
    loadGigDetails();
  }, [gigId]);

  const loadGigDetails = async () => {
    try {
      const { data: gigData, error: gigError } = await supabase
        .from('gigs')
        .select(`
          *,
          client:profiles!gigs_client_id_fkey(*),
          freelancer:profiles!gigs_freelancer_id_fkey(*)
        `)
        .eq('id', gigId)
        .maybeSingle();

      if (gigError) throw gigError;
      setGig(gigData);

      if (gigData?.status === 'submitted' || gigData?.status === 'completed') {
        const { data: submissionData, error: submissionError } = await supabase
          .from('submissions')
          .select('*')
          .eq('gig_id', gigId)
          .maybeSingle();

        if (submissionError) throw submissionError;
        setSubmission(submissionData);
      }
    } catch (err) {
      console.error('Error loading gig details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !publicKey) {
      setToast({ message: 'Please connect your wallet before submitting work', type: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      const { error: submissionError } = await supabase
        .from('submissions')
        .insert({
          gig_id: gigId,
          freelancer_id: userId,
          deliverable_url: submissionForm.deliverable_url,
          notes: submissionForm.notes,
        });

      if (submissionError) throw submissionError;

      const { error: gigError } = await supabase
        .from('gigs')
        .update({ status: 'submitted', updated_at: new Date().toISOString() })
        .eq('id', gigId);

      if (gigError) throw gigError;

      setToast({ message: 'Work submitted successfully! Awaiting client review.', type: 'success' });
      setShowSubmissionForm(false);
      setSubmissionForm({ deliverable_url: '', notes: '' });
      loadGigDetails();
    } catch (err) {
      console.error('Error submitting work:', err);
      setToast({ message: 'Failed to submit work. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!connected || !publicKey) {
      setToast({ message: 'Please connect your wallet before approving work', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const releaseMessage = `Processing payment via x402 from wallet ${publicKey.toBase58().substring(0, 4)}...${publicKey.toBase58().slice(-4)}`;
      setToast({ message: releaseMessage, type: 'info' });

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/milestone-orchestrator`;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gig_id: gigId,
          client_signature: 'temp_signature',
          payment_type: 'full',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve payment');
      }

      const result = await response.json();
      setToast({ message: `${gig?.budget} USDC released via x402 successfully!`, type: 'success' });
      loadGigDetails();
    } catch (err) {
      console.error('Error approving work:', err);
      setToast({ message: err instanceof Error ? err.message : 'Failed to approve work. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!connected || !publicKey) {
      setToast({ message: 'Please connect your wallet before requesting revisions', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const { error: submissionError } = await supabase
        .from('submissions')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
        })
        .eq('gig_id', gigId);

      if (submissionError) throw submissionError;

      const { error: gigError } = await supabase
        .from('gigs')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', gigId);

      if (gigError) throw gigError;

      setToast({ message: 'Revision requested. Freelancer can submit again.', type: 'info' });
      loadGigDetails();
    } catch (err) {
      console.error('Error rejecting work:', err);
      setToast({ message: 'Failed to request revision. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-yellow-400">Loading...</div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-400">Gig not found</div>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="min-h-screen bg-black py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-zinc-400 hover:text-yellow-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-3">{gig.title}</h1>
              <div className="flex items-center space-x-4 text-sm mb-4">
                <span className={`px-3 py-1 rounded-full font-semibold ${
                  gig.status === 'open'
                    ? 'bg-yellow-400/10 text-yellow-400'
                    : gig.status === 'in_progress'
                    ? 'bg-blue-400/10 text-blue-400'
                    : gig.status === 'submitted'
                    ? 'bg-purple-400/10 text-purple-400'
                    : gig.status === 'completed'
                    ? 'bg-green-400/10 text-green-400'
                    : 'bg-red-400/10 text-red-400'
                }`}>
                  {gig.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
            <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-1">
                <DollarSign className="w-5 h-5 text-yellow-400" />
                <span className="text-2xl font-bold text-white">{gig.budget}</span>
              </div>
              <div className="text-xs text-zinc-400">USDC in Escrow</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="text-sm text-zinc-400">Client</div>
                <div className="text-white font-medium">{(gig.client as Profile)?.full_name}</div>
              </div>
            </div>

            {gig.freelancer && (
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-yellow-400" />
                <div>
                  <div className="text-sm text-zinc-400">Freelancer</div>
                  <div className="text-white font-medium">{(gig.freelancer as Profile)?.full_name}</div>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="text-sm text-zinc-400">Posted</div>
                <div className="text-white font-medium">
                  {new Date(gig.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <h2 className="text-lg font-semibold text-white mb-3">Description</h2>
            <p className="text-zinc-300 whitespace-pre-wrap">{gig.description}</p>
          </div>
        </div>

        {gig.has_milestones && gig.freelancer_id && (
          <MilestoneTracker
            gigId={gigId}
            userId={userId}
            userType={userType}
            totalBudget={gig.budget}
          />
        )}

        {userType === 'freelancer' && gig.status === 'in_progress' && gig.freelancer_id === userId && !gig.has_milestones && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-4">Submit Your Work</h2>
            {!showSubmissionForm ? (
              <button
                onClick={() => setShowSubmissionForm(true)}
                className="flex items-center space-x-2 bg-yellow-400 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span>Submit Deliverable</span>
              </button>
            ) : (
              <form onSubmit={handleSubmitWork} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Deliverable URL
                  </label>
                  <input
                    type="url"
                    value={submissionForm.deliverable_url}
                    onChange={(e) => setSubmissionForm({ ...submissionForm, deliverable_url: e.target.value })}
                    className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-lg text-white focus:border-yellow-400 focus:outline-none transition-colors"
                    placeholder="https://..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={submissionForm.notes}
                    onChange={(e) => setSubmissionForm({ ...submissionForm, notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-lg text-white focus:border-yellow-400 focus:outline-none transition-colors resize-none"
                    placeholder="Any additional notes or instructions..."
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-yellow-400 text-black py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit Work</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSubmissionForm(false)}
                    disabled={submitting}
                    className="px-6 py-3 bg-zinc-800 text-white rounded-lg font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {submission && (gig.status === 'submitted' || gig.status === 'completed') && !gig.has_milestones && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Submitted Work</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                submission.status === 'approved'
                  ? 'bg-green-400/10 text-green-400'
                  : submission.status === 'rejected'
                  ? 'bg-red-400/10 text-red-400'
                  : 'bg-yellow-400/10 text-yellow-400'
              }`}>
                {submission.status.toUpperCase()}
              </span>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <div className="text-sm text-zinc-400 mb-1">Deliverable</div>
                <a
                  href={submission.deliverable_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="break-all">{submission.deliverable_url}</span>
                </a>
              </div>
              {submission.notes && (
                <div>
                  <div className="text-sm text-zinc-400 mb-1">Notes</div>
                  <p className="text-white whitespace-pre-wrap">{submission.notes}</p>
                </div>
              )}
              <div>
                <div className="text-sm text-zinc-400 mb-1">Submitted</div>
                <div className="text-white">
                  {new Date(submission.submitted_at).toLocaleString()}
                </div>
              </div>
            </div>

            {userType === 'client' && gig.status === 'submitted' && gig.client_id === userId && (
              <div className="flex space-x-3 pt-6 border-t border-zinc-800">
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center space-x-1.5 bg-green-500 text-white py-1.5 px-3 rounded-lg text-xs font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      <span>Approve & Release Payment</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleReject}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center space-x-1.5 bg-red-500 text-white py-1.5 px-3 rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-3 h-3" />
                  <span>Request Revision</span>
                </button>
              </div>
            )}

            {gig.status === 'completed' && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                <div>
                  <div className="text-green-400 font-semibold">Payment Released</div>
                  <div className="text-zinc-400 text-sm">
                    ${gig.budget} USDC has been transferred to the freelancer
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <TransactionHistory gigId={gigId} />
        </div>
      </div>
    </>
  );
}
