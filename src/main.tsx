import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectKitProvider } from 'connectkit';
import { Toaster } from 'sonner';
import { config } from './config';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          theme="midnight"
          customTheme={{
            '--ck-font-family': "'DM Sans', sans-serif",
            '--ck-body-background': '#1f2f44',
            '--ck-body-color': '#f9faf3',
            '--ck-primary-button-background': '#acc6e9',
            '--ck-primary-button-color': '#0d1b2f',
          }}
        >
          <App />
          <Toaster position="bottom-right" richColors />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
