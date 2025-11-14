import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import { SALARY_VAULT_ADDRESS } from "@/abi/SalaryVaultAddresses";
import SalaryVaultArtifact from "@/abi/SalaryVault.json";

// Extract ABI from Hardhat artifact
const ABI = (SalaryVaultArtifact as any).abi;

export interface SalaryEntry {
  id: number;
  position: string;
  timestamp: number;
  submitter: string;
  isActive: boolean;
}

export function getContractAddress(chainId?: number): string {
  const id = chainId ?? 31337;
  if (id === 31337) {
    const address = SALARY_VAULT_ADDRESS.localhost;
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      throw new Error(
        "SalaryVault contract address not configured for localhost.\n" +
        "Please deploy the contract first: npm run deploy:local"
      );
    }
    return address;
  }
  if (id === 11155111) {
    const address = SALARY_VAULT_ADDRESS.sepolia;
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      throw new Error(
        "SalaryVault contract address not configured for Sepolia.\n" +
        "Please deploy the contract first: npm run deploy:sepolia"
      );
    }
    return address;
  }
  throw new Error(
    `Unsupported network (chainId: ${id}).\n` +
    "Supported networks: Localhost (31337), Sepolia (11155111)"
  );
}

export function getSalaryVaultContract(
  provider: BrowserProvider | JsonRpcProvider,
  chainId?: number
) {
  const address = getContractAddress(chainId);
  return new Contract(address, ABI, provider);
}

export async function hasUserSubmitted(
  provider: BrowserProvider | JsonRpcProvider,
  userAddress: string,
  chainId?: number
): Promise<boolean> {
  try {
    const contract = getSalaryVaultContract(provider, chainId);
    return await contract.hasSubmitted(userAddress);
  } catch (error: any) {
    console.error("Error checking submission status:", error);
    if (error.message?.includes("network") || error.message?.includes("connection")) {
      throw new Error(
        `Network error: ${error.message}\n` +
        "Please check your network connection and try again."
      );
    }
    throw new Error(
      `Failed to check submission status: ${error.message || "Unknown error"}\n` +
      "Please ensure you're connected to the correct network."
    );
  }
}

export async function getUserEntry(
  provider: BrowserProvider | JsonRpcProvider,
  userAddress: string,
  chainId?: number
): Promise<SalaryEntry | null> {
  const contract = getSalaryVaultContract(provider, chainId);
  const submitted = await contract.hasSubmitted(userAddress);
  if (!submitted) return null;
  const entryId = await contract.userEntryId(userAddress);
  const entry = await contract.getEntry(entryId);
  return {
    id: Number(entryId),
    position: entry.position,
    timestamp: Number(entry.timestamp),
    submitter: entry.submitter,
    isActive: entry.isActive,
  };
}

export async function getActiveEntryCount(
  provider: BrowserProvider | JsonRpcProvider,
  chainId?: number
): Promise<number> {
  const contract = getSalaryVaultContract(provider, chainId);
  return Number(await contract.getActiveEntryCount());
}

export async function isStatsFinalized(
  provider: BrowserProvider | JsonRpcProvider,
  chainId?: number
): Promise<boolean> {
  const contract = getSalaryVaultContract(provider, chainId);
  return await contract.isStatsFinalized();
}

export async function getGlobalStats(
  provider: BrowserProvider | JsonRpcProvider,
  chainId?: number
): Promise<{ average: number; count: number; finalized: boolean }> {
  const contract = getSalaryVaultContract(provider, chainId);
  const finalized = await contract.isStatsFinalized();
  const activeCount = Number(await contract.getActiveEntryCount());
  
  if (!finalized) {
    return { average: 0, count: activeCount, finalized: false };
  }
  
  const stats = await contract.getGlobalStats();
  return {
    average: Number(stats.averageSalary),
    count: Number(stats.totalCount),
    finalized: true,
  };
}

export async function requestGlobalStats(
  provider: BrowserProvider,
  chainId?: number
) {
  const signer = await provider.getSigner();
  const contract = getSalaryVaultContract(provider, chainId).connect(signer);
  return await contract.requestGlobalStats();
}

export async function submitSalary(
  provider: BrowserProvider,
  encryptedHandle: string,
  inputProof: string,
  position: string,
  chainId?: number
) {
  try {
    if (!position || position.trim().length === 0) {
      throw new Error("Position cannot be empty");
    }
    if (position.length > 100) {
      throw new Error("Position is too long (max 100 characters)");
    }
    
    const signer = await provider.getSigner();
    const contract = getSalaryVaultContract(provider, chainId).connect(signer);
    const tx = await contract.submitSalary(encryptedHandle, inputProof, position);
    
    console.log("Transaction submitted:", tx.hash);
    return tx;
  } catch (error: any) {
    console.error("Error submitting salary:", error);
    
    // Parse common errors
    if (error.message?.includes("Already submitted")) {
      throw new Error("You have already submitted a salary entry. Please use the update function instead.");
    } else if (error.message?.includes("user rejected")) {
      throw new Error("Transaction was rejected by user.");
    } else if (error.message?.includes("insufficient funds")) {
      throw new Error("Insufficient funds to pay for gas. Please add more ETH to your wallet.");
    } else if (error.message?.includes("network") || error.code === "NETWORK_ERROR") {
      throw new Error("Network error occurred. Please check your connection and try again.");
    } else {
      throw new Error(`Failed to submit salary: ${error.message || "Unknown error"}`);
    }
  }
}

