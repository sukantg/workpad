import { useState, useEffect } from 'react';
import { DollarSign, Clock, Briefcase, CheckCircle, Wallet } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase, Gig } from '../lib/supabase';
import Toast from './Toast';

interface FreelancerDashboardProps {
  userId: string;
  onViewGig: (gigId: string) => void;
}

export default function FreelancerDashboard({ userId, onViewGig }: FreelancerDashboardProps) {
  const wallet = useWallet();
  const [openGigs, setOpenGigs] = useState<Gig[]>([]);
  const [myGigs, setMyGigs] = useState<Gig[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'my-gigs'>('available');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    loadGigs();
  }, [userId]);

  const loadGigs = async () => {
    try {
      const [openResult, myResult] = await Promise.all([
        supabase
          .from('gigs')
          .select('*, client:profiles!gigs_client_id_fkey(full_name)')
          .eq('status', 'open')
          .order('created_at', { ascending: false }),
        supabase
          .from('gigs')
          .select('*, client:profiles!gigs_client_id_fkey(full_name)')
          .eq('freelancer_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      if (openResult.error) throw openResult.error;
      if (myResult.error) throw myResult.error;

      setOpenGigs(openResult.data || []);
      setMyGigs(myResult.data || []);
    } catch (err) {
      console.error('Error loading gigs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptGig = async (gigId: string) => {
    if (!wallet.connected || !wallet.publicKey) {
      setToast({
        message: 'Please connect your Solana wallet before accepting gigs',
        type: 'error'
      });
      return;
    }

    try {
      await supabase
        .from('profiles')
        .update({ wallet_address: wallet.publicKey.toString() })
        .eq('id', userId);

      const { error } = await supabase
        .from('gigs')
        .update({
          freelancer_id: userId,
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', gigId);

      if (error) throw error;
      setToast({ message: 'Gig accepted! Start working on it now.', type: 'success' });
      await loadGigs();
      setActiveTab('my-gigs');
    } catch (err) {
      console.error('Error accepting gig:', err);
      setToast({ message: 'Failed to accept gig. Please try again.', type: 'error' });
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Freelancer Dashboard</h1>
          <p className="text-zinc-400">Find work and manage your active gigs</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-2">
              <Briefcase className="w-5 h-5 text-yellow-400" />
              <span className="text-zinc-400">Active Gigs</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {myGigs.filter(g => g.status === 'in_progress' || g.status === 'submitted').length}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-zinc-400">Completed</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {myGigs.filter(g => g.status === 'completed').length}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-2">
              <DollarSign className="w-5 h-5 text-yellow-400" />
              <span className="text-zinc-400">Total Earned</span>
            </div>
            <div className="text-3xl font-bold text-white">
              ${myGigs.filter(g => g.status === 'completed').reduce((sum, g) => sum + Number(g.budget), 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('available')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'available'
                ? 'bg-yellow-400 text-black'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            Available Gigs ({openGigs.length})
          </button>
          <button
            onClick={() => setActiveTab('my-gigs')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'my-gigs'
                ? 'bg-yellow-400 text-black'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            My Gigs ({myGigs.length})
          </button>
        </div>

        {activeTab === 'available' ? (
          openGigs.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
              <Clock className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400 text-lg">No available gigs at the moment</p>
              <p className="text-zinc-500 text-sm mt-2">Check back soon for new opportunities</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {openGigs.map((gig) => (
                <div
                  key={gig.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-yellow-400/30 hover:shadow-xl hover:shadow-yellow-400/10 transition-all duration-300 animate-fade-in"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{gig.title}</h3>
                      <p className="text-zinc-400 mb-3">{gig.description}</p>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-zinc-500">
                          Posted by: <span className="text-white">{(gig.client as any)?.full_name}</span>
                        </span>
                        <span className="text-zinc-500">•</span>
                        <span className="text-zinc-500">
                          {new Date(gig.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center space-x-2 bg-yellow-400/10 px-4 py-2 rounded-lg">
                        <DollarSign className="w-5 h-5 text-yellow-400" />
                        <span className="text-xl font-bold text-white">{gig.budget}</span>
                        <span className="text-zinc-400 text-sm">USDC</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleAcceptGig(gig.id)}
                        disabled={!wallet.connected}
                        className="px-6 py-2 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Accept Gig
                      </button>
                      <button
                        onClick={() => onViewGig(gig.id)}
                        className="px-6 py-3 bg-zinc-800 text-white rounded-lg font-semibold hover:bg-zinc-700 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                    {!wallet.connected && (
                      <div className="flex items-center space-x-2 text-sm text-yellow-400">
                        <Wallet className="w-4 h-4" />
                        <span>Connect your wallet to accept gigs</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          myGigs.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
              <Briefcase className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400 text-lg">No active gigs yet</p>
              <p className="text-zinc-500 text-sm mt-2">Accept a gig to get started</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {myGigs.map((gig) => (
                <div
                  key={gig.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-yellow-400/30 hover:shadow-xl hover:shadow-yellow-400/10 transition-all duration-300 cursor-pointer animate-fade-in"
                  onClick={() => onViewGig(gig.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{gig.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          gig.status === 'in_progress'
                            ? 'bg-blue-400/10 text-blue-400'
                            : gig.status === 'submitted'
                            ? 'bg-purple-400/10 text-purple-400'
                            : gig.status === 'completed'
                            ? 'bg-green-400/10 text-green-400'
                            : 'bg-zinc-700 text-zinc-400'
                        }`}>
                          {gig.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-zinc-400 line-clamp-2">{gig.description}</p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4 bg-yellow-400/10 px-4 py-2 rounded-lg">
                      <DollarSign className="w-5 h-5 text-yellow-400" />
                      <span className="text-white font-semibold">{gig.budget} USDC</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">
                      Client: <span className="text-white">{(gig.client as any)?.full_name}</span>
                    </span>
                    <button className="text-yellow-400 hover:text-yellow-300 transition-colors text-sm font-medium">
                      View Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
        </div>
      </div>
    </>
  );
}
