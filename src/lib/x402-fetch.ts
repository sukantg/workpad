// Ensure Buffer polyfill is loaded before faremeter packages
import '../polyfills';

import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { createLocalWallet } from '@faremeter/wallet-solana';
import { createPaymentHandler } from '@faremeter/payment-solana/exact';
import { wrap as wrapFetch } from '@faremeter/fetch';
import { lookupKnownSPLToken } from '@faremeter/info/solana';

let x402Fetch: typeof fetch | null = null;

export async function initializeX402Fetch(wallet: any) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const network = 'devnet';
  const connection = new Connection(clusterApiUrl(network), 'confirmed');

  const usdcInfo = lookupKnownSPLToken(network, 'USDC');
  if (!usdcInfo) {
    throw new Error('Could not find USDC mint for network');
  }

  const mint = new PublicKey(usdcInfo.address);

  const walletAdapter = {
    ...wallet,
    network,
  };

  const fareMeterWallet = await createLocalWallet(network, walletAdapter);
  const paymentHandler = createPaymentHandler(fareMeterWallet, mint, connection);

  x402Fetch = wrapFetch(fetch, {
    handlers: [paymentHandler],
  });

  return x402Fetch;
}

export function getX402Fetch(): typeof fetch {
  if (!x402Fetch) {
    throw new Error('x402 fetch not initialized. Call initializeX402Fetch first.');
  }
  return x402Fetch;
}

export function isX402Initialized(): boolean {
  return x402Fetch !== null;
}
