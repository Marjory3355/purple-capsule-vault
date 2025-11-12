// FHEVM SDK utilities for frontend
import { ethers } from "ethers";
import { JsonRpcProvider } from "ethers";

// Import @zama-fhe/relayer-sdk - use static import
// Note: Vite config excludes this from optimization
import { createInstance, initSDK, SepoliaConfig } from "@zama-fhe/relayer-sdk/bundle";
import type { FhevmInstance } from "@zama-fhe/relayer-sdk/bundle";

// Import @fhevm/mock-utils for localhost mock FHEVM
// Note: Use dynamic import to avoid including in production bundle
let MockFhevmInstance: any = null;

export interface EncryptedInput {
  handles: string[];
  inputProof: string;
}

let fhevmInstance: FhevmInstance | null = null;
let isSDKInitialized = false;
let isMockInstance = false;

// Initialize FHEVM instance
// Note: @zama-fhe/relayer-sdk requires window.ethereum (EIP-1193 provider)
export async function initializeFHEVM(chainId?: number): Promise<FhevmInstance> {
  if (!fhevmInstance) {
    // Check if window.ethereum is available
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("window.ethereum is not available. Please install MetaMask or another Web3 wallet.");
    }

    // Initialize SDK first (loads WASM)
    if (!isSDKInitialized) {
      console.log("Initializing FHE SDK...");
      await initSDK();
      isSDKInitialized = true;
      console.log("FHE SDK initialized");
    }

    // Get chain ID from window.ethereum if not provided
    let currentChainId = chainId;
    if (!currentChainId) {
      try {
        const chainIdHex = await (window as any).ethereum.request({ method: "eth_chainId" });
        currentChainId = parseInt(chainIdHex, 16);
      } catch (error) {
        console.error("Failed to get chain ID:", error);
        // Try to get from provider if available
        if ((window as any).ethereum?.chainId) {
          currentChainId = parseInt((window as any).ethereum.chainId, 16);
        } else {
          currentChainId = 31337; // Default to localhost
        }
      }
    }

    // Configure FHEVM instance
    // Note: For localhost (chainId 31337), we still need to use SepoliaConfig
    // because FHEVM contracts are deployed on Sepolia, not localhost
    // We need to ensure FHEVM SDK can access Sepolia network
    // Solution: Use Sepolia RPC URL directly for FHEVM contracts
    let config: any;
    
    if (currentChainId === 31337) {
      // For localhost (chainId 31337), use Hardhat's FHEVM mock
      // Hardhat node provides FHEVM mock functionality via @fhevm/hardhat-plugin
      // We need to fetch FHEVM metadata from Hardhat node and use @fhevm/mock-utils
      const localhostRpcUrl = "http://localhost:8545";
      
      try {
        // Fetch FHEVM metadata from Hardhat node
        const provider = new JsonRpcProvider(localhostRpcUrl);
        const metadata = await provider.send("fhevm_relayer_metadata", []);
        
        if (metadata && metadata.ACLAddress && metadata.InputVerifierAddress && metadata.KMSVerifierAddress) {
          // Use @fhevm/mock-utils to create mock FHEVM instance
          if (!MockFhevmInstance) {
            // Dynamic import to avoid including in production bundle
            const mockUtils = await import("@fhevm/mock-utils");
            MockFhevmInstance = mockUtils.MockFhevmInstance;
          }
          
          const mockInstance = await MockFhevmInstance.create(provider, provider, {
            aclContractAddress: metadata.ACLAddress,
            chainId: 31337,
            gatewayChainId: 55815,
            inputVerifierContractAddress: metadata.InputVerifierAddress,
            kmsContractAddress: metadata.KMSVerifierAddress,
            verifyingContractAddressDecryption: "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64",
            verifyingContractAddressInputVerification: "0x812b06e1CDCE800494b79fFE4f925A504a9A9810",
          });
          
          fhevmInstance = mockInstance;
          isMockInstance = true;
          console.log("FHEVM mock instance created successfully");
          console.log("Mock instance details:", {
            aclAddress: metadata.ACLAddress,
            inputVerifierAddress: metadata.InputVerifierAddress,
            kmsVerifierAddress: metadata.KMSVerifierAddress,
          });
          return fhevmInstance;
        }
      } catch (error: any) {
        console.warn("Failed to create FHEVM mock instance:", error);
        // Fall through to try SepoliaConfig
      }
      
      // Fallback: try using SepoliaConfig with localhost RPC
      config = {
        ...SepoliaConfig,
        // Use localhost RPC URL for mock FHEVM
        network: localhostRpcUrl,
        // Use localhost chainId for mock FHEVM
        chainId: 31337,
      };
    } else {
      // For other networks, use SepoliaConfig as is
      config = {
        ...SepoliaConfig,
        network: (window as any).ethereum,
      };
    }
    
    try {
      console.log("Creating FHEVM instance with config:", config);
      
      // Add a small delay to ensure SDK is fully initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Cache instance to avoid recreating
      if (!fhevmInstance) {
        fhevmInstance = await createInstance(config);
        console.log("FHEVM instance created successfully");
      } else {
        console.log("Reusing existing FHEVM instance");
      }
    } catch (error: any) {
      console.error("Failed to create FHEVM instance:", error);
      
      // Provide more detailed error message
      let errorMessage = "FHEVM instance creation failed";
      if (error.message) {
        if (currentChainId === 31337) {
          // For localhost, provide localhost-specific error messages
          if (error.message.includes("fetch") || error.message.includes("network")) {
            errorMessage = "Cannot connect to local Hardhat node. Please ensure Hardhat node is running (npx hardhat node).";
          } else if (error.message.includes("timeout")) {
            errorMessage = "Request timeout. Please check if Hardhat node is running.";
          } else if (error.message.includes("getCoprocessorSigners") || error.message.includes("BAD_DATA")) {
            errorMessage = "Cannot get FHEVM contract data from local Hardhat node. Please ensure Hardhat node is running and FHEVM contracts are deployed.";
          } else {
            errorMessage = `FHEVM instance creation failed: ${error.message}`;
          }
        } else {
          // For other networks, provide Sepolia-specific error messages
          if (error.message.includes("fetch") || error.message.includes("network")) {
            errorMessage = "Cannot connect to Sepolia network. Please check your network connection or try again later.";
          } else if (error.message.includes("timeout")) {
            errorMessage = "Request timeout. Please check your network connection or try again later.";
          } else if (error.message.includes("getCoprocessorSigners") || error.message.includes("BAD_DATA")) {
            errorMessage = "Cannot get FHEVM contract data from Sepolia network. Please ensure your network connection is stable or switch to Sepolia network.";
          } else {
            errorMessage = `FHEVM instance creation failed: ${error.message}`;
          }
        }
      } else {
        errorMessage = "Cannot fetch data. Please check your network connection or try again later.";
      }
      
      throw new Error(errorMessage);
    }
  }
  return fhevmInstance;
}

