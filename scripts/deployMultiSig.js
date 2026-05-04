const hre = require("hardhat");

async function main() {
  console.log("Deploying TrustChainMultiSig to Sepolia...");

  const provider = new hre.ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  const wallet = new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log("Deploying with:", wallet.address);

  const MultiSig = await hre.ethers.getContractFactory("TrustChainMultiSig", wallet);
  const multisig = await MultiSig.deploy();
  await multisig.waitForDeployment();

  const address = await multisig.getAddress();
  console.log("TrustChainMultiSig deployed to:", address);

  console.log("\nSubmitting high-risk request for Michael (95% confidence)...");
  const patientHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("michael-70yr-high-risk"));
  const diagnosisHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("diabetes-positive-95confidence"));
  const tx1 = await multisig.requestApproval("diabetes-xgboost-v1", patientHash, diagnosisHash, 95);
  await tx1.wait();
  console.log("Request 1 submitted!");

  console.log("\nDoctor 1 signing...");
  const tx2 = await multisig.signDiagnosis(1, true, "Confirmed: Classic Type 2 diabetes markers.");
  await tx2.wait();
  console.log("Doctor 1 signed! 1/2 signatures collected.");

  console.log("\n=== SAVE THIS ADDRESS ===");
  console.log("MultiSig Contract:", address);
  console.log("Etherscan:", "https://sepolia.etherscan.io/address/" + address);
  console.log("=========================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
