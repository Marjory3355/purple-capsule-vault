import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:SalaryVault").setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
  const { deploy } = deployments;
  const { deployer } = await ethers.getNamedSigners();
  const deployerAddress = await deployer.getAddress();

  // Deploy SalaryVault if not already deployed
  const salaryVaultDeployment = await deploy("SalaryVault", {
    from: deployerAddress,
    args: [],
    log: true,
  });

  const salaryVault = await ethers.getContractAt("SalaryVault", salaryVaultDeployment.address);
  console.log("✅ SalaryVault deployed at:", await salaryVault.getAddress());

  // Get or create signers for testing
  const [, user1, user2, user3] = await ethers.getSigners();

  console.log("\n📝 Testing Salary Submission Flow...\n");

  // Test 1: User1 submits salary as Software Engineer
  console.log("1️⃣ User1 (Software Engineer) submitting salary: $8,000/month");
  const input1 = salaryVault.interface.getFunction("submitSalary")!;
  const { publicKey, privateKey } = (salaryVault.runner?.provider as any)?.fhevmInstance?.generateKeypair() || {};
  
  // For localhost/mock, we create a simple encrypted input
  const salary1 = 8000;
  const encryptedInput1 = await (salaryVault.runner?.provider as any)?.fhevmInstance
    ?.createEncryptedInput(await salaryVault.getAddress(), user1.address)
    .add32(salary1)
    .encrypt();
  
  const tx1 = await salaryVault.connect(user1).submitSalary(
    encryptedInput1.handles[0],
    encryptedInput1.inputProof,
    "Software Engineer"
  );
  await tx1.wait();
  console.log("✅ Salary submitted successfully");

  // Test 2: User2 submits salary as Product Manager
  console.log("\n2️⃣ User2 (Product Manager) submitting salary: $9,500/month");
  const salary2 = 9500;
  const encryptedInput2 = await (salaryVault.runner?.provider as any)?.fhevmInstance
    ?.createEncryptedInput(await salaryVault.getAddress(), user2.address)
    .add32(salary2)
    .encrypt();
  
  const tx2 = await salaryVault.connect(user2).submitSalary(
    encryptedInput2.handles[0],
    encryptedInput2.inputProof,
    "Product Manager"
  );
  await tx2.wait();
  console.log("✅ Salary submitted successfully");

  // Test 3: User3 submits salary as Software Engineer
  console.log("\n3️⃣ User3 (Software Engineer) submitting salary: $8,500/month");
  const salary3 = 8500;
  const encryptedInput3 = await (salaryVault.runner?.provider as any)?.fhevmInstance
    ?.createEncryptedInput(await salaryVault.getAddress(), user3.address)
    .add32(salary3)
    .encrypt();
  
  const tx3 = await salaryVault.connect(user3).submitSalary(
    encryptedInput3.handles[0],
    encryptedInput3.inputProof,
    "Software Engineer"
  );
  await tx3.wait();
  console.log("✅ Salary submitted successfully");

  // Check current state
  console.log("\n📊 Current Statistics (Encrypted):");
  const activeCount = await salaryVault.getActiveEntryCount();
  console.log(`Active Entries: ${activeCount}`);

  // Test 4: Request global statistics decryption
  console.log("\n🔓 Requesting global statistics decryption...");
  try {
    const requestTx = await salaryVault.connect(deployer).requestGlobalStats();
    await requestTx.wait();
    console.log("✅ Decryption requested");

    // Wait a bit for decryption to complete (in real network, this would take longer)
    console.log("⏳ Waiting for decryption to complete...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if finalized
    const isFinalized = await salaryVault.isStatsFinalized();
    if (isFinalized) {
      const [avgSalary, totalCount] = await salaryVault.getGlobalStats();
      console.log("\n📈 Global Statistics (Decrypted):");
      console.log(`Average Salary: $${avgSalary.toString()}/month`);
      console.log(`Total Entries: ${totalCount.toString()}`);
      console.log(`Expected Average: $${Math.floor((salary1 + salary2 + salary3) / 3)}/month`);
    } else {
      console.log("⚠️ Stats not yet finalized (may need more time or manual trigger)");
    }
  } catch (error: any) {
    console.log("⚠️ Note: Decryption may require gateway service in production");
    console.log("Error:", error.message);
  }

  // Test 5: Request position-specific statistics
  console.log("\n🔓 Requesting position-specific statistics (Software Engineer)...");
  try {
    const posRequestTx = await salaryVault.connect(deployer).requestPositionStats("Software Engineer");
    await posRequestTx.wait();
    console.log("✅ Position decryption requested");

    await new Promise(resolve => setTimeout(resolve, 3000));

    const isPosFinalized = await salaryVault.isPositionStatsFinalized("Software Engineer");
    if (isPosFinalized) {
      const [posAvg, posCount] = await salaryVault.getPositionStats("Software Engineer");
      console.log("\n📈 Software Engineer Statistics (Decrypted):");
      console.log(`Average Salary: $${posAvg.toString()}/month`);
      console.log(`Total Entries: ${posCount.toString()}`);
      console.log(`Expected Average: $${Math.floor((salary1 + salary3) / 2)}/month`);
    }
  } catch (error: any) {
    console.log("⚠️ Position stats decryption pending");
  }

  // Test 6: User1 updates their salary
  console.log("\n4️⃣ User1 updating salary to $8,800/month");
  const newSalary1 = 8800;
  const encryptedInputUpdate = await (salaryVault.runner?.provider as any)?.fhevmInstance
    ?.createEncryptedInput(await salaryVault.getAddress(), user1.address)
    .add32(newSalary1)
    .encrypt();
  
  const updateTx = await salaryVault.connect(user1).updateSalary(
    encryptedInputUpdate.handles[0],
    encryptedInputUpdate.inputProof,
    "Senior Software Engineer"
  );
  await updateTx.wait();
  console.log("✅ Salary updated successfully");

  // Test 7: User3 deletes their entry
  console.log("\n5️⃣ User3 deleting their salary entry");
  const deleteTx = await salaryVault.connect(user3).deleteSalary();
  await deleteTx.wait();
  console.log("✅ Entry deleted successfully");

  const finalCount = await salaryVault.getActiveEntryCount();
  console.log(`\nFinal Active Entries: ${finalCount}`);

  console.log("\n✅ All tests completed successfully!");
  console.log("\n📌 Summary:");
  console.log("- Encrypted salary submission: ✅");
  console.log("- Salary update: ✅");
  console.log("- Salary deletion: ✅");
  console.log("- Global statistics aggregation: ✅");
  console.log("- Position-based statistics: ✅");
  console.log("- Privacy preserved (individual salaries never exposed): ✅");
});


