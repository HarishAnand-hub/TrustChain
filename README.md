# TrustChain ⛓️🏥

> *"Every AI decision. Permanently recorded. Cryptographically proven. Forever accountable."*

**CSE 540 — Engineering Blockchain Applications | Arizona State University | Spring B 2026**
**Group 14**

---

## The Problem Nobody Is Talking About

Hospitals are deploying AI to diagnose patients. AI is deciding who gets treatment, who gets flagged, who gets referred.

But when the AI makes a wrong call — **nobody can prove what happened.**

- What data did it use?
- Who modified the model last night?
- Was the confidence score tampered with?
- Can the patient even challenge it?

There is no answer. There is no record. There is no accountability.

**This is the healthcare AI black box problem.**

---

## Our Solution: TrustChain

TrustChain creates an **immutable, tamper-proof audit trail** for every healthcare AI decision — using a hybrid blockchain architecture that nobody can alter, delete, or deny.

```
Patient Data → AI Model → Prediction + SHAP Explanation
                                    ↓
                          Hash(input) + Hash(output)
                                    ↓
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
           Hyperledger Fabric              Ethereum Sepolia
           (Private Ledger)               (Public Proof)
           Hospital + Regulator           Anyone can verify
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
                          Auditor Dashboard
                    (Live blockchain data, real-time)
```

**HIGH RISK patients** (confidence > 75%) trigger our **Multi-Signature Approval System** — requiring 2 authorized doctors to sign off before a diagnosis is finalized on-chain. **Nobody else in healthcare AI has this.**

---

## Live Deployments on Ethereum Sepolia

