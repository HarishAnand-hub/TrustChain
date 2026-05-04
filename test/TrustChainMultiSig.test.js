const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TrustChainMultiSig", function () {
  let multisig;
  let owner;
  let doctor1;
  let doctor2;
  let unauthorized;

  const MODEL_ID = "diabetes-xgboost-v1";

  beforeEach(async function () {
    [owner, doctor1, doctor2, unauthorized] = await ethers.getSigners();
    const MultiSig = await ethers.getContractFactory("TrustChainMultiSig");
    multisig = await MultiSig.deploy();
    await multisig.waitForDeployment();
    await multisig.authorizeDoctor(doctor1.address);
    await multisig.authorizeDoctor(doctor2.address);
  });

  describe("Doctor Authorization", function () {
    it("Should authorize a doctor", async function () {
      const isAuth = await multisig.authorizedDoctors(doctor1.address);
      expect(isAuth).to.equal(true);
    });

    it("Should deauthorize a doctor", async function () {
      await multisig.deauthorizeDoctor(doctor1.address);
      const isAuth = await multisig.authorizedDoctors(doctor1.address);
      expect(isAuth).to.equal(false);
    });

    it("Should fail if non-owner authorizes", async function () {
      await expect(
        multisig.connect(unauthorized).authorizeDoctor(unauthorized.address)
      ).to.be.revertedWith("MultiSig: Caller is not the owner");
    });

    it("Owner should be authorized by default", async function () {
      const isAuth = await multisig.authorizedDoctors(owner.address);
      expect(isAuth).to.equal(true);
    });
  });

  describe("requestApproval", function () {
    it("Should create a high-risk approval request", async function () {
      const patientHash = ethers.keccak256(ethers.toUtf8Bytes("patient-1"));
      const diagnosisHash = ethers.keccak256(ethers.toUtf8Bytes("diabetes-positive"));
      await multisig.requestApproval(MODEL_ID, patientHash, diagnosisHash, 95);
      const req = await multisig.getRequest(1);
      expect(req.id).to.equal(1);
      expect(req.confidence).to.equal(95);
      expect(req.isFinalized).to.equal(false);
    });

    it("Should emit ApprovalRequested event", async function () {
      const patientHash = ethers.keccak256(ethers.toUtf8Bytes("patient-1"));
      const diagnosisHash = ethers.keccak256(ethers.toUtf8Bytes("diabetes-positive"));
      await expect(multisig.requestApproval(MODEL_ID, patientHash, diagnosisHash, 95))
        .to.emit(multisig, "ApprovalRequested");
    });

    it("Should fail if confidence < 75", async function () {
      const patientHash = ethers.keccak256(ethers.toUtf8Bytes("patient-1"));
      const diagnosisHash = ethers.keccak256(ethers.toUtf8Bytes("result"));
      await expect(
        multisig.requestApproval(MODEL_ID, patientHash, diagnosisHash, 74)
      ).to.be.revertedWith("MultiSig: Only HIGH RISK diagnoses require multi-sig");
    });

    it("Should fail if confidence > 100", async function () {
      const patientHash = ethers.keccak256(ethers.toUtf8Bytes("patient-1"));
      const diagnosisHash = ethers.keccak256(ethers.toUtf8Bytes("result"));
      await expect(
        multisig.requestApproval(MODEL_ID, patientHash, diagnosisHash, 101)
      ).to.be.revertedWith("MultiSig: Confidence must be 0-100");
    });

    it("Should track patient history", async function () {
      const patientHash = ethers.keccak256(ethers.toUtf8Bytes("patient-1"));
      const diagnosisHash = ethers.keccak256(ethers.toUtf8Bytes("result"));
      await multisig.requestApproval(MODEL_ID, patientHash, diagnosisHash, 95);
      const history = await multisig.getPatientHistory(patientHash);
      expect(history.length).to.equal(1);
    });
  });

  describe("signDiagnosis", function () {
    beforeEach(async function () {
      const patientHash = ethers.keccak256(ethers.toUtf8Bytes("patient-1"));
      const diagnosisHash = ethers.keccak256(ethers.toUtf8Bytes("diabetes-positive"));
      await multisig.requestApproval(MODEL_ID, patientHash, diagnosisHash, 95);
    });

    it("Should allow doctor to sign", async function () {
      await multisig.connect(doctor1).signDiagnosis(1, true, "Confirmed diagnosis");
      const signed = await multisig.hasSigned(1, doctor1.address);
      expect(signed).to.equal(true);
    });

    it("Should emit DiagnosisSigned event", async function () {
      await expect(
        multisig.connect(doctor1).signDiagnosis(1, true, "Confirmed")
      ).to.emit(multisig, "DiagnosisSigned");
    });

    it("Should finalize after 2 signatures", async function () {
      await multisig.connect(doctor1).signDiagnosis(1, true, "Doctor 1 confirms");
      await multisig.connect(doctor2).signDiagnosis(1, true, "Doctor 2 confirms");
      const req = await multisig.getRequest(1);
      expect(req.isFinalized).to.equal(true);
    });

    it("Should emit DiagnosisFinalized after 2 signatures", async function () {
      await multisig.connect(doctor1).signDiagnosis(1, true, "Doctor 1 confirms");
      await expect(
        multisig.connect(doctor2).signDiagnosis(1, true, "Doctor 2 confirms")
      ).to.emit(multisig, "DiagnosisFinalized");
    });

    it("Should reject if doctor votes no", async function () {
      await multisig.connect(doctor1).signDiagnosis(1, false, "Disagree with diagnosis");
      const req = await multisig.getRequest(1);
      expect(req.isRejected).to.equal(true);
    });

    it("Should emit DiagnosisRejected event", async function () {
      await expect(
        multisig.connect(doctor1).signDiagnosis(1, false, "Rejected")
      ).to.emit(multisig, "DiagnosisRejected");
    });

    it("Should fail if unauthorized doctor signs", async function () {
      await expect(
        multisig.connect(unauthorized).signDiagnosis(1, true, "Notes")
      ).to.be.revertedWith("MultiSig: Caller is not an authorized doctor");
    });

    it("Should fail if doctor signs twice", async function () {
      await multisig.connect(doctor1).signDiagnosis(1, true, "First sign");
      await expect(
        multisig.connect(doctor1).signDiagnosis(1, true, "Second sign")
      ).to.be.revertedWith("MultiSig: Doctor has already signed this request");
    });

    it("Should fail if request already finalized", async function () {
      await multisig.connect(doctor1).signDiagnosis(1, true, "Doctor 1");
      await multisig.connect(doctor2).signDiagnosis(1, true, "Doctor 2");
      await expect(
        multisig.connect(owner).signDiagnosis(1, true, "Too late")
      ).to.be.revertedWith("MultiSig: Request already finalized");
    });

    it("Should fail if request does not exist", async function () {
      await expect(
        multisig.connect(doctor1).signDiagnosis(999, true, "Notes")
      ).to.be.revertedWith("MultiSig: Request does not exist");
    });
  });

  describe("getPendingRequests", function () {
    it("Should return pending requests", async function () {
      const patientHash = ethers.keccak256(ethers.toUtf8Bytes("patient-1"));
      const diagnosisHash = ethers.keccak256(ethers.toUtf8Bytes("result"));
      await multisig.requestApproval(MODEL_ID, patientHash, diagnosisHash, 95);
      const pending = await multisig.getPendingRequests();
      expect(pending.length).to.equal(1);
    });

    it("Should not include finalized requests", async function () {
      const patientHash = ethers.keccak256(ethers.toUtf8Bytes("patient-1"));
      const diagnosisHash = ethers.keccak256(ethers.toUtf8Bytes("result"));
      await multisig.requestApproval(MODEL_ID, patientHash, diagnosisHash, 95);
      await multisig.connect(doctor1).signDiagnosis(1, true, "Doctor 1");
      await multisig.connect(doctor2).signDiagnosis(1, true, "Doctor 2");
      const pending = await multisig.getPendingRequests();
      expect(pending.length).to.equal(0);
    });
  });

  describe("getTotalRequests", function () {
    it("Should track total requests", async function () {
      const patientHash = ethers.keccak256(ethers.toUtf8Bytes("patient-1"));
      const diagnosisHash = ethers.keccak256(ethers.toUtf8Bytes("result"));
      await multisig.requestApproval(MODEL_ID, patientHash, diagnosisHash, 95);
      await multisig.requestApproval(MODEL_ID, patientHash, diagnosisHash, 87);
      const total = await multisig.getTotalRequests();
      expect(total).to.equal(2);
    });
  });
});
