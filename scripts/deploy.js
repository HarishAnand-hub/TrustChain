// scripts/deploy.js
// Deployment script for TrustChainAudit.sol on Sepolia testnet

const hre = require("hardhat");

async function main() {
  console.log("Deploying TrustChain contract to Sepolia...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy contract
  const TrustChain = await hre.ethers.getContractFactory("TrustChainAudit");
  const trustchain = await TrustChain.deploy();

  await trustchain.waitForDeployment();

  const address = await trustchain.getAddress();
  console.log("TrustChainAudit deployed to:", address);
  console.log("View on Etherscan: https://sepolia.etherscan.io/address/" + address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