export async function updateSalary(
  provider: BrowserProvider,
  encryptedHandle: string,
  inputProof: string,
  position: string,
  chainId?: number
) {
  try {
    if (!position || position.trim().length === 0) {
      throw new Error("Position cannot be empty");
    }
    if (position.length > 100) {
      throw new Error("Position is too long (max 100 characters)");
    }
    
    const signer = await provider.getSigner();
    const contract = getSalaryVaultContract(provider, chainId).connect(signer);
    const tx = await contract.updateSalary(encryptedHandle, inputProof, position);
    
    console.log("Update transaction submitted:", tx.hash);
    return tx;
  } catch (error: any) {
    console.error("Error updating salary:", error);
    
    // Parse common errors
    if (error.message?.includes("No entry to update")) {
      throw new Error("You don't have a salary entry to update. Please submit a salary first.");
    } else if (error.message?.includes("user rejected")) {
      throw new Error("Transaction was rejected by user.");
    } else if (error.message?.includes("insufficient funds")) {
      throw new Error("Insufficient funds to pay for gas. Please add more ETH to your wallet.");
    } else {
      throw new Error(`Failed to update salary: ${error.message || "Unknown error"}`);
    }
  }
}

export async function deleteSalary(
  provider: BrowserProvider,
  chainId?: number
) {
  try {
    const signer = await provider.getSigner();
    const contract = getSalaryVaultContract(provider, chainId).connect(signer);
    const tx = await contract.deleteSalary();
    
    console.log("Delete transaction submitted:", tx.hash);
    return tx;
  } catch (error: any) {
    console.error("Error deleting salary:", error);
    
    // Parse common errors
    if (error.message?.includes("No entry to delete")) {
      throw new Error("You don't have a salary entry to delete.");
    } else if (error.message?.includes("user rejected")) {
      throw new Error("Transaction was rejected by user.");
    } else if (error.message?.includes("insufficient funds")) {
      throw new Error("Insufficient funds to pay for gas. Please add more ETH to your wallet.");
    } else {
      throw new Error(`Failed to delete salary: ${error.message || "Unknown error"}`);
    }
  }
}

// Get position-specific statistics
export async function getPositionStats(
  provider: BrowserProvider | JsonRpcProvider,
  position: string,
  chainId?: number
): Promise<{ average: number; count: number; finalized: boolean }> {
  const contract = getSalaryVaultContract(provider, chainId);
  const finalized = await contract.isPositionStatsFinalized(position);
  if (!finalized) return { average: 0, count: 0, finalized: false };
  const stats = await contract.getPositionStats(position);
  const average = Number(stats.averageSalary);
  const count = Number(stats.count);
  return {
    average: average,
    count: count,
    finalized: true,
  };
}

export async function requestPositionStats(
  provider: BrowserProvider,
  position: string,
  chainId?: number
) {
  const signer = await provider.getSigner();
  const contract = getSalaryVaultContract(provider, chainId).connect(signer);
  return await contract.requestPositionStats(position);
}

