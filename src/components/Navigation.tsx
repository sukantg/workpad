import { useEffect } from 'react';
import { Briefcase, LogOut, User, Wallet, X } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { supabase } from '../lib/supabase';

interface NavigationProps {
  user: any;
  profile: any;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export default function Navigation({ user, profile, onNavigate, currentPage }: NavigationProps) {
  const { publicKey, connected, disconnect } = useWallet();

  useEffect(() => {
    const linkWallet = async () => {
      if (connected && publicKey && user && profile) {
        const walletAddress = publicKey.toBase58();

        if (profile.wallet_address !== walletAddress) {
          const { error } = await supabase
            .from('profiles')
            .update({ wallet_address: walletAddress })
            .eq('id', user.id);

          if (!error) {
            window.location.reload();
          }
        }
      }
    };

    linkWallet();
  }, [connected, publicKey, user, profile]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleDisconnectWallet = async () => {
    if (user && profile) {
      await supabase
        .from('profiles')
        .update({ wallet_address: null })
        .eq('id', user.id);
    }
    await disconnect();
    window.location.reload();
  };

  return (
    <nav className="border-b border-zinc-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center space-x-2 group"
          >
            <Briefcase className="w-8 h-8 text-yellow-400" />
            <span className="text-2xl font-bold text-gradient">workpad</span>
          </button>

          {user && profile && (
            <div className="flex items-center space-x-6">
              <button
                onClick={() => onNavigate(profile.user_type === 'client' ? 'client' : 'freelancer')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  (currentPage === 'client' || currentPage === 'freelancer')
                    ? 'bg-yellow-400 text-black font-semibold'
                    : 'text-white hover:text-yellow-400'
                }`}
              >
                Dashboard
              </button>

              <div className="flex items-center space-x-3 text-sm">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-zinc-900 rounded-lg border border-zinc-800">
                  <User className="w-4 h-4 text-yellow-400" />
                  <span className="text-white">{profile.full_name}</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-yellow-400 capitalize">{profile.user_type}</span>
                </div>

                {!connected ? (
                  <WalletMultiButton className="!bg-yellow-400 hover:!bg-yellow-300 !text-black !font-semibold !rounded-lg !px-4 !py-2 !h-auto !transition-all" />
                ) : publicKey && (
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-zinc-900 rounded-lg border border-zinc-800 group">
                    <Wallet className="w-4 h-4 text-yellow-400" />
                    <span className="text-zinc-400 font-mono text-xs">
                      {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
                    </span>
                    <button
                      onClick={handleDisconnectWallet}
                      className="ml-1 p-0.5 hover:bg-zinc-800 rounded transition-colors"
                      title="Disconnect wallet"
                    >
                      <X className="w-3 h-3 text-zinc-500 hover:text-red-400" />
                    </button>
                  </div>
                )}

                <button
                  onClick={handleSignOut}
                  className="p-2 hover:bg-zinc-900 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4 text-zinc-400 hover:text-yellow-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
