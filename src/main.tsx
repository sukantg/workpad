// Import polyfills first to ensure Buffer is available globally
import './polyfills';

// Suppress Ethereum provider errors from browser extensions (MetaMask, Core, etc.)
// These are harmless conflicts between wallet extensions and don't affect Solana functionality
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    // Filter out Ethereum provider conflicts from browser extensions
    if (
      message.includes('Cannot redefine property: ethereum') ||
      message.includes('Cannot set property ethereum') ||
      message.includes('MetaMask encountered an error setting the global Ethereum provider')
    ) {
      // Silently ignore these extension conflicts
      return;
    }
    originalError.apply(console, args);
  };
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SolanaWalletProvider } from './components/WalletProvider';

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <SolanaWalletProvider>
        <App />
      </SolanaWalletProvider>
    </StrictMode>
  );
} catch (error) {
  console.error('Failed to initialize application:', error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 2rem; font-family: system-ui, sans-serif;">
        <h1 style="color: #ef4444;">Application Error</h1>
        <p style="color: #6b7280; margin-top: 1rem;">${error instanceof Error ? error.message : 'Unknown error occurred'}</p>
        <p style="color: #6b7280; margin-top: 1rem; font-size: 0.875rem;">
          Please check the browser console for more details.
        </p>
      </div>
    `;
  }
}