// Mock decryption for localhost network only
export async function mockDecryptGlobalStats(
  provider: BrowserProvider,
  chainId?: number
): Promise<{ average: number; count: number }> {
  const id = chainId ?? 31337;
  if (id !== 31337) {
    throw new Error("Mock decryption is only available on localhost network (chainId 31337)");
  }

  try {
    const signer = await provider.getSigner();
    const contract = getSalaryVaultContract(provider, chainId).connect(signer);
    
    // Check if already finalized
    const isFinalized = await contract.isStatsFinalized();
    if (isFinalized) {
      const stats = await contract.getGlobalStats();
      return {
        average: Number(stats.averageSalary),
        count: Number(stats.totalCount),
      };
    }
    
    // Get encrypted stats
    const stats = await contract.getEncryptedStats();
    const encryptedTotal = stats.encryptedTotal;
    const count = Number(stats.activeCount);
    
    if (count === 0) {
      throw new Error("No active entries to decrypt");
    }
    
    console.log("Starting mock decryption for global stats...");
    console.log("Encrypted total handle:", encryptedTotal);
    console.log("Active count:", count);
    
    // Use Hardhat's built-in FHEVM decrypt via JSON-RPC
    // This is more reliable than trying to use the mock instance directly
    const rpcProvider = new JsonRpcProvider("http://localhost:8545");
    
    // Convert handle to correct format if needed
    let handleToDecrypt = encryptedTotal;
    if (typeof handleToDecrypt === "bigint") {
      handleToDecrypt = "0x" + handleToDecrypt.toString(16).padStart(64, '0');
    }
    
    console.log("Calling fhevm_decrypt RPC method...");
    const decryptedTotal = await rpcProvider.send("fhevm_decrypt", [handleToDecrypt]);
    
    console.log("Decrypted total (raw):", decryptedTotal);
    
    // Parse the decrypted value
    const totalValue = typeof decryptedTotal === "string" 
      ? parseInt(decryptedTotal, 16)
      : Number(decryptedTotal);
      
    const average = Math.floor(totalValue / count);
    
    console.log(`Mock decryption result: total=${totalValue}, count=${count}, average=${average}`);
    
    // Trigger callback manually
    const requestId = 1; // Mock request ID
    const averageBytes = "0x" + average.toString(16).padStart(8, '0'); // Convert to hex bytes (uint32)
    
    console.log("Triggering callback with average:", average, "bytes:", averageBytes);
    const tx = await contract.globalStatsCallback(requestId, averageBytes, []);
    await tx.wait();
    
    console.log("✅ Mock decryption completed successfully");
    
    return { average, count };
  } catch (error: any) {
    console.error("❌ Mock decryption failed:", error);
    
    // Provide helpful error messages
    if (error.message?.includes("fhevm_decrypt")) {
      throw new Error(
        "Mock decryption failed: Hardhat node doesn't support fhevm_decrypt method.\n\n" +
        "Please ensure:\n" +
        "1. Hardhat node is running: npx hardhat node\n" +
        "2. @fhevm/hardhat-plugin is installed and configured\n" +
        "3. Node is running on http://localhost:8545"
      );
    }
    
    throw new Error(`Mock decryption failed: ${error.message || "Unknown error"}`);
  }
}

// Mock decryption for position stats on localhost network only
export async function mockDecryptPositionStats(
  provider: BrowserProvider,
  position: string,
  chainId?: number
): Promise<{ average: number; count: number }> {
  const id = chainId ?? 31337;
  if (id !== 31337) {
    throw new Error("Mock decryption is only available on localhost network (chainId 31337)");
  }

  try {
    const signer = await provider.getSigner();
    const contract = getSalaryVaultContract(provider, chainId).connect(signer);
    
    // Check if already finalized
    const isFinalized = await contract.isPositionStatsFinalized(position);
    if (isFinalized) {
      const stats = await contract.getPositionStats(position);
      return {
        average: Number(stats.averageSalary),
        count: Number(stats.count),
      };
    }
    
    // Get encrypted position stats
    const stats = await contract.getEncryptedPositionStats(position);
    const encryptedTotal = stats.encryptedTotal;
    const count = Number(stats.count);
    
    if (count === 0) {
      throw new Error(`No entries for position: ${position}`);
    }
    
    console.log(`Starting mock decryption for position "${position}"...`);
    console.log("Encrypted total handle:", encryptedTotal);
    console.log("Entry count:", count);
    
    // Use Hardhat's built-in FHEVM decrypt via JSON-RPC
    const rpcProvider = new JsonRpcProvider("http://localhost:8545");
    
    // Convert handle to correct format if needed
    let handleToDecrypt = encryptedTotal;
    if (typeof handleToDecrypt === "bigint") {
      handleToDecrypt = "0x" + handleToDecrypt.toString(16).padStart(64, '0');
    }
    
    console.log("Calling fhevm_decrypt RPC method...");
    const decryptedTotal = await rpcProvider.send("fhevm_decrypt", [handleToDecrypt]);
    
    console.log("Decrypted total (raw):", decryptedTotal);
    
    // Parse the decrypted value
    const totalValue = typeof decryptedTotal === "string" 
      ? parseInt(decryptedTotal, 16)
      : Number(decryptedTotal);
      
    const average = Math.floor(totalValue / count);
    
    console.log(`Mock decryption result for "${position}": total=${totalValue}, count=${count}, average=${average}`);
    
    // Trigger callback manually
    const requestId = 1; // Mock request ID
    const averageBytes = "0x" + average.toString(16).padStart(8, '0'); // Convert to hex bytes (uint32)
    
    console.log("Triggering position callback with average:", average, "bytes:", averageBytes);
    const tx = await contract.positionStatsCallback(requestId, averageBytes, []);
    await tx.wait();
    
    console.log("✅ Mock position decryption completed successfully");
    
    return { average, count };
  } catch (error: any) {
    console.error("❌ Mock position decryption failed:", error);
    
    // Provide helpful error messages
    if (error.message?.includes("fhevm_decrypt")) {
      throw new Error(
        "Mock decryption failed: Hardhat node doesn't support fhevm_decrypt method.\n\n" +
        "Please ensure:\n" +
        "1. Hardhat node is running: npx hardhat node\n" +
        "2. @fhevm/hardhat-plugin is installed and configured\n" +
        "3. Node is running on http://localhost:8545"
      );
    }
    
    throw new Error(`Mock position decryption failed: ${error.message || "Unknown error"}`);
  }
}


