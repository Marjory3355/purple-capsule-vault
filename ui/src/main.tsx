import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { http } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defineChain } from "viem";

// Define localhost chain with correct chainId (31337 for Hardhat)
const localhost = defineChain({
  id: 31337,
  name: "Localhost",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["http://localhost:8545"],
    },
  },
});

// Get Infura API Key from environment variables
const INFURA_API_KEY = import.meta.env.VITE_INFURA_API_KEY || "";

// Use basic config without WalletConnect for local development
// This avoids 403 errors from WalletConnect Project ID restrictions
const config = createConfig({
  chains: [localhost, sepolia],
  transports: {
    [localhost.id]: http("http://localhost:8545", {
      retryCount: 0,
      timeout: 10000,
    }),
    [sepolia.id]: http(
      INFURA_API_KEY && INFURA_API_KEY !== ""
        ? `https://sepolia.infura.io/v3/${INFURA_API_KEY}`
        : "https://rpc.sepolia.org"
    ),
  },
  multiInjectedProviderDiscovery: true,
  ssr: false,
});

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RainbowKitProvider theme={lightTheme({ borderRadius: "large" })}>
          <App />
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  </StrictMode>
);


