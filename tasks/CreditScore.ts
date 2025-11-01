import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { createInstance, SepoliaConfig, initSDK } from "@zama-fhe/relayer-sdk/bundle";

task("test-credit-score", "Test CreditScore contract functionality")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, deployments } = hre;
    
    // Get deployed contract
    const CreditScoreDeployment = await deployments.get("CreditScore");
    const creditScore = await ethers.getContractAt("CreditScore", CreditScoreDeployment.address);
    
    console.log("CreditScore contract address:", CreditScoreDeployment.address);
    
    // Get signers
    const [owner, user1, user2] = await ethers.getSigners();
    console.log("\n📝 Test accounts:");
    console.log("Owner:", owner.address);
    console.log("User1:", user1.address);
    console.log("User2:", user2.address);
    
    // Initialize FHEVM
    console.log("\n🔐 Initializing FHEVM...");
    await initSDK();
    
    // Get network info
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    
    let fhevm: any;
    if (chainId === 31337) {
      // Localhost - use mock FHEVM
      console.log("Using localhost mock FHEVM");
      const MockFhevmInstance = (await import("@fhevm/mock-utils")).MockFhevmInstance;
      fhevm = await MockFhevmInstance.create(ethers.provider, ethers.provider);
    } else {
      // Sepolia or other networks
      console.log("Using relayer SDK FHEVM");
      fhevm = await createInstance(SepoliaConfig);
    }
    
    console.log("✅ FHEVM initialized");
    
    // Test 1: Create credit profile for user1
    console.log("\n📊 Test 1: Creating credit profile for user1...");
    
    const income = 6000;
    const repaymentRate = 92;
    const debtRatio = 25;
    const creditHistory = 36;
    
    console.log("Financial metrics:");
    console.log("- Income:", income);
    console.log("- Repayment Rate:", repaymentRate, "%");
    console.log("- Debt Ratio:", debtRatio, "%");
    console.log("- Credit History:", creditHistory, "months");
    
    // Encrypt metrics
    const encryptedIncome = await fhevm
      .createEncryptedInput(CreditScoreDeployment.address, user1.address)
      .add32(income)
      .encrypt();
    
    const encryptedRepayment = await fhevm
      .createEncryptedInput(CreditScoreDeployment.address, user1.address)
      .add32(repaymentRate)
      .encrypt();
    
    const encryptedDebt = await fhevm
      .createEncryptedInput(CreditScoreDeployment.address, user1.address)
      .add32(debtRatio)
      .encrypt();
    
    const encryptedHistory = await fhevm
      .createEncryptedInput(CreditScoreDeployment.address, user1.address)
      .add32(creditHistory)
      .encrypt();
    
    // Create profile
    const tx1 = await creditScore.connect(user1).createProfile(
      encryptedIncome.handles[0],
      encryptedIncome.inputProof,
      encryptedRepayment.handles[0],
      encryptedRepayment.inputProof,
      encryptedDebt.handles[0],
      encryptedDebt.inputProof,
      encryptedHistory.handles[0],
      encryptedHistory.inputProof
    );
    
    await tx1.wait();
    console.log("✅ Profile created for user1");
    
    // Check profile exists
    const hasProfile1 = await creditScore.hasProfile(user1.address);
    console.log("Has profile:", hasProfile1);
    
    const profile1 = await creditScore.getProfile(user1.address);
    console.log("Profile active:", profile1.isActive);
    console.log("Score calculated:", profile1.scoreCalculated);
    
    // Test 2: Calculate credit score
    console.log("\n🔢 Test 2: Calculating credit score...");
    
    const tx2 = await creditScore.connect(user1).calculateScore();
    await tx2.wait();
    console.log("✅ Score calculated");
    
    const profile1Updated = await creditScore.getProfile(user1.address);
    console.log("Score calculated:", profile1Updated.scoreCalculated);
    
    // Test 3: Request score decryption
    console.log("\n🔓 Test 3: Requesting score decryption...");
    
    const tx3 = await creditScore.connect(user1).requestScoreDecryption();
    await tx3.wait();
    console.log("✅ Decryption requested");
    console.log("⏳ Waiting for decryption to complete (15-30 seconds)...");
    
    // Wait for decryption
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Check if score is finalized
    const isFinalized = await creditScore.isScoreFinalized(user1.address);
    console.log("Score finalized:", isFinalized);
    
    if (isFinalized) {
      const decryptedScore = await creditScore.getDecryptedScore(user1.address);
      console.log("📊 Decrypted Score:", decryptedScore.toString(), "/ 1000");
      
      // Calculate rating
      let rating = "Poor";
      if (decryptedScore >= 800) rating = "Excellent";
      else if (decryptedScore >= 700) rating = "Very Good";
      else if (decryptedScore >= 600) rating = "Good";
      else if (decryptedScore >= 500) rating = "Fair";
      
      console.log("Rating:", rating);
    } else {
      console.log("⚠️ Score not yet finalized. Try checking again in a few moments.");
    }
    
    // Test 4: Check score weights
    console.log("\n⚖️ Test 4: Checking score weights...");
    const weights = await creditScore.getScoreWeights();
    console.log("Income weight:", weights.incomeWeight.toString(), "%");
    console.log("Repayment weight:", weights.repaymentWeight.toString(), "%");
    console.log("Debt weight:", weights.debtWeight.toString(), "%");
    console.log("History weight:", weights.historyWeight.toString(), "%");
    
    // Test 5: Get active profile count
    console.log("\n👥 Test 5: Checking active profile count...");
    const activeCount = await creditScore.getActiveProfileCount();
    console.log("Active profiles:", activeCount.toString());
    
    console.log("\n✅ All tests completed!");
  });

export default {};
