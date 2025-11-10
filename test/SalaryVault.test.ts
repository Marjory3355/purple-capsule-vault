import { expect } from "chai";
import { ethers, deployments } from "hardhat";
import type { SalaryVault } from "../types";
import type { Signer } from "ethers";

describe("SalaryVault", function () {
  let salaryVault: SalaryVault;
  let deployer: Signer;
  let user1: Signer;
  let user2: Signer;
  let user3: Signer;
  let deployerAddress: string;
  let user1Address: string;
  let user2Address: string;
  let user3Address: string;

  beforeEach(async function () {
    await deployments.fixture(["SalaryVault"]);
    [deployer, user1, user2, user3] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();
    user3Address = await user3.getAddress();

    const salaryVaultDeployment = await deployments.get("SalaryVault");
    salaryVault = (await ethers.getContractAt("SalaryVault", salaryVaultDeployment.address)) as unknown as SalaryVault;
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await salaryVault.getAddress()).to.be.properAddress;
    });

    it("Should start with zero entries", async function () {
      expect(await salaryVault.getEntryCount()).to.equal(0);
      expect(await salaryVault.getActiveEntryCount()).to.equal(0);
    });
  });

  describe("Salary Submission", function () {
    it("Should allow user to submit salary", async function () {
      const fhevmInstance = (salaryVault.runner?.provider as any)?.fhevmInstance;
      if (!fhevmInstance) {
        this.skip();
        return;
      }

      const salary = 8000;
      const encryptedInput = await fhevmInstance
        .createEncryptedInput(await salaryVault.getAddress(), user1Address)
        .add32(salary)
        .encrypt();

      await expect(
        salaryVault.connect(user1).submitSalary(
          encryptedInput.handles[0],
          encryptedInput.inputProof,
          "Software Engineer"
        )
      ).to.emit(salaryVault, "SalarySubmitted");

      expect(await salaryVault.hasSubmitted(user1Address)).to.be.true;
      expect(await salaryVault.getActiveEntryCount()).to.equal(1);
    });

    it("Should reject empty position", async function () {
      const fhevmInstance = (salaryVault.runner?.provider as any)?.fhevmInstance;
      if (!fhevmInstance) {
        this.skip();
        return;
      }

      const salary = 8000;
      const encryptedInput = await fhevmInstance
        .createEncryptedInput(await salaryVault.getAddress(), user1Address)
        .add32(salary)
        .encrypt();

      await expect(
        salaryVault.connect(user1).submitSalary(
          encryptedInput.handles[0],
          encryptedInput.inputProof,
          ""
        )
      ).to.be.revertedWith("Position cannot be empty");
    });

    it("Should reject duplicate submission", async function () {
      const fhevmInstance = (salaryVault.runner?.provider as any)?.fhevmInstance;
      if (!fhevmInstance) {
        this.skip();
        return;
      }

      const salary = 8000;
      const encryptedInput1 = await fhevmInstance
        .createEncryptedInput(await salaryVault.getAddress(), user1Address)
        .add32(salary)
        .encrypt();

      await salaryVault.connect(user1).submitSalary(
        encryptedInput1.handles[0],
        encryptedInput1.inputProof,
        "Software Engineer"
      );

      const encryptedInput2 = await fhevmInstance
        .createEncryptedInput(await salaryVault.getAddress(), user1Address)
        .add32(salary)
        .encrypt();

      await expect(
        salaryVault.connect(user1).submitSalary(
          encryptedInput2.handles[0],
          encryptedInput2.inputProof,
          "Product Manager"
        )
      ).to.be.revertedWith("Already submitted. Use updateSalary instead");
    });
  });

  describe("Salary Updates", function () {
    it("Should allow user to update their salary", async function () {
      const fhevmInstance = (salaryVault.runner?.provider as any)?.fhevmInstance;
      if (!fhevmInstance) {
        this.skip();
        return;
      }

      // Submit initial salary
      const salary1 = 8000;
      const encryptedInput1 = await fhevmInstance
        .createEncryptedInput(await salaryVault.getAddress(), user1Address)
        .add32(salary1)
        .encrypt();

      await salaryVault.connect(user1).submitSalary(
        encryptedInput1.handles[0],
        encryptedInput1.inputProof,
        "Software Engineer"
      );

      // Update salary
      const salary2 = 8500;
      const encryptedInput2 = await fhevmInstance
        .createEncryptedInput(await salaryVault.getAddress(), user1Address)
        .add32(salary2)
        .encrypt();

      await expect(
        salaryVault.connect(user1).updateSalary(
          encryptedInput2.handles[0],
          encryptedInput2.inputProof,
          "Senior Software Engineer"
        )
      ).to.emit(salaryVault, "SalaryUpdated");

      const entryId = await salaryVault.userEntryId(user1Address);
      const entry = await salaryVault.getEntry(entryId);
      expect(entry.position).to.equal("Senior Software Engineer");
    });

    it("Should reject update without prior submission", async function () {
      const fhevmInstance = (salaryVault.runner?.provider as any)?.fhevmInstance;
      if (!fhevmInstance) {
        this.skip();
        return;
      }

      const salary = 8000;
      const encryptedInput = await fhevmInstance
        .createEncryptedInput(await salaryVault.getAddress(), user1Address)
        .add32(salary)
        .encrypt();

      await expect(
        salaryVault.connect(user1).updateSalary(
          encryptedInput.handles[0],
          encryptedInput.inputProof,
          "Software Engineer"
        )
      ).to.be.revertedWith("No entry to update");
    });
  });

  describe("Salary Deletion", function () {
    it("Should allow user to delete their entry", async function () {
      const fhevmInstance = (salaryVault.runner?.provider as any)?.fhevmInstance;
      if (!fhevmInstance) {
        this.skip();
        return;
      }

      // Submit salary
      const salary = 8000;
      const encryptedInput = await fhevmInstance
        .createEncryptedInput(await salaryVault.getAddress(), user1Address)
        .add32(salary)
        .encrypt();

      await salaryVault.connect(user1).submitSalary(
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        "Software Engineer"
      );

      // Delete entry
      await expect(salaryVault.connect(user1).deleteSalary()).to.emit(salaryVault, "SalaryDeleted");

      expect(await salaryVault.hasSubmitted(user1Address)).to.be.false;
      expect(await salaryVault.getActiveEntryCount()).to.equal(0);
    });

    it("Should reject deletion without prior submission", async function () {
      await expect(salaryVault.connect(user1).deleteSalary()).to.be.revertedWith("No entry to delete");
    });
  });

  describe("Statistics", function () {
    it("Should track active entry count", async function () {
      const fhevmInstance = (salaryVault.runner?.provider as any)?.fhevmInstance;
      if (!fhevmInstance) {
        this.skip();
        return;
      }

      expect(await salaryVault.getActiveEntryCount()).to.equal(0);

      // User1 submits
      const encryptedInput1 = await fhevmInstance
        .createEncryptedInput(await salaryVault.getAddress(), user1Address)
        .add32(8000)
        .encrypt();
      await salaryVault.connect(user1).submitSalary(
        encryptedInput1.handles[0],
        encryptedInput1.inputProof,
        "Software Engineer"
      );
      expect(await salaryVault.getActiveEntryCount()).to.equal(1);

      // User2 submits
      const encryptedInput2 = await fhevmInstance
        .createEncryptedInput(await salaryVault.getAddress(), user2Address)
        .add32(9000)
        .encrypt();
      await salaryVault.connect(user2).submitSalary(
        encryptedInput2.handles[0],
        encryptedInput2.inputProof,
        "Product Manager"
      );
      expect(await salaryVault.getActiveEntryCount()).to.equal(2);

      // User1 deletes
      await salaryVault.connect(user1).deleteSalary();
      expect(await salaryVault.getActiveEntryCount()).to.equal(1);
    });

    it("Should return encrypted statistics", async function () {
      const fhevmInstance = (salaryVault.runner?.provider as any)?.fhevmInstance;
      if (!fhevmInstance) {
        this.skip();
        return;
      }

      const encryptedInput = await fhevmInstance
        .createEncryptedInput(await salaryVault.getAddress(), user1Address)
        .add32(8000)
        .encrypt();
      await salaryVault.connect(user1).submitSalary(
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        "Software Engineer"
      );

      const [encryptedTotal, count] = await salaryVault.getEncryptedStats();
      expect(count).to.equal(1);
      // encryptedTotal should be an encrypted value (not directly comparable)
    });
  });

  describe("Entry Information", function () {
    it("Should return entry details", async function () {
      const fhevmInstance = (salaryVault.runner?.provider as any)?.fhevmInstance;
      if (!fhevmInstance) {
        this.skip();
        return;
      }

      const encryptedInput = await fhevmInstance
        .createEncryptedInput(await salaryVault.getAddress(), user1Address)
        .add32(8000)
        .encrypt();
      await salaryVault.connect(user1).submitSalary(
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        "Software Engineer"
      );

      const entryId = await salaryVault.userEntryId(user1Address);
      const entry = await salaryVault.getEntry(entryId);

      expect(entry.position).to.equal("Software Engineer");
      expect(entry.submitter).to.equal(user1Address);
      expect(entry.isActive).to.be.true;
    });
  });
});



    // Additional test cases for edge scenarios

