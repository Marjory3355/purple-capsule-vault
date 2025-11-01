import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🚀 Starting deployment...");
  console.log(`Deploying from account: ${deployer}`);
  console.log(`Network: ${hre.network.name}\n`);

  // Deploy SalaryVault
  console.log("📝 Deploying SalaryVault...");
  const salaryVault = await deploy("SalaryVault", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: hre.network.name === "sepolia" ? 6 : 1,
  });
  console.log(`✅ SalaryVault deployed at: ${salaryVault.address}\n`);

  // Deploy CreditScore
  console.log("📝 Deploying CreditScore...");
  const creditScore = await deploy("CreditScore", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: hre.network.name === "sepolia" ? 6 : 1,
  });
  console.log(`✅ CreditScore deployed at: ${creditScore.address}\n`);

  // Display deployment summary
  console.log("📋 Deployment Summary:");
  console.log("─────────────────────────────────────────────────");
  console.log(`SalaryVault:  ${salaryVault.address}`);
  console.log(`CreditScore:  ${creditScore.address}`);
  console.log("─────────────────────────────────────────────────");
  
  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    console.log("\n📝 Update frontend addresses:");
    console.log(`ui/src/abi/SalaryVaultAddresses.ts -> localhost: "${salaryVault.address}"`);
    console.log(`ui/src/abi/CreditScoreAddresses.ts -> localhost: "${creditScore.address}"`);
  } else if (hre.network.name === "sepolia") {
    console.log("\n📝 Update frontend addresses:");
    console.log(`ui/src/abi/SalaryVaultAddresses.ts -> sepolia: "${salaryVault.address}"`);
    console.log(`ui/src/abi/CreditScoreAddresses.ts -> sepolia: "${creditScore.address}"`);
    console.log("\n🔍 Verify contracts on Etherscan:");
    console.log(`npx hardhat verify --network sepolia ${salaryVault.address}`);
    console.log(`npx hardhat verify --network sepolia ${creditScore.address}`);
  }
  
  console.log("\n✅ Deployment completed successfully!\n");
};

export default func;
func.id = "deploy_all_contracts";
func.tags = ["SalaryVault", "CreditScore", "all"];
