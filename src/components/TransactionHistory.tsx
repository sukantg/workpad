import { useState, useEffect } from 'react';
import { DollarSign, Lock, Unlock, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import { supabase, Transaction } from '../lib/supabase';

interface TransactionHistoryProps {
  gigId: string;
}

export default function TransactionHistory({ gigId }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [gigId]);

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('gig_id', gigId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'escrow':
        return <Lock className="w-5 h-5 text-yellow-400" />;
      case 'release':
        return <Unlock className="w-5 h-5 text-green-400" />;
      case 'refund':
        return <DollarSign className="w-5 h-5 text-blue-400" />;
      default:
        return <DollarSign className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-400/10 text-yellow-400',
      confirmed: 'bg-green-400/10 text-green-400',
      failed: 'bg-red-400/10 text-red-400',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <div className="flex items-center justify-center text-yellow-400">
          <Clock className="w-5 h-5 animate-spin mr-2" />
          <span>Loading transactions...</span>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        <p className="text-zinc-400">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
        <DollarSign className="w-6 h-6 text-yellow-400" />
        <span>Transaction History</span>
      </h2>

      <div className="space-y-4">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="bg-black border border-zinc-800 rounded-xl p-4 hover:border-yellow-400/30 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="mt-1">{getTransactionIcon(tx.transaction_type)}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-white font-semibold capitalize">
                      {tx.transaction_type === 'escrow' && 'Funds Locked in Escrow'}
                      {tx.transaction_type === 'release' && 'Payment Released'}
                      {tx.transaction_type === 'refund' && 'Refund Processed'}
                    </span>
                    {getStatusBadge(tx.status)}
                  </div>
                  <div className="text-sm text-zinc-400 mb-2">
                    {new Date(tx.created_at).toLocaleString()}
                  </div>
                  {tx.tx_signature && (
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-zinc-500">Signature:</span>
                      <code className="text-yellow-400 font-mono">{tx.tx_signature}</code>
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="flex items-center space-x-1 text-white font-bold text-lg">
                  <span>{tx.amount}</span>
                  <span className="text-sm text-zinc-400">USDC</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-zinc-800">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Total Transactions</span>
          <span className="text-white font-semibold">{transactions.length}</span>
        </div>
      </div>
    </div>
  );
}
