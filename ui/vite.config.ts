import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  server: {
    host: "::",
    port: 5173,
    headers: {
      // Required by FHEVM SDK for WebAssembly SharedArrayBuffer
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
  plugins: [
    react(),
    nodePolyfills({
      // Enable polyfills for Node.js modules
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Polyfill specific modules
      include: ["util", "stream", "crypto", "buffer"],
    }),
  ],
  assetsInclude: ["**/*.wasm"],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: "globalThis",
    "process.env": {},
  },
  optimizeDeps: {
    exclude: ["@zama-fhe/relayer-sdk"],
  },
});

