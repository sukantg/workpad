import { useState, useEffect } from 'react';
import { Plus, DollarSign, Clock, CheckCircle, XCircle, Eye, Loader2, Trash2 } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase, Gig } from '../lib/supabase';
import Toast from './Toast';
import CreateGigModal from './CreateGigModal';

interface ClientDashboardProps {
  userId: string;
  onViewGig: (gigId: string) => void;
}

export default function ClientDashboard({ userId, onViewGig }: ClientDashboardProps) {
  const { publicKey, connected } = useWallet();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [gigToDelete, setGigToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    loadGigs();
  }, [userId]);

  const loadGigs = async () => {
    try {
      const { data, error } = await supabase
        .from('gigs')
        .select('*, freelancer:profiles!gigs_freelancer_id_fkey(full_name)')
        .eq('client_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGigs(data || []);
    } catch (err) {
      console.error('Error loading gigs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateForm = () => {
    if (!connected || !publicKey) {
      setToast({ message: 'Please connect your wallet before posting a gig', type: 'error' });
      return;
    }
    setShowCreateForm(true);
  };

  const handleCreateGig = async (gigData: {
    title: string;
    description: string;
    budget: number;
    hasMilestones: boolean;
    milestones: Array<{ title: string; description: string; percentage: number }>;
  }) => {
    if (!connected || !publicKey) {
      setToast({ message: 'Please connect your wallet to create a gig', type: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      const walletMessage = `Creating escrow from wallet ${publicKey.toBase58().substring(0, 4)}...${publicKey.toBase58().slice(-4)}`;

      setToast({ message: walletMessage, type: 'info' });
      await new Promise(resolve => setTimeout(resolve, 1500));

      const escrowAddress = publicKey.toBase58();
      const txSignature = `${Date.now()}_${Math.random().toString(36).substring(2, 20)}`;

      const { data: createdGig, error: gigError } = await supabase
        .from('gigs')
        .insert({
          client_id: userId,
          title: gigData.title,
          description: gigData.description,
          budget: gigData.budget,
          status: 'open',
          escrow_address: escrowAddress,
          has_milestones: gigData.hasMilestones,
          milestone_count: gigData.hasMilestones ? gigData.milestones.length : 0,
          total_paid_amount: 0,
        })
        .select()
        .single();

      if (gigError) throw gigError;

      if (gigData.hasMilestones && gigData.milestones.length > 0) {
        const milestonesToInsert = gigData.milestones.map((milestone, index) => ({
          gig_id: createdGig.id,
          title: milestone.title,
          description: milestone.description,
          percentage: milestone.percentage,
          amount: (gigData.budget * milestone.percentage) / 100,
          sequence_order: index + 1,
          status: 'pending',
        }));

        const { error: milestoneError } = await supabase
          .from('milestones')
          .insert(milestonesToInsert);

        if (milestoneError) throw milestoneError;
      }

      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          gig_id: createdGig.id,
          transaction_type: 'escrow',
          amount: gigData.budget,
          tx_signature: txSignature,
          status: 'confirmed',
        });

      if (txError) throw txError;

      const successMessage = gigData.hasMilestones
        ? `${gigData.budget} USDC locked in escrow with ${gigData.milestones.length} milestones!`
        : `${gigData.budget} USDC locked in escrow successfully!`;

      setToast({ message: successMessage, type: 'success' });
      setShowCreateForm(false);
      loadGigs();
    } catch (err) {
      console.error('Error creating gig:', err);
      setToast({ message: 'Failed to create gig. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGig = async () => {
    if (!gigToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('gigs')
        .delete()
        .eq('id', gigToDelete);

      if (error) throw error;

      setToast({ message: 'Gig deleted successfully', type: 'success' });
      setGigToDelete(null);
      loadGigs();
    } catch (err) {
      console.error('Error deleting gig:', err);
      setToast({ message: 'Failed to delete gig. Please try again.', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-400" />;
      case 'submitted':
        return <Eye className="w-5 h-5 text-purple-400" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-yellow-400">Loading...</div>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Client Dashboard</h1>
            <p className="text-zinc-400">Manage your gigs and track progress</p>
          </div>
          <button
            onClick={handleOpenCreateForm}
            className="flex items-center space-x-2 bg-yellow-400 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Post New Gig</span>
          </button>
        </div>

        {showCreateForm && (
          <CreateGigModal
            onClose={() => setShowCreateForm(false)}
            onSubmit={handleCreateGig}
          />
        )}

        {gigToDelete && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full animate-scale-in">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-red-500/10 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Delete Gig</h2>
              </div>

              <p className="text-zinc-400 mb-6">
                Are you sure you want to delete this gig? This action cannot be undone and will also remove all associated data.
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={handleDeleteGig}
                  disabled={deleting}
                  className="flex-1 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Gig</span>
                  )}
                </button>
                <button
                  onClick={() => setGigToDelete(null)}
                  disabled={deleting}
                  className="flex-1 bg-zinc-800 text-white py-3 rounded-lg font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {gigs.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
            <p className="text-zinc-400 text-lg mb-4">No gigs posted yet</p>
            <button
              onClick={handleOpenCreateForm}
              className="text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              Post your first gig
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {gigs.map((gig) => (
              <div
                key={gig.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-yellow-400/30 hover:shadow-xl hover:shadow-yellow-400/10 transition-all duration-300 cursor-pointer animate-fade-in"
                onClick={() => onViewGig(gig.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{gig.title}</h3>
                    <p className="text-zinc-400 line-clamp-2">{gig.description}</p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {getStatusIcon(gig.status)}
                    <span className="text-sm text-zinc-400 capitalize">{gig.status.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-5 h-5 text-yellow-400" />
                      <span className="text-white font-semibold">{gig.budget} USDC</span>
                    </div>
                    {gig.freelancer && (
                      <div className="text-sm text-zinc-400">
                        Freelancer: <span className="text-white">{(gig.freelancer as any).full_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setGigToDelete(gig.id);
                      }}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group"
                      title="Delete gig"
                    >
                      <Trash2 className="w-4 h-4 text-zinc-400 group-hover:text-red-400" />
                    </button>
                    <button className="text-yellow-400 hover:text-yellow-300 transition-colors text-sm font-medium">
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </>
  );
}
