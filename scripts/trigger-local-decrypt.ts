import { ethers } from "hardhat";

/**
 * Manual trigger for local decryption (localhost only)
 * 
 * On localhost, FHEVM Gateway doesn't exist, so we need to manually
 * trigger the decryption callback to simulate what Gateway would do.
 * 
 * Usage: npx hardhat run scripts/trigger-local-decrypt.ts --network localhost
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Get deployed SalaryVault contract
  // Try to get the latest deployed address from deployments
  let salaryVaultAddress: string;
  try {
    const deployment = await import("../deployments/localhost/SalaryVault.json");
    salaryVaultAddress = deployment.address;
    console.log(`📍 Using deployed contract at: ${salaryVaultAddress}\n`);
  } catch {
    // Fallback to hardcoded address if deployment file not found
    salaryVaultAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    console.log(`📍 Using fallback address: ${salaryVaultAddress}\n`);
  }
  
  const salaryVault = await ethers.getContractAt("SalaryVault", salaryVaultAddress);
  
  console.log("🔓 Manual Local Decryption Tool");
  console.log("================================\n");
  
  // Check active entries
  const activeCount = await salaryVault.getActiveEntryCount();
  console.log(`📊 Active entries: ${activeCount}`);
  
  if (activeCount === 0) {
    console.log("❌ No salary data to decrypt. Submit some data first!");
    return;
  }
  
  // Check if already finalized
  const isFinalized = await salaryVault.isStatsFinalized();
  if (isFinalized) {
    console.log("✅ Stats already decrypted!");
    const stats = await salaryVault.getGlobalStats();
    console.log(`\n📈 Current Results:`);
    console.log(`   Average: $${stats.averageSalary.toString()}/month`);
    console.log(`   Count: ${stats.totalCount.toString()}`);
    return;
  }
  
  console.log("\n⏳ Decrypting encrypted salary data...\n");
  
  // Get FHEVM instance for decryption
  const provider = ethers.provider as any;
  const fhevmInstance = provider.fhevmInstance;
  
  if (!fhevmInstance) {
    console.error("❌ FHEVM instance not available. Make sure Hardhat node is running with FHEVM plugin.");
    return;
  }
  
  try {
    // Get encrypted total and count
    const [encryptedTotal, count] = await salaryVault.getEncryptedStats();
    
    console.log(`🔐 Encrypted total handle: ${encryptedTotal}`);
    console.log(`📊 Active count: ${count}\n`);
    
    // Decrypt the encrypted total using mock FHEVM
    console.log("🔓 Decrypting total salary...");
    const decryptedTotal = await fhevmInstance.decrypt(encryptedTotal);
    const totalValue = Number(decryptedTotal);
    
    console.log(`✅ Decrypted total: $${totalValue}`);
    
    // Calculate average
    const average = Math.floor(totalValue / Number(count));
    console.log(`✅ Calculated average: $${average}/month\n`);
    
    // Manually trigger the callback (simulate Gateway)
    console.log("📞 Triggering callback manually...");
    
    // Prepare callback data
    // For globalStatsCallback, we expect requestId + uint32 average value
    const requestId = 1; // Mock request ID
    
    // Pack the average as bytes (uint32 = 4 bytes)
    const averageBytes = ethers.solidityPacked(["uint32"], [average]);
    
    // Call the callback function directly
    const callbackTx = await salaryVault.globalStatsCallback(
      requestId,
      averageBytes,
      [] // Empty signatures array for mock
    );
    
    await callbackTx.wait();
    console.log("✅ Callback executed successfully!\n");
    
    // Verify results
    const finalStats = await salaryVault.getGlobalStats();
    console.log("📈 Final Decrypted Results:");
    console.log(`   Average Salary: $${finalStats.averageSalary.toString()}/month`);
    console.log(`   Total Entries: ${finalStats.totalCount.toString()}`);
    console.log(`\n✅ Local decryption completed successfully!`);
    
  } catch (error: any) {
    console.error("\n❌ Decryption failed:", error.message);
    console.log("\n💡 Troubleshooting:");
    console.log("   1. Make sure Hardhat node is running: npx hardhat node");
    console.log("   2. Make sure contract is deployed: npx hardhat deploy --network localhost");
    console.log("   3. Update the contract address in this script");
    console.log("   4. Submit some salary data first using the frontend");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

