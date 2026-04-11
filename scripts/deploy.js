// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  console.log("Deploying TrustChain contract to Sepolia...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy contract
  const TrustChain = await hre.ethers.getContractFactory("TrustChainAudit");
  const trustchain = await TrustChain.deploy();
  await trustchain.waitForDeployment();

  const address = await trustchain.getAddress();
  console.log("TrustChainAudit deployed to:", address);

  // Register the AI model immediately after deployment
  console.log("\nRegistering AI model on blockchain...");
  const tx = await trustchain.registerModel(
    "diabetes-xgboost-v1",
    "DiabetesDetector-XGBoost",
    "1.0.0"
  );
  await tx.wait();
  console.log("Model 'diabetes-xgboost-v1' registered!");

  console.log("\n=== SAVE THIS CONTRACT ADDRESS ===");
  console.log("Contract:", address);
  console.log("Etherscan: https://sepolia.etherscan.io/address/" + address);
  console.log("==================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
