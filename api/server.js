/**
 * TrustChain — Backend REST API
 * 
 * This Node.js/Express server acts as the middleware layer between:
 *   1. The Healthcare AI Model (which triggers audit events)
 *   2. Hyperledger Fabric (private blockchain layer)
 *   3. Ethereum (public blockchain layer)
 * 
 * It exposes REST endpoints that the AI model and frontend dashboard
 * can call to log events, register models, and query audit trails.
 * 
 * Author: Mohit Badiyan (CSE 540 - ASU, Spring B 2026)
 */

const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------
// TODO: Initialize Fabric Gateway connection
// const { Gateway, Wallets } = require('fabric-network');
// const fabricConnection = ...; 
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// TODO: Initialize Ethereum provider + contract instance
// const { ethers } = require('ethers');
// const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
// const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
// ---------------------------------------------------------------


// ---------------------------------------------------------------
// ROUTES
// ---------------------------------------------------------------

/**
 * POST /model/register
 * 
 * Registers a new healthcare AI model on both blockchain layers.
 * Body: { modelID, modelName, version, owner }
 * 
 * Calls:
 *   - Fabric chaincode: RegisterModel()
 *   - Ethereum contract: registerModel()
 */
app.post('/model/register', async (req, res) => {
    const { modelID, modelName, version, owner } = req.body;
    // TODO: call Fabric RegisterModel
    // TODO: call Ethereum registerModel
    res.json({ status: 'ok', message: `Model ${modelID} registered (stub)` });
});

/**
 * POST /event/log
 * 
 * Logs a general AI model event (e.g., training start, data ingestion).
 * Body: { modelID, eventType, dataHash }
 * 
 * Calls:
 *   - Fabric chaincode: LogModelEvent()
 *   - Ethereum contract: logModelEvent()
 */
app.post('/event/log', async (req, res) => {
    const { modelID, eventType, dataHash } = req.body;
    // TODO: call Fabric LogModelEvent
    // TODO: call Ethereum logModelEvent
    res.json({ status: 'ok', message: `Event logged for model ${modelID} (stub)` });
});

/**
 * POST /prediction/log
 * 
 * Logs a single AI prediction event.
 * Body: { modelID, inputHash, outputHash, confidence }
 * 
 * Calls:
 *   - Fabric chaincode: LogPrediction()
 *   - Ethereum contract: logPrediction()
 */
app.post('/prediction/log', async (req, res) => {
    const { modelID, inputHash, outputHash, confidence } = req.body;
    // TODO: call Fabric LogPrediction
    // TODO: call Ethereum logPrediction
    res.json({ status: 'ok', message: `Prediction logged for model ${modelID} (stub)` });
});

/**
 * POST /model/update
 * 
 * Logs a model version update.
 * Body: { modelID, newVersion, updatedBy }
 * 
 * Calls:
 *   - Fabric chaincode: LogModelUpdate()
 *   - Ethereum contract: logModelUpdate()
 */
app.post('/model/update', async (req, res) => {
    const { modelID, newVersion, updatedBy } = req.body;
    // TODO: call Fabric LogModelUpdate
    // TODO: call Ethereum logModelUpdate
    res.json({ status: 'ok', message: `Model ${modelID} updated to ${newVersion} (stub)` });
});

/**
 * GET /audit/:modelID
 * 
 * Retrieves the full audit trail for a given AI model.
 * Returns list of all events from Fabric private ledger.
 * 
 * Calls:
 *   - Fabric chaincode: QueryAuditTrail()
 */
app.get('/audit/:modelID', async (req, res) => {
    const { modelID } = req.params;
    // TODO: call Fabric QueryAuditTrail
    res.json({ status: 'ok', modelID, events: [] /* stub */ });
});

/**
 * DELETE /model/revoke
 * 
 * Revokes access/deactivates a model on both chains.
 * Body: { modelID, actorID }
 * 
 * Calls:
 *   - Fabric chaincode: RevokeAccess()
 *   - Ethereum contract: revokeAccess()
 */
app.delete('/model/revoke', async (req, res) => {
    const { modelID, actorID } = req.body;
    // TODO: call Fabric RevokeAccess
    // TODO: call Ethereum revokeAccess
    res.json({ status: 'ok', message: `Access revoked for ${actorID} on model ${modelID} (stub)` });
});

// ---------------------------------------------------------------
// START SERVER
// ---------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`TrustChain API running on port ${PORT}`);
});
