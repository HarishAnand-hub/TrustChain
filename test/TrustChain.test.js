const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TrustChainAudit", function () {
  let trustchain;
  let owner;
  let hospital;
  let auditor;

  const MODEL_ID = "diabetes-xgboost-v1";
  const MODEL_NAME = "DiabetesDetector-XGBoost";
  const VERSION = "1.0.0";

  beforeEach(async function () {
    [owner, hospital, auditor] = await ethers.getSigners();
    const TrustChain = await ethers.getContractFactory("TrustChainAudit");
    trustchain = await TrustChain.deploy();
    await trustchain.waitForDeployment();
  });

  describe("registerModel", function () {
    it("Should register a new AI model", async function () {
      await trustchain.registerModel(MODEL_ID, MODEL_NAME, VERSION);
      const metadata = await trustchain.getModelMetadata(MODEL_ID);
      expect(metadata.modelID).to.equal(MODEL_ID);
      expect(metadata.modelName).to.equal(MODEL_NAME);
      expect(metadata.version).to.equal(VERSION);
      expect(metadata.isActive).to.equal(true);
    });

    it("Should emit ModelRegistered event", async function () {
      const tx = await trustchain.registerModel(MODEL_ID, MODEL_NAME, VERSION);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try { return trustchain.interface.parseLog(log).name === "ModelRegistered"; } catch { return false; }
      });
      expect(event).to.not.be.undefined;
    });

    it("Should fail if model already registered", async function () {
      await trustchain.registerModel(MODEL_ID, MODEL_NAME, VERSION);
      await expect(
        trustchain.registerModel(MODEL_ID, MODEL_NAME, VERSION)
      ).to.be.revertedWith("TrustChain: Model already registered");
    });

    it("Should fail if not owner", async function () {
      await expect(
        trustchain.connect(hospital).registerModel(MODEL_ID, MODEL_NAME, VERSION)
      ).to.be.revertedWith("TrustChain: Caller is not the owner");
    });
  });

  describe("grantAccess and revokeAccess", function () {
    beforeEach(async function () {
      await trustchain.registerModel(MODEL_ID, MODEL_NAME, VERSION);
    });

    it("Should grant access to hospital", async function () {
      await trustchain.grantAccess(MODEL_ID, hospital.address);
      const hasAccess = await trustchain.hasAccess(hospital.address, MODEL_ID);
      expect(hasAccess).to.equal(true);
    });

    it("Should revoke access from hospital", async function () {
      await trustchain.grantAccess(MODEL_ID, hospital.address);
      await trustchain.revokeAccess(MODEL_ID, hospital.address);
      const hasAccess = await trustchain.hasAccess(hospital.address, MODEL_ID);
      expect(hasAccess).to.equal(false);
    });

    it("Should emit AccessRevoked event", async function () {
      await trustchain.grantAccess(MODEL_ID, hospital.address);
      await expect(trustchain.revokeAccess(MODEL_ID, hospital.address))
        .to.emit(trustchain, "AccessRevoked");
    });

    it("Should fail grantAccess if not owner", async function () {
      await expect(
        trustchain.connect(hospital).grantAccess(MODEL_ID, auditor.address)
      ).to.be.revertedWith("TrustChain: Caller is not the owner");
    });
  });

  describe("logPrediction", function () {
    beforeEach(async function () {
      await trustchain.registerModel(MODEL_ID, MODEL_NAME, VERSION);
    });

    it("Should log a prediction as owner", async function () {
      const inputHash = ethers.keccak256(ethers.toUtf8Bytes("patient_data_1"));
      const outputHash = ethers.keccak256(ethers.toUtf8Bytes("diabetes_positive"));
      await trustchain.logPrediction(MODEL_ID, inputHash, outputHash, 87);
      const trail = await trustchain.queryAuditTrail(MODEL_ID);
      expect(trail.length).to.equal(1);
      expect(trail[0].eventType).to.equal("PREDICTION");
    });

    it("Should log prediction as authorized hospital", async function () {
      await trustchain.grantAccess(MODEL_ID, hospital.address);
      const inputHash = ethers.keccak256(ethers.toUtf8Bytes("patient_data_2"));
      const outputHash = ethers.keccak256(ethers.toUtf8Bytes("no_diabetes"));
      await trustchain.connect(hospital).logPrediction(MODEL_ID, inputHash, outputHash, 99);
      const trail = await trustchain.queryAuditTrail(MODEL_ID);
      expect(trail.length).to.equal(1);
    });

    it("Should fail if confidence > 100", async function () {
      const inputHash = ethers.keccak256(ethers.toUtf8Bytes("data"));
      const outputHash = ethers.keccak256(ethers.toUtf8Bytes("result"));
      await expect(
        trustchain.logPrediction(MODEL_ID, inputHash, outputHash, 101)
      ).to.be.revertedWith("TrustChain: Confidence must be 0-100");
    });

    it("Should fail if unauthorized actor", async function () {
      const inputHash = ethers.keccak256(ethers.toUtf8Bytes("data"));
      const outputHash = ethers.keccak256(ethers.toUtf8Bytes("result"));
      await expect(
        trustchain.connect(auditor).logPrediction(MODEL_ID, inputHash, outputHash, 75)
      ).to.be.revertedWith("TrustChain: Caller is not authorized for this model");
    });

    it("Should fail if model does not exist", async function () {
      const inputHash = ethers.keccak256(ethers.toUtf8Bytes("data"));
      const outputHash = ethers.keccak256(ethers.toUtf8Bytes("result"));
      await expect(
        trustchain.logPrediction("nonexistent-model", inputHash, outputHash, 75)
      ).to.be.revertedWith("TrustChain: Model does not exist");
    });

    it("Should emit AuditLogged event", async function () {
      const inputHash = ethers.keccak256(ethers.toUtf8Bytes("data"));
      const outputHash = ethers.keccak256(ethers.toUtf8Bytes("result"));
      await expect(
        trustchain.logPrediction(MODEL_ID, inputHash, outputHash, 80)
      ).to.emit(trustchain, "AuditLogged");
    });
  });

  describe("logModelEvent", function () {
    beforeEach(async function () {
      await trustchain.registerModel(MODEL_ID, MODEL_NAME, VERSION);
    });

    it("Should log a training event", async function () {
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes("training_data"));
      await trustchain.logModelEvent(MODEL_ID, "TRAINING_START", dataHash);
      const trail = await trustchain.queryAuditTrail(MODEL_ID);
      expect(trail.length).to.equal(1);
      expect(trail[0].eventType).to.equal("TRAINING_START");
    });
  });

  describe("logModelUpdate", function () {
    beforeEach(async function () {
      await trustchain.registerModel(MODEL_ID, MODEL_NAME, VERSION);
    });

    it("Should update model version", async function () {
      await trustchain.logModelUpdate(MODEL_ID, "2.0.0");
      const metadata = await trustchain.getModelMetadata(MODEL_ID);
      expect(metadata.version).to.equal("2.0.0");
    });

    it("Should emit ModelUpdated event", async function () {
      const tx = await trustchain.logModelUpdate(MODEL_ID, "2.0.0");
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try { return trustchain.interface.parseLog(log).name === "ModelUpdated"; } catch { return false; }
      });
      expect(event).to.not.be.undefined;
    });
  });

  describe("queryAuditTrail", function () {
    beforeEach(async function () {
      await trustchain.registerModel(MODEL_ID, MODEL_NAME, VERSION);
    });

    it("Should return full audit trail", async function () {
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes("patient1"));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("result1"));
      const hash3 = ethers.keccak256(ethers.toUtf8Bytes("patient2"));
      const hash4 = ethers.keccak256(ethers.toUtf8Bytes("result2"));
      await trustchain.logPrediction(MODEL_ID, hash1, hash2, 87);
      await trustchain.logPrediction(MODEL_ID, hash3, hash4, 99);
      await trustchain.logModelUpdate(MODEL_ID, "1.1.0");
      const trail = await trustchain.queryAuditTrail(MODEL_ID);
      expect(trail.length).to.equal(3);
    });

    it("Should return empty trail for new model", async function () {
      const trail = await trustchain.queryAuditTrail(MODEL_ID);
      expect(trail.length).to.equal(0);
    });
  });

  describe("getTotalEventCount", function () {
    it("Should track total events across all models", async function () {
      await trustchain.registerModel(MODEL_ID, MODEL_NAME, VERSION);
      await trustchain.registerModel("model-2", "Model2", "1.0.0");
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes("data1"));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("result1"));
      await trustchain.logPrediction(MODEL_ID, hash1, hash2, 75);
      await trustchain.logPrediction("model-2", hash1, hash2, 60);
      const count = await trustchain.getTotalEventCount();
      expect(count).to.equal(2);
    });
  });
});
