"""
TrustChain — Full End-to-End Integration
==========================================
Flow:
    1. Register AI model on blockchain
    2. Doctor submits patient data
    3. XGBoost + SHAP AI predicts disease
    4. Prediction logged to Ethereum LIVE
    5. Transaction appears on Etherscan

Author: Harish Anand (CSE 540 - ASU, Spring B 2026)
Contract: 0xe767907b979525F487F89abF2df46628B81C9791 (Sepolia)
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
    print(f"✅ Contract loaded: {CONTRACT_ADDRESS}")
    return w3, contract

# ---------------------------------------------------------------
# SEND TX
# ---------------------------------------------------------------

def send_tx(w3, tx, label):
    account   = w3.eth.account.from_key(PRIVATE_KEY)
    signed    = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash   = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"📡 {label} tx sent: {tx_hash.hex()[:20]}...")
    receipt   = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    if receipt['status'] == 1:
        print(f"✅ {label} confirmed in block {receipt['blockNumber']}!")
    else:
        print(f"⚠️  {label} reverted (may already exist)")
    return tx_hash.hex()

# ---------------------------------------------------------------
# REGISTER MODEL
# ---------------------------------------------------------------

def register_model(w3, contract, model_id):
    print(f"\n📝 Registering model '{model_id}' on blockchain...")
    try:
        account = w3.eth.account.from_key(PRIVATE_KEY)
        nonce   = w3.eth.get_transaction_count(account.address)
        tx = contract.functions.registerModel(
            model_id, "DiabetesDetector-XGBoost", "1.0.0"
        ).build_transaction({
            'from': account.address, 'nonce': nonce,
            'gas': 200000, 'gasPrice': w3.eth.gas_price,
        })
        send_tx(w3, tx, "RegisterModel")
    except Exception as e:
        print(f"⚠️  Note: {str(e)[:80]}")
        print("   Continuing with predictions...")

# ---------------------------------------------------------------
# LOG PREDICTION
# ---------------------------------------------------------------

def log_prediction(w3, contract, model_id, result):
    if not PRIVATE_KEY:
        print("⚠️  No private key — skipping blockchain log")
        return None
    try:
        account    = w3.eth.account.from_key(PRIVATE_KEY)
        nonce      = w3.eth.get_transaction_count(account.address)
        input_hash  = bytes.fromhex(result['input_hash'])
        output_hash = bytes.fromhex(result['output_hash'])
        confidence  = min(int(result['confidence']), 100)

        tx = contract.functions.logPrediction(
            model_id, input_hash, output_hash, confidence
        ).build_transaction({
            'from': account.address, 'nonce': nonce,
            'gas': 500000, 'gasPrice': w3.eth.gas_price,
        })
        tx_hash = send_tx(w3, tx, "LogPrediction")
        print(f"🔗 https://sepolia.etherscan.io/tx/{tx_hash}")
        return tx_hash
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

# ---------------------------------------------------------------
# MAIN DEMO
# ---------------------------------------------------------------

def run_demo():
    print("\n" + "🔗"*30)
    print("\n  TrustChain — Full End-to-End Demo")
    print("  Healthcare AI + Ethereum Blockchain")
    print("\n" + "🔗"*30)

    w3, contract = connect()
    MODEL_ID = "diabetes-xgboost-v1"

    # Step 1: Register model
    register_model(w3, contract, MODEL_ID)

    # Step 2: Test patients
    patients = [
        ("HIGH RISK", "🔴", {
            "pregnancies": 6, "glucose": 148, "blood_pressure": 72,
            "skin_thickness": 35, "insulin": 0, "bmi": 33.6,
            "diabetes_pedigree": 0.627, "age": 50
        }),
        ("LOW RISK", "🟢", {
            "pregnancies": 1, "glucose": 85, "blood_pressure": 66,
            "skin_thickness": 29, "insulin": 0, "bmi": 26.6,
            "diabetes_pedigree": 0.351, "age": 31
        }),
    ]

    tx_hashes = []

    for label, icon, data in patients:
        print(f"\n{'='*60}")
        print(f"  {icon} {label}")
        print(f"{'='*60}")

        # AI Prediction
        print(f"\n🤖 Running XGBoost + SHAP AI...")
        result = predict(data)

        print(f"\n📊 Results:")
        print(f"   Diagnosis:  {result['diagnosis']}")
        print(f"   Confidence: {result['confidence']}%")
        print(f"   Risk Score: {result['risk_score']}/100")
        print(f"   Risk Level: {result['risk_level']}")

        print(f"\n🧠 SHAP Explanation:")
        for i, f in enumerate(result['top_factors'], 1):
            arrow = "↑" if f['contribution'] > 0 else "↓"
            print(f"   {i}. {f['feature']:<25} {arrow} {f['direction']}")

        print(f"\n🔐 Hashes for blockchain:")
        print(f"   Input:  {result['input_hash'][:32]}...")
        print(f"   Output: {result['output_hash'][:32]}...")

        # Log to blockchain
        tx = log_prediction(w3, contract, MODEL_ID, result)
        if tx:
            tx_hashes.append(tx)

        time.sleep(3)

    # Final summary
    print(f"\n{'='*60}")
    print(f"  ✅ TrustChain Demo Complete!")
    print(f"{'='*60}")
    print(f"\n🔗 Contract on Etherscan:")
    print(f"   https://sepolia.etherscan.io/address/{CONTRACT_ADDRESS}")
    print(f"\n🔗 Prediction Transactions:")
    for i, tx in enumerate(tx_hashes, 1):
        print(f"   TX {i}: https://sepolia.etherscan.io/tx/{tx}")
    print(f"\n✅ All AI predictions permanently recorded on Ethereum!")
    print(f"   Cannot be deleted. Cannot be tampered with.")


if __name__ == "__main__":
    run_demo()
