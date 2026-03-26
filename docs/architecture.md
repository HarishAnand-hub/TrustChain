# TrustChain — System Architecture

## Overview
TrustChain is a hybrid blockchain auditing system for healthcare AI models.
It records every AI decision permanently on the blockchain so nothing can be hidden or tampered with.

---

## Full System Architecture

```
                        ┌─────────────────────────┐
                        │   Healthcare AI Model    │
                        │  (Disease Prediction)    │
                        │    Python / ML Model     │
                        └────────────┬────────────┘
                                     │
                          AI Events  │  (predictions,
                          updates,   │   training,
                          access)    │
                                     ▼
                        ┌─────────────────────────┐
                        │     Backend REST API     │
                        │    (Node.js / Express)   │
                        │       server.js          │
                        └──────┬──────────┬────────┘
                               │          │
               ┌───────────────┘          └───────────────┐
               │                                          │
               ▼                                          ▼
┌──────────────────────────┐              ┌──────────────────────────┐
│   PRIVATE BLOCKCHAIN     │              │    PUBLIC BLOCKCHAIN     │
│   Hyperledger Fabric     │              │       Ethereum           │
│   (trustchain.go)        │              │  (TrustChainAudit.sol)   │
│                          │              │                          │
│  ✅ Only authorized      │              │  ✅ Anyone can verify    │
│     people can see       │              │  ✅ Fully transparent    │
│  ✅ Full private details │              │  ✅ Tamper proof         │
│  ✅ HIPAA compliant      │              │  ✅ No gas privacy issue │
│                          │              │                          │
│  Stores:                 │              │  Stores:                 │
│  - Full patient data     │              │  - Hashed proof only     │
│  - Detailed AI events    │              │  - Public audit trail    │
│  - Private audit trail   │              │  - Event logs            │
└──────────┬───────────────┘              └──────────────┬───────────┘
           │                                             │
           └───────────────────┬─────────────────────────┘
                               │
                               ▼
                  ┌────────────────────────┐
                  │    Auditor Dashboard   │
                  │      (Frontend UI)     │
                  │                        │
                  │  👨‍⚕️ Doctor            │
                  │  🏛️ Regulator          │
                  │  🔍 Auditor            │
                  └────────────────────────┘
```

---

## What Gets Recorded

Every time the AI does something, it gets recorded PERMANENTLY:

| Event | What Happens |
|-------|-------------|
| AI makes a prediction | Input hash + output hash + confidence recorded |
| AI model gets updated | Who updated it + new version recorded |
| AI training happens | Training data hash + timestamp recorded |
| Someone accesses AI | Who accessed it + when recorded |
| Access gets revoked | Who lost access + when recorded |

---

## Why Two Blockchains?

| | Hyperledger Fabric | Ethereum |
|--|--|--|
| **Who can see it** | Only authorized people | Everyone |
| **What's stored** | Full detailed data | Hashed proof |
| **Privacy** | HIPAA compliant | Public |
| **Cost** | No gas fees | Gas fees |
| **Speed** | Fast | Slower |
| **Best for** | Private healthcare data | Public verification |

---

## Team Responsibilities

| Person | Role | What They Build |
|--------|------|-----------------|
| Harish Anand | AI/ML Engineer | Disease prediction AI model |
| Navin Balaji | Blockchain Developer | Ethereum smart contract (Solidity) |
| Mohit Badiyan | Backend Engineer | REST API connecting everything |
| Vishal Sasikumar | Frontend & Hyperledger | Fabric chaincode + Dashboard UI |
| Deepak Raj | Security Engineer | Smart contract auditing + HIPAA compliance |

---

## Data Flow — Step by Step

```
Step 1: Doctor opens Dashboard
           ↓
Step 2: Enters patient symptoms/data
           ↓
Step 3: AI Model predicts disease
        e.g. "Diabetes — 87% confidence"
           ↓
Step 4: server.js API receives the prediction
           ↓
        Sends to BOTH blockchains simultaneously
           ↓                    ↓
Step 5a: Hyperledger        Step 5b: Ethereum
         records full               records
         private details            public proof
           ↓                    ↓
Step 6: Doctor/Regulator checks Dashboard
        Can see FULL history of every prediction
        Nothing can be hidden or deleted ✅
```

---

## Smart Contract Functions

### Ethereum (TrustChainAudit.sol)
| Function | What it does |
|----------|-------------|
| `registerModel()` | Registers a new AI model on the public chain |
| `logPrediction()` | Records every AI diagnosis permanently |
| `logModelEvent()` | Records training events |
| `logModelUpdate()` | Records when AI gets updated |
| `revokeAccess()` | Removes someone's access |
| `queryAuditTrail()` | Gets full history of AI decisions |

### Hyperledger Fabric (trustchain.go)
| Function | What it does |
|----------|-------------|
| `RegisterModel()` | Registers AI model on private chain |
| `LogPrediction()` | Records diagnosis privately |
| `LogModelEvent()` | Records training privately |
| `LogModelUpdate()` | Records updates privately |
| `RevokeAccess()` | Removes access privately |
| `QueryAuditTrail()` | Gets private audit history |

---

## Tech Stack Summary

```
Frontend:     HTML / CSS / JavaScript
Backend API:  Node.js + Express
AI Model:     Python + scikit-learn / TensorFlow
Blockchain 1: Hyperledger Fabric (Golang chaincode)
Blockchain 2: Ethereum (Solidity smart contracts)
Tools:        Hardhat, Docker, MetaMask
```
