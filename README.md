# TrustChain 🔗
### A Blockchain-Powered Auditing System for Transparent and Accountable Healthcare AI

> CSE 540: Engineering Blockchain Applications — Arizona State University, Spring B 2026

---

## 📋 Project Description

TrustChain is a hybrid blockchain-based auditing system that creates an **immutable, tamper-proof audit trail** for healthcare AI models. 

The system addresses the critical **"black box" problem** in healthcare AI — when an AI makes an incorrect diagnosis, there is currently no reliable way to trace what data was used, who modified the model, or why a particular decision was made.

TrustChain solves this by:
- Recording every AI model event (training, predictions, updates, access) cryptographically on the blockchain
- Using **Hyperledger Fabric** as a private permissioned ledger for sensitive healthcare metadata
- Using **Ethereum smart contracts** for a public, tamper-proof audit trail accessible to external auditors
- Providing a **REST API** and **web dashboard** for hospitals, regulators, and auditors to view and verify AI decisions

### Core Principles
| Principle | Description |
|-----------|-------------|
| **Transparency** | Every AI decision is traceable — auditors can see how and why the AI reached a conclusion |
| **Accountability** | The audit trail reveals what went wrong and who is responsible for incorrect AI decisions |
| **Patient Safety** | Ensures AI models are trained on verified, untampered data |

---

## 👥 Team Members

| Name | ASU ID | Role |
|------|--------|------|
| Navin Balaji Elangchezhiyan | 1237671918 | Blockchain Developer (Ethereum / Solidity) |
| Harish Anand | 1237366951 | AI/ML Engineer (Healthcare AI Model) |
| Mohit Badiyan | 1226119234 | Backend / Integration Engineer (REST APIs) |
| Vishal Sasikumar | 1237693862 | Frontend & Hyperledger Developer |
| Deepak Raj Vinoj Rajishree | 1237568243 | Security & Testing Engineer |

---

## 🗂️ Repository Structure

```
trustchain/
├── README.md
├── contracts/
│   ├── ethereum/
│   │   └── TrustChainAudit.sol       # Ethereum public audit trail (Solidity)
│   └── fabric/
│       └── trustchain.go             # Hyperledger Fabric chaincode (Golang)
├── api/
│   └── server.js                     # Node.js REST API (connects AI to blockchain)
├── frontend/
│   └── dashboard.html                # Auditor Dashboard UI (placeholder)
└── docs/
    └── architecture.md               # System architecture notes
```

---

## 🔧 Dependencies & Setup

### Prerequisites

#### Ethereum (Solidity)
- [Node.js](https://nodejs.org/) v18+
- [Hardhat](https://hardhat.org/) — Ethereum development environment
- [MetaMask](https://metamask.io/) — for local wallet/testing
- Solidity `^0.8.20`

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

#### Hyperledger Fabric (Golang)
- [Go](https://go.dev/) v1.21+
- [Docker](https://www.docker.com/) & Docker Compose
- Hyperledger Fabric v2.5 binaries

```bash
curl -sSL https://bit.ly/2ysbOFE | bash -s
```

#### Backend API
- Node.js v18+
- Express.js, fabric-network SDK, ethers.js

```bash
npm install express fabric-network ethers dotenv
```

---

## 🚀 How to Deploy (Draft)

> ⚠️ **Note:** Full deployment instructions are in progress. The following is a high-level guide.

### 1. Deploy Ethereum Smart Contract
```bash
cd contracts/ethereum
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

### 2. Deploy Hyperledger Fabric Chaincode
```bash
cd contracts/fabric
# Start the Fabric test network
./network.sh up createChannel -c trustchain
# Deploy chaincode
./network.sh deployCC -ccn trustchain -ccp ./contracts/fabric -ccl go
```

### 3. Start the REST API
```bash
cd api
node server.js
```

### 4. Open the Dashboard
Open `frontend/dashboard.html` in a browser and connect to the API endpoint.

---

## 📡 System Architecture

```
[ Healthcare AI Model ]
        |
        | (predictions, updates, training events)
        v
[ Backend REST API (Node.js) ]
        |              |
        v              v
[ Hyperledger    [ Ethereum Smart
  Fabric         Contract (Public
  (Private       Audit Trail) ]
  Ledger) ]
        |              |
        v              v
[ Auditor Dashboard — view & verify AI decisions ]
```

---

## 📄 License
MIT License — for academic use, CSE 540, Arizona State University.
