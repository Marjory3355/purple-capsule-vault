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

// Cache contract addresses to avoid repeated lookups
const addressCache = new Map<number, string>();

export function getContractAddress(chainId?: number): string {
  const id = chainId ?? 31337;

  // Check cache first
  if (addressCache.has(id)) {
    return addressCache.get(id)!;
  }

  let address: string;
  if (id === 31337) {
    address = SALARY_VAULT_ADDRESS.localhost;
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      throw new Error(
        "SalaryVault contract address not configured for localhost.\n" +
          "Please deploy the contract first: npm run deploy:local",
      );
    }
  } else if (id === 11155111) {
    address = SALARY_VAULT_ADDRESS.sepolia;
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      throw new Error(
        "SalaryVault contract address not configured for Sepolia.\n" +
          "Please deploy the contract first: npm run deploy:sepolia",
      );
    }
  } else {
    throw new Error(
      `Unsupported network (chainId: ${id}).\n` + "Supported networks: Localhost (31337), Sepolia (11155111)",
    );
  }

  // Cache the address
  addressCache.set(id, address);
  return address;
}

export function getSalaryVaultContract(provider: BrowserProvider | JsonRpcProvider, chainId?: number) {
  const address = getContractAddress(chainId);
  return new Contract(address, ABI, provider);
}

export async function hasUserSubmitted(
  provider: BrowserProvider | JsonRpcProvider,
  userAddress: string,
  chainId?: number,
): Promise<boolean> {
  try {
    const contract = getSalaryVaultContract(provider, chainId);
    return await contract.hasSubmitted(userAddress);
  } catch (error: any) {
    console.error("Error checking submission status:", error);
    if (error.message?.includes("network") || error.message?.includes("connection")) {
      throw new Error(`Network error: ${error.message}\n` + "Please check your network connection and try again.");
    }
    throw new Error(
      `Failed to check submission status: ${error.message || "Unknown error"}\n` +
        "Please ensure you're connected to the correct network.",
    );
  }
}

export async function getUserEntry(
  provider: BrowserProvider | JsonRpcProvider,
  userAddress: string,
  chainId?: number,
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
  chainId?: number,
): Promise<number> {
  const contract = getSalaryVaultContract(provider, chainId);
  return Number(await contract.getActiveEntryCount());
}

export async function isStatsFinalized(
  provider: BrowserProvider | JsonRpcProvider,
  chainId?: number,
): Promise<boolean> {
  const contract = getSalaryVaultContract(provider, chainId);
  return await contract.isStatsFinalized();
}

export async function getGlobalStats(
  provider: BrowserProvider | JsonRpcProvider,
  chainId?: number,
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

export async function requestGlobalStats(provider: BrowserProvider, chainId?: number) {
  const signer = await provider.getSigner();
  const contract = getSalaryVaultContract(provider, chainId).connect(signer);
  return await contract.requestGlobalStats();
}

export async function submitSalary(
  provider: BrowserProvider,
  encryptedHandle: string,
  inputProof: string,
  position: string,
  chainId?: number,
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
  chainId?: number,
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

export async function deleteSalary(provider: BrowserProvider, chainId?: number) {
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
  chainId?: number,
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

export async function requestPositionStats(provider: BrowserProvider, position: string, chainId?: number) {
  const signer = await provider.getSigner();
  const contract = getSalaryVaultContract(provider, chainId).connect(signer);
  return await contract.requestPositionStats(position);
}

// Mock decryption for localhost network only
export async function mockDecryptGlobalStats(
  provider: BrowserProvider,
  chainId?: number,
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
    const count = Number(stats.activeCount);

    if (count === 0) {
      throw new Error("No active entries to decrypt");
    }

    console.log("Starting mock decryption for global stats...");
    console.log("Active count:", count);

    // For localhost, we use a mock total value
    // In production, the FHEVM Gateway would decrypt the actual encrypted value
    // Here we simulate with a reasonable average salary (e.g., $7,500/month per person)
    const mockAveragePerPerson = 7500;
    const mockTotalSalary = mockAveragePerPerson * count;

    console.log(`Using mock total salary: ${mockTotalSalary} (${count} entries × $${mockAveragePerPerson})`);

    // Call the new mockGlobalStatsCallback function
    console.log("Calling mockGlobalStatsCallback...");
    const tx = await contract.mockGlobalStatsCallback(mockTotalSalary);
    await tx.wait();

    console.log("✅ Mock decryption completed successfully");

    // Get the actual stored result
    const finalStats = await contract.getGlobalStats();
    return {
      average: Number(finalStats.averageSalary),
      count: Number(finalStats.totalCount),
    };
  } catch (error: any) {
    console.error("❌ Mock decryption failed:", error);

    if (error.message?.includes("Stats already finalized")) {
      // Already decrypted, just get the stats
      const contract = getSalaryVaultContract(provider, chainId);
      const stats = await contract.getGlobalStats();
      return {
        average: Number(stats.averageSalary),
        count: Number(stats.totalCount),
      };
    }

    throw new Error(`Mock decryption failed: ${error.message || "Unknown error"}`);
  }
}

// Mock decryption for position stats on localhost network only
export async function mockDecryptPositionStats(
  provider: BrowserProvider,
  position: string,
  chainId?: number,
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
    const count = Number(stats.count);

    if (count === 0) {
      throw new Error(`No entries for position: ${position}`);
    }

    console.log(`Starting mock decryption for position "${position}"...`);
    console.log("Entry count:", count);

    // For localhost, we use a mock total value
    const mockAveragePerPerson = 7500;
    const mockTotalSalary = mockAveragePerPerson * count;

    console.log(`Using mock total salary: ${mockTotalSalary} (${count} entries × $${mockAveragePerPerson})`);

    // Call the new mockPositionStatsCallback function
    console.log("Calling mockPositionStatsCallback...");
    const tx = await contract.mockPositionStatsCallback(position, mockTotalSalary);
    await tx.wait();

    console.log("✅ Mock position decryption completed successfully");

    // Get the actual stored result
    const finalStats = await contract.getPositionStats(position);
    return {
      average: Number(finalStats.averageSalary),
      count: Number(finalStats.count),
    };
  } catch (error: any) {
    console.error("❌ Mock position decryption failed:", error);

    if (error.message?.includes("Position stats already finalized")) {
      // Already decrypted, just get the stats
      const contract = getSalaryVaultContract(provider, chainId);
      const stats = await contract.getPositionStats(position);
      return {
        average: Number(stats.averageSalary),
        count: Number(stats.count),
      };
    }

    throw new Error(`Mock position decryption failed: ${error.message || "Unknown error"}`);
  }
}
