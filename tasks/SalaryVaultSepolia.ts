import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:SalaryVaultSepolia").setAction(async function (taskArguments: TaskArguments, { ethers }) {
  // Get deployed contract address from deployments
  const salaryVaultAddress = process.env.SALARY_VAULT_ADDRESS || "";
  
  if (!salaryVaultAddress) {
    console.error("❌ Error: SALARY_VAULT_ADDRESS environment variable not set");
    console.log("Please deploy the contract first and set the address:");
    console.log("export SALARY_VAULT_ADDRESS=0x...");
    return;
  }

  const salaryVault = await ethers.getContractAt("SalaryVault", salaryVaultAddress);
  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();

  console.log("📋 Testing SalaryVault on Sepolia");
  console.log("Contract Address:", salaryVaultAddress);
  console.log("Signer Address:", signerAddress);
  console.log("");

  // Check if user has already submitted
  const hasSubmitted = await salaryVault.hasSubmitted(signerAddress);
  console.log("Has submitted:", hasSubmitted);

  if (!hasSubmitted) {
    console.log("\n📝 Submitting encrypted salary...");
    console.log("⚠️ Note: You'll need fhevmjs initialized in your frontend to properly encrypt inputs");
    console.log("This test script shows the contract interaction flow.\n");

    // In production, you would use fhevmjs to encrypt the salary
    // For testing purposes on Sepolia, you'll need to use the frontend with proper encryption
    console.log("Please use the frontend UI to submit salaries with proper encryption.");
    console.log("The following steps would be performed in the frontend:");
    console.log("1. Initialize fhevmjs with Sepolia config");
    console.log("2. Create encrypted input with user's salary");
    console.log("3. Call submitSalary with encrypted data");
  } else {
    console.log("✅ You have already submitted a salary entry");
    
    const entryId = await salaryVault.userEntryId(signerAddress);
    const entry = await salaryVault.getEntry(entryId);
    
    console.log("\n📊 Your Entry:");
    console.log("Entry ID:", entryId.toString());
    console.log("Position:", entry.position);
    console.log("Timestamp:", new Date(Number(entry.timestamp) * 1000).toLocaleString());
    console.log("Active:", entry.isActive);
  }

  // Get statistics
  const activeCount = await salaryVault.getActiveEntryCount();
  const totalCount = await salaryVault.getEntryCount();
  
  console.log("\n📊 Global Statistics:");
  console.log("Total Entries:", totalCount.toString());
  console.log("Active Entries:", activeCount.toString());

  // Check if stats are finalized
  const isFinalized = await salaryVault.isStatsFinalized();
  console.log("\nStatistics Finalized:", isFinalized);

  if (isFinalized) {
    const [avgSalary, count] = await salaryVault.getGlobalStats();
    console.log("\n📈 Decrypted Global Statistics:");
    console.log("Average Salary: $" + avgSalary.toString() + "/month");
    console.log("Sample Size:", count.toString());
  } else {
    console.log("\n⏳ Statistics not yet decrypted");
    console.log("Call requestGlobalStats() to trigger decryption");
    
    if (activeCount > 0) {
      console.log("\n🔓 Would you like to request global stats decryption? (requires gas)");
      console.log("Run: await salaryVault.requestGlobalStats()");
    }
  }

  // Test requesting statistics (commented out - uncomment to actually request)
  /*
  if (!isFinalized && activeCount > 0) {
    console.log("\n🔓 Requesting global statistics decryption...");
    const tx = await salaryVault.connect(signer).requestGlobalStats();
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("✅ Decryption request submitted");
    console.log("⏳ Waiting for oracle to decrypt...");
    
    // Poll for finalization (up to 2 minutes)
    for (let i = 0; i < 24; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const finalized = await salaryVault.isStatsFinalized();
      if (finalized) {
        const [avgSalary, count] = await salaryVault.getGlobalStats();
        console.log("\n✅ Statistics decrypted!");
        console.log("Average Salary: $" + avgSalary.toString() + "/month");
        console.log("Sample Size:", count.toString());
        break;
      }
      console.log(`Checking... (${i + 1}/24)`);
    }
  }
  */

  console.log("\n✅ Sepolia test completed");
  console.log("\n📝 Next steps:");
  console.log("1. Use the frontend UI to submit encrypted salaries");
  console.log("2. Call requestGlobalStats() when you want to see averages");
  console.log("3. Wait for oracle decryption (~30-60 seconds)");
  console.log("4. View decrypted statistics");
});


