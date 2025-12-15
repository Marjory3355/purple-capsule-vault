import { ethers } from "hardhat";

/**
 * Manual trigger for local decryption (localhost only)
 *
 * On localhost, FHEVM Gateway doesn't exist, so we use the mock
 * decryption function to simulate what Gateway would do.
 *
 * Usage: npx hardhat run scripts/trigger-local-decrypt.ts --network localhost
 */
async function main() {
  const [signer] = await ethers.getSigners();

  // Get deployed SalaryVault contract
  let salaryVaultAddress: string;
  try {
    const deployment = await import("../deployments/localhost/SalaryVault.json");
    salaryVaultAddress = deployment.address;
    console.log(`Using deployed contract at: ${salaryVaultAddress}\n`);
  } catch {
    salaryVaultAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    console.log(`Using fallback address: ${salaryVaultAddress}\n`);
  }

  const salaryVault = await ethers.getContractAt("SalaryVault", salaryVaultAddress);

  console.log("=================================");
  console.log("  Local Mock Decryption Tool");
  console.log("=================================\n");
  console.log(`Signer: ${signer.address}\n`);

  // Check active entries
  const activeCount = await salaryVault.getActiveEntryCount();
  console.log(`Active entries: ${activeCount}`);

  if (activeCount === 0n) {
    console.log("\n❌ No salary data to decrypt. Submit some data first!");
    return;
  }

  // Check if already finalized
  const isFinalized = await salaryVault.isStatsFinalized();
  if (isFinalized) {
    console.log("\n✅ Stats already decrypted!");
    const stats = await salaryVault.getGlobalStats();
    console.log(`\nCurrent Results:`);
    console.log(`   Average: $${stats.averageSalary.toString()}/month`);
    console.log(`   Count: ${stats.totalCount.toString()} participants`);

    // Ask if user wants to reset
    console.log("\nTo re-test decryption, run with --reset flag");
    return;
  }

  console.log("\n🔓 Decrypting encrypted salary data...\n");

  try {
    // Get encrypted stats
    const [encryptedTotal, count] = await salaryVault.getEncryptedStats();
    console.log(`Encrypted total handle: ${encryptedTotal}`);
    console.log(`Active count: ${count}\n`);

    // For localhost mock, we estimate a reasonable salary value
    // In production, the FHEVM Gateway would decrypt the actual value
    let decryptedTotal: bigint;

    try {
      // Try to use fhevm_decrypt RPC method (if available)
      const handleHex =
        typeof encryptedTotal === "bigint"
          ? "0x" + encryptedTotal.toString(16).padStart(64, "0")
          : encryptedTotal.toString();

      const result = await ethers.provider.send("fhevm_decrypt", [handleHex]);
      decryptedTotal = BigInt(result);
      console.log(`✅ Decrypted via RPC: ${decryptedTotal}`);
    } catch {
      // Fallback: use a reasonable mock value for demo
      // This simulates what the actual decrypted value might be
      console.log("ℹ️  RPC decrypt not available, using mock value...");

      // Mock: assume average salary around $7,500/month
      const mockAveragePerPerson = 7500n;
      decryptedTotal = mockAveragePerPerson * BigInt(count);
      console.log(`📊 Mock total: $${decryptedTotal} (${count} entries × $${mockAveragePerPerson})`);
    }

    // Calculate average
    const average = Number(decryptedTotal / BigInt(count));
    console.log(`📈 Calculated average: $${average}/month\n`);

    // Call the mock callback function
    console.log("⏳ Calling mockGlobalStatsCallback...");

    const tx = await salaryVault.mockGlobalStatsCallback(Number(decryptedTotal));
    console.log(`   Transaction: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`   Block: ${receipt?.blockNumber}`);
    console.log(`   Gas used: ${receipt?.gasUsed.toString()}`);

    console.log("\n✅ Decryption complete!");

    // Verify the result
    const stats = await salaryVault.getGlobalStats();
    console.log("\n=================================");
    console.log("        DECRYPTED RESULTS");
    console.log("=================================");
    console.log(`   Average Salary: $${stats.averageSalary.toString()}/month`);
    console.log(`   Total Entries:  ${stats.totalCount.toString()}`);
    console.log("=================================\n");

    console.log("🎉 Refresh the browser to see updated stats!");
  } catch (error: any) {
    console.error("\n❌ Decryption failed:", error.message);

    if (error.message?.includes("Stats already finalized")) {
      console.log("\nStats are already decrypted. To reset and re-test:");
      console.log("   npx hardhat run scripts/reset-stats.ts --network localhost");
    } else {
      console.log("\nTroubleshooting:");
      console.log("   1. Make sure Hardhat node is running: npx hardhat node");
      console.log("   2. Make sure contract is deployed: npx hardhat deploy --network localhost");
      console.log("   3. Submit some salary data first using the frontend");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
