import { expect } from "chai";
import { ethers, deployments } from "hardhat";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import type { CreditScore } from "../types";
import { createInstance, initSDK } from "@zama-fhe/relayer-sdk/bundle";

describe("CreditScore", function () {
  let creditScore: CreditScore;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let fhevm: any;
  
  before(async function () {
    // Initialize FHEVM SDK
    await initSDK();
    
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();
    
    // Setup FHEVM instance
    const MockFhevmInstance = (await import("@fhevm/mock-utils")).MockFhevmInstance;
    fhevm = await MockFhevmInstance.create(ethers.provider, ethers.provider);
  });
  
  beforeEach(async function () {
    // Deploy contract
    await deployments.fixture(["CreditScore"]);
    const CreditScoreDeployment = await deployments.get("CreditScore");
    creditScore = await ethers.getContractAt("CreditScore", CreditScoreDeployment.address);
  });
  
  describe("Profile Creation", function () {
    it("Should create a credit profile successfully", async function () {
      // Prepare encrypted metrics
      const income = 5000;
      const repaymentRate = 90;
      const debtRatio = 30;
      const creditHistory = 24;
      
      const encryptedIncome = await fhevm
        .createEncryptedInput(await creditScore.getAddress(), user1.address)
        .add32(income)
        .encrypt();
      
      const encryptedRepayment = await fhevm
        .createEncryptedInput(await creditScore.getAddress(), user1.address)
        .add32(repaymentRate)
        .encrypt();
      
      const encryptedDebt = await fhevm
        .createEncryptedInput(await creditScore.getAddress(), user1.address)
        .add32(debtRatio)
        .encrypt();
      
      const encryptedHistory = await fhevm
        .createEncryptedInput(await creditScore.getAddress(), user1.address)
        .add32(creditHistory)
        .encrypt();
      
      // Create profile
      await expect(
        creditScore.connect(user1).createProfile(
          encryptedIncome.handles[0],
          encryptedIncome.inputProof,
          encryptedRepayment.handles[0],
          encryptedRepayment.inputProof,
          encryptedDebt.handles[0],
          encryptedDebt.inputProof,
          encryptedHistory.handles[0],
          encryptedHistory.inputProof
        )
      ).to.emit(creditScore, "ProfileCreated");
      
      // Verify profile exists
      expect(await creditScore.hasProfile(user1.address)).to.be.true;
      
      const profile = await creditScore.getProfile(user1.address);
      expect(profile.isActive).to.be.true;
      expect(profile.scoreCalculated).to.be.false;
    });
    
    it("Should not allow creating duplicate profiles", async function () {
      // Create first profile
      const encryptedData = await fhevm
        .createEncryptedInput(await creditScore.getAddress(), user1.address)
        .add32(5000)
        .encrypt();
      
      await creditScore.connect(user1).createProfile(
        encryptedData.handles[0],
        encryptedData.inputProof,
        encryptedData.handles[0],
        encryptedData.inputProof,
        encryptedData.handles[0],
        encryptedData.inputProof,
        encryptedData.handles[0],
        encryptedData.inputProof
      );
      
      // Try to create duplicate
      await expect(
        creditScore.connect(user1).createProfile(
          encryptedData.handles[0],
          encryptedData.inputProof,
          encryptedData.handles[0],
          encryptedData.inputProof,
          encryptedData.handles[0],
          encryptedData.inputProof,
          encryptedData.handles[0],
          encryptedData.inputProof
        )
      ).to.be.revertedWith("Profile already exists");
    });
  });
  
  describe("Score Calculation", function () {
    beforeEach(async function () {
      // Create a profile first
      const encryptedData = await fhevm
        .createEncryptedInput(await creditScore.getAddress(), user1.address)
        .add32(5000)
        .encrypt();
      
      await creditScore.connect(user1).createProfile(
        encryptedData.handles[0],
        encryptedData.inputProof,
        encryptedData.handles[0],
        encryptedData.inputProof,
        encryptedData.handles[0],
        encryptedData.inputProof,
        encryptedData.handles[0],
        encryptedData.inputProof
      );
    });
    
    it("Should calculate credit score successfully", async function () {
      await expect(creditScore.connect(user1).calculateScore())
        .to.emit(creditScore, "ScoreCalculated");
      
      const profile = await creditScore.getProfile(user1.address);
      expect(profile.scoreCalculated).to.be.true;
    });
    
    it("Should not allow calculating score twice", async function () {
      await creditScore.connect(user1).calculateScore();
      
      await expect(creditScore.connect(user1).calculateScore())
        .to.be.revertedWith("Score already calculated");
    });
    
    it("Should not allow non-profile owners to calculate score", async function () {
      await expect(creditScore.connect(user2).calculateScore())
        .to.be.revertedWith("No active profile found");
    });
  });
  
  describe("Profile Management", function () {
    beforeEach(async function () {
      // Create a profile
      const encryptedData = await fhevm
        .createEncryptedInput(await creditScore.getAddress(), user1.address)
        .add32(5000)
        .encrypt();
      
      await creditScore.connect(user1).createProfile(
        encryptedData.handles[0],
        encryptedData.inputProof,
        encryptedData.handles[0],
        encryptedData.inputProof,
        encryptedData.handles[0],
        encryptedData.inputProof,
        encryptedData.handles[0],
        encryptedData.inputProof
      );
    });
    
    it("Should update profile successfully", async function () {
      const newEncryptedData = await fhevm
        .createEncryptedInput(await creditScore.getAddress(), user1.address)
        .add32(6000)
        .encrypt();
      
      await expect(
        creditScore.connect(user1).updateProfile(
          newEncryptedData.handles[0],
          newEncryptedData.inputProof,
          newEncryptedData.handles[0],
          newEncryptedData.inputProof,
          newEncryptedData.handles[0],
          newEncryptedData.inputProof,
          newEncryptedData.handles[0],
          newEncryptedData.inputProof
        )
      ).to.emit(creditScore, "ProfileUpdated");
    });
    
    it("Should delete profile successfully", async function () {
      const activeCountBefore = await creditScore.getActiveProfileCount();
      
      await expect(creditScore.connect(user1).deleteProfile())
        .to.emit(creditScore, "ProfileDeleted");
      
      expect(await creditScore.hasProfile(user1.address)).to.be.false;
      
      const activeCountAfter = await creditScore.getActiveProfileCount();
      expect(activeCountAfter).to.equal(activeCountBefore - 1n);
    });
  });
  
  describe("Score Weights", function () {
    it("Should return correct score weights", async function () {
      const weights = await creditScore.getScoreWeights();
      
      expect(weights.incomeWeight).to.equal(25);
      expect(weights.repaymentWeight).to.equal(35);
      expect(weights.debtWeight).to.equal(25);
      expect(weights.historyWeight).to.equal(15);
      
      // Total should be 100%
      const total = Number(weights.incomeWeight) + 
                   Number(weights.repaymentWeight) + 
                   Number(weights.debtWeight) + 
                   Number(weights.historyWeight);
      expect(total).to.equal(100);
    });
  });
  
  describe("Active Profile Count", function () {
    it("Should track active profile count correctly", async function () {
      const initialCount = await creditScore.getActiveProfileCount();
      
      // Create profile for user1
      const encryptedData1 = await fhevm
        .createEncryptedInput(await creditScore.getAddress(), user1.address)
        .add32(5000)
        .encrypt();
      
      await creditScore.connect(user1).createProfile(
        encryptedData1.handles[0],
        encryptedData1.inputProof,
        encryptedData1.handles[0],
        encryptedData1.inputProof,
        encryptedData1.handles[0],
        encryptedData1.inputProof,
        encryptedData1.handles[0],
        encryptedData1.inputProof
      );
      
      expect(await creditScore.getActiveProfileCount()).to.equal(initialCount + 1n);
      
      // Create profile for user2
      const encryptedData2 = await fhevm
        .createEncryptedInput(await creditScore.getAddress(), user2.address)
        .add32(6000)
        .encrypt();
      
      await creditScore.connect(user2).createProfile(
        encryptedData2.handles[0],
        encryptedData2.inputProof,
        encryptedData2.handles[0],
        encryptedData2.inputProof,
        encryptedData2.handles[0],
        encryptedData2.inputProof,
        encryptedData2.handles[0],
        encryptedData2.inputProof
      );
      
      expect(await creditScore.getActiveProfileCount()).to.equal(initialCount + 2n);
      
      // Delete user1's profile
      await creditScore.connect(user1).deleteProfile();
      
      expect(await creditScore.getActiveProfileCount()).to.equal(initialCount + 1n);
    });
  });
});
