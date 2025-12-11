import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SolanaWalletProvider } from './components/WalletProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SolanaWalletProvider>
      <App />
    </SolanaWalletProvider>
  </StrictMode>
);
