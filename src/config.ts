import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { getDefaultConfig } from 'connectkit';
import { defineChain } from 'viem';

export const arcMainnet = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.arc.io'] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://explorer.arc.io' },
  },
});

export const config = createConfig(
  getDefaultConfig({
    chains: [arcMainnet, mainnet],
    transports: {
      [arcMainnet.id]: http('https://rpc.arc.io'),
      [mainnet.id]: http(),
    },
    walletConnectProjectId: import.meta.env.VITE_WC_PROJECT_ID ?? 'arcstable',
    appName: 'ArcStable',
    appDescription: 'Curve-style stable AMM on Arc — swap USDC/EURC with near-zero slippage',
    appUrl: 'https://arcstable.arc.io',
  })
);
