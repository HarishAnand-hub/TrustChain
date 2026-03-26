# TrustChain — System Architecture Notes

## Overview

TrustChain uses a **hybrid blockchain architecture** combining:
- **Hyperledger Fabric** — private permissioned ledger for sensitive healthcare metadata
- **Ethereum** — public immutable audit trail for external verification

## Component Diagram

```
[ Healthcare AI Model ]
        |
        | AI Events (predictions, updates, training)
        v
[ Backend REST API — Node.js/Express ]
        |                    |
        v                    v
[ Hyperledger Fabric ]   [ Ethereum Smart Contract ]
  Private Ledger            Public Ledger
  (Golang Chaincode)        (Solidity)
        |                    |
        v                    v
[ Auditor Dashboard — Frontend UI ]
  (Doctors, Regulators, Auditors)
```

## Data Flow

1. AI model makes a prediction → triggers POST /prediction/log
2. API hashes the input/output → calls both Fabric and Ethereum
3. Fabric stores full event privately → Ethereum stores hash publicly
4. Auditor queries GET /audit/:modelID → sees full history
