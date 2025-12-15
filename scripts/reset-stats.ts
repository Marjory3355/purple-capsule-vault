import { ethers } from "hardhat";

/**
 * Reset decrypted stats for re-testing (localhost only)
 *
 * Usage: npx hardhat run scripts/reset-stats.ts --network localhost
 */
async function main() {
  // Get deployed SalaryVault contract
  let salaryVaultAddress: string;
  try {
    const deployment = await import("../deployments/localhost/SalaryVault.json");
    salaryVaultAddress = deployment.address;
  } catch {
    salaryVaultAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  }

  const salaryVault = await ethers.getContractAt("SalaryVault", salaryVaultAddress);

  console.log("Resetting global stats...");

  const tx = await salaryVault.resetGlobalStats();
  await tx.wait();

  console.log("✅ Global stats reset! You can now test decryption again.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
