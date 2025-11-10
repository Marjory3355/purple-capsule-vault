import { ethers } from "hardhat";

/**
 * Simplified local decryption script for demo purposes
 * Does not depend on FHEVM instance, uses simulated data
 */
async function main() {
  console.log("\n🔓 Local Decryption Tool (Demo Version)");
  console.log("================================\n");
  
  // Automatically read deployed contract address
  let salaryVaultAddress: string;
  try {
    const deployment = await import("../deployments/localhost/SalaryVault.json");
    salaryVaultAddress = deployment.address;
  } catch {
    salaryVaultAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  }
  
  console.log(`📍 Contract address: ${salaryVaultAddress}\n`);
  
  const salaryVault = await ethers.getContractAt("SalaryVault", salaryVaultAddress);
  
  // Check active entries
  const activeCount = await salaryVault.getActiveEntryCount();
  console.log(`📊 Active entries: ${activeCount}`);
  
  if (activeCount === 0) {
    console.log("❌ No salary data yet. Please submit some data first!");
    return;
  }
  
  // Check if already finalized
  const isFinalized = await salaryVault.isStatsFinalized();
  if (isFinalized) {
    console.log("\n✅ Statistics already decrypted!");
    const stats = await salaryVault.getGlobalStats();
    console.log(`\n📈 Current Results:`);
    console.log(`   Average Salary: $${stats.averageSalary.toString()}/month`);
    console.log(`   Total Count: ${stats.totalCount.toString()}`);
    return;
  }
  
  console.log("\n⏳ Decrypting salary data...\n");
  
  // Get all entries and calculate total
  let totalSalary = 0;
  const entryCount = await salaryVault.getEntryCount();
  
  console.log("📋 Reading all salary entries:");
  for (let i = 0; i < Number(entryCount); i++) {
    try {
      const entry = await salaryVault.getEntry(i);
      if (entry.isActive) {
        // In real environment, this would decrypt the encrypted salary
        // For demo purposes, we use simulated data
        // User should view their submitted data
        console.log(`   - Entry ${i}: ${entry.position} (encrypted)`);
      }
    } catch (error) {
      // Skip invalid entries
    }
  }
  
  // Note: Actual decryption requires FHEVM
  console.log("\n💡 Demo Note:");
  console.log("   In a real environment, the decryption process would:");
  console.log("   1. Use FHEVM to decrypt the encrypted salary sum");
  console.log("   2. Calculate the average");
  console.log("   3. Trigger the contract callback\n");
  
  // User should manually input total salary (for demo)
  console.log("🎬 Demo Mode: Please manually calculate total salary");
  console.log(`   Example: If there are 2 entries with $8000 and $9000`);
  console.log(`   Then total salary is: 17000\n`);
  
  // This should be obtained from user input, but simplified with default value
  // You can modify this value when recording video
  const estimatedTotal = 17000; // Modify according to your actual data
  const average = Math.floor(estimatedTotal / Number(activeCount));
  
  console.log(`💰 Assumed Total Salary: $${estimatedTotal}`);
  console.log(`📊 Active Entry Count: ${activeCount}`);
  console.log(`📈 Calculated Average: $${average}/month\n`);
  
  console.log("📞 Triggering callback...");
  
  // Trigger callback
  const requestId = 1;
  const averageBytes = ethers.solidityPacked(["uint32"], [average]);
  
  const tx = await salaryVault.globalStatsCallback(requestId, averageBytes, []);
  await tx.wait();
  
  console.log("✅ Callback executed successfully!\n");
  
  // Verify results
  const finalStats = await salaryVault.getGlobalStats();
  console.log("📈 Decryption Complete!");
  console.log(`   Average Salary: $${finalStats.averageSalary.toString()}/month`);
  console.log(`   Total Count: ${finalStats.totalCount.toString()}`);
  console.log("\n🎉 Local decryption completed! Please refresh the browser to view results.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
