"""
TrustChain — Full End-to-End Integration Demo
===============================================
Flow:
    1. Doctor enters patient data
    2. XGBoost + SHAP AI predicts disease
    3. Prediction automatically logged to Ethereum
    4. Transaction appears on Etherscan LIVE
    5. Permanently recorded forever

Author: Harish Anand (CSE 540 - ASU, Spring B 2026)
Contract: 0x131Ccce9a72646fA78A07772Ba2b543249260956 (Sepolia)
"""

import os
import sys
import time
from web3 import Web3
from ml.model import predict

# ---------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------

CONTRACT_ADDRESS = "0x131Ccce9a72646fA78A07772Ba2b543249260956"
RPC_URL          = "https://ethereum-sepolia-rpc.publicnode.com"
PRIVATE_KEY      = os.getenv("PRIVATE_KEY")

CONTRACT_ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "modelID",   "type": "string"},
            {"internalType": "string", "name": "modelName", "type": "string"},
            {"internalType": "string", "name": "version",   "type": "string"}
        ],
        "name": "registerModel",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string",  "name": "modelID",    "type": "string"},
            {"internalType": "bytes32", "name": "inputHash",  "type": "bytes32"},
            {"internalType": "bytes32", "name": "outputHash", "type": "bytes32"},
            {"internalType": "uint8",   "name": "confidence", "type": "uint8"}
        ],
        "name": "logPrediction",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

# ---------------------------------------------------------------
# 10 DIVERSE TEST PATIENTS
# ---------------------------------------------------------------

PATIENTS = [
    {
        "name": "Sarah, 50yr — High Risk",
        "icon": "🔴",
        "role": "Patient",
        "data": {
            "pregnancies": 6, "glucose": 148, "blood_pressure": 72,
            "skin_thickness": 35, "insulin": 0, "bmi": 33.6,
            "diabetes_pedigree": 0.627, "age": 50
        }
    },
    {
        "name": "John, 31yr — Low Risk",
        "icon": "🟢",
        "role": "Patient",
        "data": {
            "pregnancies": 1, "glucose": 85, "blood_pressure": 66,
            "skin_thickness": 29, "insulin": 0, "bmi": 26.6,
            "diabetes_pedigree": 0.351, "age": 31
        }
    },
    {
        "name": "Maria, 45yr — Medium Risk",
        "icon": "🟡",
        "role": "Patient",
        "data": {
            "pregnancies": 3, "glucose": 120, "blood_pressure": 70,
            "skin_thickness": 25, "insulin": 100, "bmi": 30.5,
            "diabetes_pedigree": 0.450, "age": 45
        }
    },
    {
        "name": "David, 62yr — Very High Risk",
        "icon": "🔴",
        "role": "Patient",
        "data": {
            "pregnancies": 8, "glucose": 183, "blood_pressure": 64,
            "skin_thickness": 0, "insulin": 0, "bmi": 23.3,
            "diabetes_pedigree": 0.672, "age": 62
        }
    },
    {
        "name": "Emma, 25yr — Healthy",
        "icon": "🟢",
        "role": "Patient",
        "data": {
            "pregnancies": 0, "glucose": 90, "blood_pressure": 60,
            "skin_thickness": 20, "insulin": 80, "bmi": 22.1,
            "diabetes_pedigree": 0.200, "age": 25
        }
    },
    {
        "name": "Robert, 55yr — High Risk",
        "icon": "🔴",
        "role": "Patient",
        "data": {
            "pregnancies": 5, "glucose": 166, "blood_pressure": 72,
            "skin_thickness": 19, "insulin": 175, "bmi": 25.8,
            "diabetes_pedigree": 0.587, "age": 55
        }
    },
    {
        "name": "Lisa, 35yr — Low Risk",
        "icon": "🟢",
        "role": "Patient",
        "data": {
            "pregnancies": 2, "glucose": 95, "blood_pressure": 68,
            "skin_thickness": 22, "insulin": 60, "bmi": 24.5,
            "diabetes_pedigree": 0.280, "age": 35
        }
    },
    {
        "name": "James, 48yr — Medium Risk",
        "icon": "🟡",
        "role": "Patient",
        "data": {
            "pregnancies": 4, "glucose": 130, "blood_pressure": 75,
            "skin_thickness": 28, "insulin": 120, "bmi": 28.9,
            "diabetes_pedigree": 0.380, "age": 48
        }
    },
    {
        "name": "Priya, 40yr — Borderline",
        "icon": "🟡",
        "role": "Patient",
        "data": {
            "pregnancies": 2, "glucose": 115, "blood_pressure": 65,
            "skin_thickness": 24, "insulin": 90, "bmi": 27.3,
            "diabetes_pedigree": 0.320, "age": 40
        }
    },
    {
        "name": "Michael, 70yr — Very High Risk",
        "icon": "🔴",
        "role": "Patient",
        "data": {
            "pregnancies": 10, "glucose": 197, "blood_pressure": 70,
            "skin_thickness": 45, "insulin": 543, "bmi": 30.5,
            "diabetes_pedigree": 0.158, "age": 70
        }
    },
]

