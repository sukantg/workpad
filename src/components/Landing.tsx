import { ArrowRight, Lock, Zap, Shield, Briefcase } from 'lucide-react';

interface LandingProps {
  onGetStarted: () => void;
}

export default function Landing({ onGetStarted }: LandingProps) {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20">
          <div className="flex justify-center mb-6">
            <Briefcase className="w-20 h-20 text-yellow-400" />
          </div>
          <h1 className="text-6xl md:text-7xl font-bold mb-6">
            <span className="text-gradient">workpad</span>
          </h1>
          <p className="text-2xl md:text-3xl text-zinc-400 mb-4">
            Trustless Escrow for Freelancers
          </p>
          <p className="text-lg text-zinc-500 max-w-2xl mx-auto mb-10">
            Post gigs, complete work, get paid instantly. Smart contract escrow powered by Solana ensures secure, transparent payments with 400ms settlement.
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center space-x-2 bg-yellow-400 text-black px-8 py-4 rounded-lg font-semibold text-lg hover:bg-yellow-300 transition-all transform hover:scale-105 shadow-lg shadow-yellow-400/20"
          >
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 hover:border-yellow-400/30 transition-all">
            <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Secure Escrow</h3>
            <p className="text-zinc-400">
              Funds locked in Solana smart contracts. Released only when work is approved.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 hover:border-yellow-400/30 transition-all">
            <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Instant Payments</h3>
            <p className="text-zinc-400">
              Get paid in 400ms via x402 micropayments. No waiting for clearing.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 hover:border-yellow-400/30 transition-all">
            <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Trustless</h3>
            <p className="text-zinc-400">
              No middleman needed. Smart contracts handle all transactions transparently.
            </p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-400 text-black rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Client Posts Gig</h3>
              <p className="text-zinc-400">
                Create a job posting and lock payment in escrow via x402
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-400 text-black rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Freelancer Delivers</h3>
              <p className="text-zinc-400">
                Accept the gig, complete work, and submit deliverables
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-400 text-black rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Auto Payment</h3>
              <p className="text-zinc-400">
                Client approves and funds are instantly released from escrow
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