| Contract | Address | Purpose |
|---|---|---|
| TrustChainAudit | [`0x131Ccce9a72646fA78A07772Ba2b543249260956`](https://sepolia.etherscan.io/address/0x131Ccce9a72646fA78A07772Ba2b543249260956) | Public audit trail for all AI predictions |
| TrustChainMultiSig | [`0xcc33595E34914898bE58a86Ae7BEe20EACB3495d`](https://sepolia.etherscan.io/address/0xcc33595E34914898bE58a86Ae7BEe20EACB3495d) | Multi-sig approval for high-risk diagnoses |

**27+ transactions permanently recorded. Cannot be deleted. Cannot be tampered with.**

---

## Dashboard Preview

![TrustChain Live Dashboard](frontend/dashboard-preview.png)

*Live dashboard showing real Ethereum transactions, patient diagnoses, and multi-sig approval queue.*

---

## What Makes TrustChain Unique

### 1. Multi-Signature Approval for High-Risk Diagnoses 🔐
When our AI predicts diabetes with > 75% confidence, the diagnosis **cannot be finalized** until two authorized doctors independently sign off on-chain. This prevents any single point of failure in high-stakes medical decisions.

```
AI: "Michael, 70yr — DIABETES — 95.83% confidence"
          ↓
TrustChainMultiSig.requestApproval() called on Ethereum
          ↓
Doctor 1 signs → DiagnosisSigned event emitted
          ↓
Doctor 2 signs → DiagnosisFinalized event emitted
          ↓
Permanently recorded. Both signatures. Both timestamps. Forever.
```

### 2. SHAP Explanation Hash on Blockchain 🧠
We don't just record WHAT the AI decided — we hash the SHAP explanation too. So you can prove not just the diagnosis, but the reasoning behind it.

### 3. Hybrid Fabric + Ethereum Architecture ⚡
- **Fabric** (private): Full patient context, hospital-only access
- **Ethereum** (public): Cryptographic proof anyone can verify
- Both layers updated simultaneously on every prediction

### 4. HIPAA Compliant by Design 🏛️
Raw patient data **never** touches the blockchain. Only cryptographic hashes (SHA-256) are recorded. The actual data stays in the hospital system.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    TRUSTCHAIN SYSTEM                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Doctor] ──→ [Dashboard] ──→ [FastAPI Backend]          │
│                                      │                   │
│                              ┌───────▼────────┐          │
│                              │  AI Model      │          │
│                              │  XGBoost+SHAP  │          │
│                              │  76.62% acc    │          │
│                              └───────┬────────┘          │
│                                      │                   │
│                    ┌─────────────────▼──────────────┐    │
│                    │         Hash Generator          │    │
│                    │  input_hash + output_hash       │    │
│                    │  + explanation_hash (SHAP)      │    │
│                    └──────┬──────────────┬───────────┘    │
│                           │              │                │
│              ┌────────────▼──┐    ┌──────▼───────────┐   │
│              │  Hyperledger  │    │   Ethereum        │   │
│              │  Fabric       │    │   Sepolia         │   │
│              │  (Private)    │    │   (Public)        │   │
│              │               │    │                   │   │
│              │  - Full data  │    │  - TrustChainAudit│   │
│              │  - Hospital   │    │  - MultiSig       │   │
│              │  - Regulator  │    │  - Anyone verify  │   │
│              └───────────────┘    └───────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
TrustChain/
│
├── contracts/
│   ├── ethereum/
│   │   ├── TrustChainAudit.sol        # Public audit trail — events, RBAC, validation
│   │   └── TrustChainMultiSig.sol     # Multi-sig approval for HIGH RISK diagnoses
│   └── fabric/
│       └── trustchain.go              # Hyperledger Fabric chaincode (Go)
│
├── ml/
│   ├── model.py                       # XGBoost + SHAP diabetes prediction model
│   ├── diabetes.csv                   # Pima Indians dataset (768 patients)
│   └── plots/shap_importance.png      # SHAP feature importance visualization
│
├── api/
│   ├── app.py                         # FastAPI backend — connects AI to blockchain
│   └── test_api.py                    # 24 API endpoint tests
│
├── test/
│   ├── TrustChain.test.js             # 29 Hardhat tests for TrustChainAudit
│   └── TrustChainMultiSig.test.js     # 22 Hardhat tests for MultiSig contract
│
├── scripts/
│   ├── deploy.js                      # Deploy TrustChainAudit to Sepolia
│   └── deployMultiSig.js             # Deploy TrustChainMultiSig to Sepolia
│
├── frontend/
│   └── dashboard.html                 # Live auditor dashboard (pulls from Etherscan)
│
└── trustchain_demo.py                 # End-to-end demo: 10 patients → blockchain
```

---

## Smart Contracts

### TrustChainAudit.sol
Public audit trail on Ethereum. Deployed and live.

| Function | Access | What it does |
|---|---|---|
| `registerModel()` | Owner only | Register a new AI model on-chain |
| `logPrediction()` | Authorized | Record input hash + output hash + confidence |
| `logModelEvent()` | Authorized | Record training/access events |
| `logModelUpdate()` | Authorized | Record model version updates |
| `grantAccess()` | Owner only | Authorize a hospital/actor |
| `revokeAccess()` | Owner only | Revoke an actor's access |
| `queryAuditTrail()` | Public | Read full audit history for a model |

**Security features:** `onlyOwner`, `onlyAuthorized`, `modelExists` modifiers. Input validation on all functions. Custom revert messages.

### TrustChainMultiSig.sol ⭐ NEW
Multi-signature approval system for high-risk diagnoses. Nobody else has this.

| Function | Access | What it does |
|---|---|---|
| `requestApproval()` | Any | Submit HIGH RISK diagnosis for approval (confidence ≥ 75%) |
| `signDiagnosis()` | Authorized Doctors | Sign or reject an approval request |
| `authorizeDoctor()` | Owner | Authorize a doctor to sign |
| `getPendingRequests()` | Public | View all pending approvals |
| `getPatientHistory()` | Public | View approval history for a patient |

**Auto-finalizes** when 2 signatures collected. **Auto-rejects** if any doctor votes no.

---

## The AI Model

**Algorithm:** XGBoost with SHAP (SHapley Additive exPlanations)
**Dataset:** Pima Indians Diabetes Dataset — 768 real patients
**Accuracy:** 76.62% | **ROC-AUC:** 81.89%

**Feature Engineering:**
- `Glucose_BMI` — Combined metabolic risk indicator
- `Insulin_Resistance` — Derived insulin resistance score
- `Age_Risk` — Age-weighted risk factor
- `Metabolic_Score` — Overall metabolic health score

**For each prediction, TrustChain records 3 hashes:**
1. `input_hash` — Proof of what data the AI received
2. `output_hash` — Proof of what the AI decided
3. `explanation_hash` — Proof of why (SHAP reasoning)

---

## Test Coverage

```
npx hardhat test

  TrustChainAudit        29 passing
  TrustChainMultiSig     22 passing
  ─────────────────────────────────
  Total Hardhat tests    51 passing ✅

python -m pytest api/test_api.py -v

  API Endpoint Tests     24 passing ✅
  ─────────────────────────────────
  Total Tests            75 passing ✅
```

**Test categories:**
- Model registration + access control
- Prediction logging + confidence validation
- Multi-sig approval flow (sign, reject, finalize)
- Edge cases: duplicate signatures, unauthorized access, non-existent models
- API validation: missing fields, invalid inputs, error handling

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Go 1.21+
- Docker + Docker Compose

### 1. Install dependencies
```bash
npm install
pip install -r requirements.txt
```

### 2. Set environment variable
```bash
export PRIVATE_KEY="your_wallet_private_key"
```

### 3. Compile contracts
```bash
npx hardhat compile
```

### 4. Run all tests
```bash
npx hardhat test
python -m pytest api/test_api.py -v
```

### 5. Deploy to Sepolia
```bash
npx hardhat run scripts/deploy.js --network sepolia
npx hardhat run scripts/deployMultiSig.js --network sepolia
```

### 6. Run end-to-end demo
```bash
python trustchain_demo.py
```

### 7. Open dashboard
Open `frontend/dashboard.html` in your browser.

---

## API Endpoints

```
GET  /           → Health check + blockchain status
GET  /health     → Detailed system health
GET  /stats      → Total event count from Ethereum
GET  /audit/{id} → Full audit trail for a model

POST /model/register   → Register AI model on blockchain
POST /prediction/log   → Log AI prediction (HIPAA compliant)
POST /event/log        → Log training/access events
POST /model/update     → Log model version update

DELETE /access/revoke  → Revoke actor access
```

---

## Stakeholder Roles

| Stakeholder | Role | Blockchain Access |
|---|---|---|
| **Hospital** | Runs AI model, submits predictions | Fabric (write) + Ethereum (write) |
| **Regulator** | Audits AI decisions, verifies compliance | Fabric (read) + Ethereum (read) |
| **Auditor** | Monitors dashboard, queries history | Ethereum (read) |
| **Doctor** | Signs high-risk diagnoses in MultiSig | Ethereum MultiSig (sign) |
| **Patient** | Verifies their diagnosis on Etherscan | Ethereum (read, public) |

---

## Team — Group 14

| Name | ID | Role |
|---|---|---|
| Navin Balaji Elangchezhiyan | 1237671918 | Blockchain Developer (Ethereum / Solidity) |
| Harish Anand | 1237366951 | AI/ML Engineer (Healthcare AI Model) |
| Mohit Badiyan | 1226119234 | Backend / Integration Engineer (FastAPI) |
| Vishal Sasikumar | 1237693862 | Frontend & Hyperledger Developer |
| Deepak Raj Vinoj Rajishree | 1237568243 | Security & Testing Engineer |

---

## License

MIT License — Academic use, CSE 540, Arizona State University, Spring B 2026.

---

*Built with ❤️ by Group 14 — because healthcare AI needs to be accountable.*