# ---------------------------------------------------------------
# CONNECT
# ---------------------------------------------------------------

def connect():
    print("\n" + "="*60)
    print("  TrustChain — Connecting to Ethereum Sepolia")
    print("="*60)
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if w3.is_connected():
        print(f"✅ Connected! Block: {w3.eth.block_number}")
    else:
        print("❌ Connection failed!")
        sys.exit(1)
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(CONTRACT_ADDRESS),
        abi=CONTRACT_ABI
    )
    print(f"✅ Contract: {CONTRACT_ADDRESS}")
    return w3, contract

# ---------------------------------------------------------------
# LOG TO BLOCKCHAIN
# ---------------------------------------------------------------

def log_prediction(w3, contract, model_id, result):
    if not PRIVATE_KEY:
        return None
    try:
        account     = w3.eth.account.from_key(PRIVATE_KEY)
        nonce       = w3.eth.get_transaction_count(account.address)
        input_hash  = bytes.fromhex(result['input_hash'])
        output_hash = bytes.fromhex(result['output_hash'])
        confidence  = min(int(result['confidence']), 100)

        tx = contract.functions.logPrediction(
            model_id, input_hash, output_hash, confidence
        ).build_transaction({
            'from': account.address, 'nonce': nonce,
            'gas': 500000, 'gasPrice': w3.eth.gas_price,
        })
        signed  = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        print(f"   📡 Tx sent: {tx_hash.hex()[:20]}...")
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        if receipt['status'] == 1:
            print(f"   ✅ Confirmed in block {receipt['blockNumber']}!")
            print(f"   🔗 https://sepolia.etherscan.io/tx/{tx_hash.hex()}")
        return tx_hash.hex()
    except Exception as e:
        print(f"   ❌ Error: {str(e)[:60]}")
        return None

# ---------------------------------------------------------------
# MAIN DEMO
# ---------------------------------------------------------------

def run_demo():
    print("\n" + "🔗"*30)
    print("\n  TrustChain — Healthcare AI Audit Demo")
    print("  10 Patients | XGBoost + SHAP | Ethereum")
    print("\n" + "🔗"*30)

    w3, contract = connect()
    MODEL_ID = "diabetes-xgboost-v1"

    results_summary = []
    tx_hashes = []

    for i, patient in enumerate(PATIENTS, 1):
        print(f"\n{'='*60}")
        print(f"  {patient['icon']} Patient {i}/10: {patient['name']}")
        print(f"{'='*60}")

        # AI Prediction
        result = predict(patient['data'])

        print(f"   Diagnosis:  {result['diagnosis']}")
        print(f"   Confidence: {result['confidence']}%")
        print(f"   Risk Score: {result['risk_score']}/100")
        print(f"   Risk Level: {result['risk_level']}")

        print(f"\n   🧠 Top SHAP Factors:")
        for j, f in enumerate(result['top_factors'][:3], 1):
            arrow = "↑" if f['contribution'] > 0 else "↓"
            print(f"   {j}. {f['feature']:<25} {arrow} {f['direction']}")

        # Log to blockchain
        print(f"\n   🔐 Logging to Ethereum...")
        tx = log_prediction(w3, contract, MODEL_ID, result)
        if tx:
            tx_hashes.append(tx)

        results_summary.append({
            "patient": patient['name'],
            "diagnosis": result['diagnosis'],
            "confidence": result['confidence'],
            "risk": result['risk_level']
        })

        time.sleep(2)

    # Final Summary
    print(f"\n{'='*60}")
    print(f"  ✅ TrustChain Demo Complete!")
    print(f"{'='*60}")

    print(f"\n📋 Prediction Summary:")
    print(f"   {'Patient':<35} {'Diagnosis':<15} {'Confidence':<12} {'Risk'}")
    print(f"   {'-'*70}")
    for r in results_summary:
        print(f"   {r['patient']:<35} {r['diagnosis']:<15} {r['confidence']:<12}% {r['risk']}")

    print(f"\n🔗 All recorded on Ethereum:")
    print(f"   Contract: https://sepolia.etherscan.io/address/{CONTRACT_ADDRESS}")
    print(f"\n   {len(tx_hashes)}/10 predictions logged to blockchain!")
    print(f"\n✅ Every prediction permanently recorded!")
    print(f"   Cannot be deleted. Cannot be tampered with.")
    print(f"   Full audit trail available to regulators & auditors.")


if __name__ == "__main__":
    run_demo()