// Get or initialize FHEVM instance
// Note: This function now accepts chainId instead of provider
    // Initialize FHEVM instance with error handling
    export async function getFHEVMInstance(chainId?: number): Promise<FhevmInstance> {
  return initializeFHEVM(chainId);
}

// Encrypt a salary value
export async function encryptSalary(
  fhevm: FhevmInstance,
  contractAddress: string,
  userAddress: string,
  salary: number
): Promise<EncryptedInput> {
  try {
    const encryptedInput = fhevm
      .createEncryptedInput(contractAddress, userAddress)
      .add32(salary);
    
    const encrypted = await encryptedInput.encrypt();
    
    // Convert Uint8Array to hex strings for contract calls
    const handles = encrypted.handles.map(handle => {
      const hexHandle = ethers.hexlify(handle);
      // Pad to 32 bytes if needed
      if (hexHandle.length < 66) {
        const padded = hexHandle.slice(2).padStart(64, '0');
        return `0x${padded}`;
      }
      if (hexHandle.length > 66) {
        return hexHandle.slice(0, 66);
      }
      return hexHandle;
    });
    
    return {
      handles,
      inputProof: ethers.hexlify(encrypted.inputProof),
    };
  } catch (error: any) {
    console.error("Error encrypting salary:", error);
    throw new Error(`Failed to encrypt salary: ${error.message || "Unknown error"}`);
  }
}

// Reset FHEVM instance (useful for network changes)
export function resetFHEVMInstance(): void {
  fhevmInstance = null;
  isSDKInitialized = false;
  isMockInstance = false;
}
