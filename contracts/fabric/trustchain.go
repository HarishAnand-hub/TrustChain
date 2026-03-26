// Package main implements the TrustChain chaincode for Hyperledger Fabric.
//
// This chaincode serves as the PRIVATE blockchain layer of TrustChain.
// It runs on a permissioned Hyperledger Fabric network where only authorized
// participants (hospitals, regulators, auditors) can read or write.
//
// Unlike the public Ethereum layer, this layer stores richer metadata about
// AI model events while keeping sensitive healthcare information private.
//
// Author: Vishal Sasikumar (CSE 540 - ASU, Spring B 2026)

package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ---------------------------------------------------------------
// DATA STRUCTURES
// ---------------------------------------------------------------

// AuditEvent represents a single recorded event for a healthcare AI model.
// Each event is stored as a key-value pair on the Fabric ledger,
// where the key is the eventID and the value is the JSON-serialized struct.
type AuditEvent struct {
	EventID   string `json:"eventID"`   // Unique identifier for this event
	ModelID   string `json:"modelID"`   // ID of the AI model this event belongs to
	EventType string `json:"eventType"` // "TRAINING", "PREDICTION", "UPDATE", "ACCESS"
	Timestamp string `json:"timestamp"` // ISO timestamp when the event was recorded
	ActorID   string `json:"actorID"`   // Identity of the actor (e.g., hospital MSP ID)
	DataHash  string `json:"dataHash"`  // SHA-256 hash of the associated data
}

// ModelMetadata stores registration and version information for a healthcare AI model.
// This is the authoritative source of truth for model identity on the private chain.
type ModelMetadata struct {
	ModelID     string `json:"modelID"`     // Unique identifier for the model
	ModelName   string `json:"modelName"`   // Human-readable name (e.g., "DiabetesDetectorV1")
	Version     string `json:"version"`     // Current version string (e.g., "1.0.0")
	Owner       string `json:"owner"`       // MSP identity of the model owner
	CreatedAt   string `json:"createdAt"`   // ISO timestamp of registration
	LastUpdated string `json:"lastUpdated"` // ISO timestamp of most recent update
	IsActive    bool   `json:"isActive"`    // Whether the model is currently active
}

// TrustChainContract is the main chaincode struct that embeds the Fabric contract API.
// All chaincode functions are methods on this struct.
type TrustChainContract struct {
	contractapi.Contract
}

// ---------------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------------

// getCurrentTimestamp returns the current UTC time as an ISO 8601 string.
// Used for consistent timestamping across all audit events.
func getCurrentTimestamp() string {
	return time.Now().UTC().Format(time.RFC3339)
}

// modelKey returns the Fabric world state key for a model's metadata.
// Convention: "MODEL_<modelID>"
func modelKey(modelID string) string {
	return fmt.Sprintf("MODEL_%s", modelID)
}

// eventKey returns the Fabric world state key for an audit event.
// Convention: "EVENT_<modelID>_<eventID>"
func eventKey(modelID, eventID string) string {
	return fmt.Sprintf("EVENT_%s_%s", modelID, eventID)
}

// ---------------------------------------------------------------
// CORE CHAINCODE FUNCTIONS
// ---------------------------------------------------------------

// RegisterModel registers a new healthcare AI model on the private Fabric ledger.
//
// This must be called before any audit events can be logged for the model.
// Stores the model's metadata (name, version, owner) in the world state.
// Only the authorized admin/owner organization should invoke this.
//
// Parameters:
//   - ctx       : Fabric transaction context
//   - modelID   : Unique string identifier for the model
//   - modelName : Human-readable model name
//   - version   : Initial version string
//   - owner     : MSP identity of the owning organization
func (t *TrustChainContract) RegisterModel(
	ctx contractapi.TransactionContextInterface,
	modelID string,
	modelName string,
	version string,
	owner string,
) error {
	// Check if model already exists to prevent duplicate registration
	existing, err := ctx.GetStub().GetState(modelKey(modelID))
	if err != nil {
		return fmt.Errorf("failed to read world state: %w", err)
	}
	if existing != nil {
		return fmt.Errorf("model %s is already registered", modelID)
	}

	now := getCurrentTimestamp()
	metadata := ModelMetadata{
		ModelID:     modelID,
		ModelName:   modelName,
		Version:     version,
		Owner:       owner,
		CreatedAt:   now,
		LastUpdated: now,
		IsActive:    true,
	}

	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return fmt.Errorf("failed to serialize model metadata: %w", err)
	}

	return ctx.GetStub().PutState(modelKey(modelID), metadataJSON)
}

// LogModelEvent records a general AI model audit event on the private ledger.
//
// Used for events such as training data ingestion, model initialization,
// configuration changes, or any lifecycle event not covered by other functions.
// The dataHash should be a SHA-256 hash of the associated data — never raw data.
//
// Parameters:
//   - ctx       : Fabric transaction context
//   - modelID   : ID of the model this event belongs to
//   - eventType : String label for the event (e.g., "TRAINING_START")
//   - dataHash  : SHA-256 hash of associated data
func (t *TrustChainContract) LogModelEvent(
	ctx contractapi.TransactionContextInterface,
	modelID string,
	eventType string,
	dataHash string,
) error {
	// Verify the model exists before logging
	if err := t.assertModelExists(ctx, modelID); err != nil {
		return err
	}

	// Use the transaction ID as a unique event identifier
	txID := ctx.GetStub().GetTxID()

	event := AuditEvent{
		EventID:   txID,
		ModelID:   modelID,
		EventType: eventType,
		Timestamp: getCurrentTimestamp(),
		ActorID:   ctx.GetClientIdentity().GetID(), // Fabric MSP identity of caller
		DataHash:  dataHash,
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to serialize audit event: %w", err)
	}

	return ctx.GetStub().PutState(eventKey(modelID, txID), eventJSON)
}

// LogPrediction records a single AI prediction event on the private ledger.
//
// For every prediction the AI model makes, this function logs:
//   - A hash of the input features (e.g., patient vitals) — NOT raw patient data
//   - A hash of the output/diagnosis
//   - The confidence score (0–100)
//
// This allows auditors to verify model behavior without exposing PHI,
// maintaining HIPAA compliance while ensuring full auditability.
//
// Parameters:
//   - ctx        : Fabric transaction context
//   - modelID    : The model that made the prediction
//   - inputHash  : SHA-256 hash of the input data
//   - outputHash : SHA-256 hash of the prediction result
//   - confidence : Confidence score as integer 0–100
func (t *TrustChainContract) LogPrediction(
	ctx contractapi.TransactionContextInterface,
	modelID string,
	inputHash string,
	outputHash string,
	confidence int,
) error {
	if err := t.assertModelExists(ctx, modelID); err != nil {
		return err
	}
	if confidence < 0 || confidence > 100 {
		return fmt.Errorf("confidence must be between 0 and 100, got %d", confidence)
	}

	txID := ctx.GetStub().GetTxID()

	// Combine input, output, and confidence into a single dataHash field
	combinedData := fmt.Sprintf("%s|%s|%d", inputHash, outputHash, confidence)

	event := AuditEvent{
		EventID:   txID,
		ModelID:   modelID,
		EventType: "PREDICTION",
		Timestamp: getCurrentTimestamp(),
		ActorID:   ctx.GetClientIdentity().GetID(),
		DataHash:  combinedData,
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to serialize prediction event: %w", err)
	}

	return ctx.GetStub().PutState(eventKey(modelID, txID), eventJSON)
}

// LogModelUpdate records a model version update event on the private ledger.
//
// Called whenever the AI model is retrained, fine-tuned, or updated.
// Updates the stored ModelMetadata version and lastUpdated fields,
// and logs the update as an AuditEvent for full traceability.
//
// Parameters:
//   - ctx        : Fabric transaction context
//   - modelID    : The model being updated
//   - newVersion : The new version string (e.g., "1.1.0")
//   - updatedBy  : Identity string of who performed the update
func (t *TrustChainContract) LogModelUpdate(
	ctx contractapi.TransactionContextInterface,
	modelID string,
	newVersion string,
	updatedBy string,
) error {
	// Fetch and update the model metadata
	metadataJSON, err := ctx.GetStub().GetState(modelKey(modelID))
	if err != nil || metadataJSON == nil {
		return fmt.Errorf("model %s not found", modelID)
	}

	var metadata ModelMetadata
	if err := json.Unmarshal(metadataJSON, &metadata); err != nil {
		return fmt.Errorf("failed to deserialize model metadata: %w", err)
	}

	// Update version and timestamp
	metadata.Version     = newVersion
	metadata.LastUpdated = getCurrentTimestamp()

	updatedJSON, err := json.Marshal(metadata)
	if err != nil {
		return fmt.Errorf("failed to serialize updated metadata: %w", err)
	}

	// Save updated metadata back to world state
	if err := ctx.GetStub().PutState(modelKey(modelID), updatedJSON); err != nil {
		return fmt.Errorf("failed to update model metadata: %w", err)
	}

	// Also log this as an audit event
	txID := ctx.GetStub().GetTxID()
	updateHash := fmt.Sprintf("UPDATE|%s|%s|%s", modelID, newVersion, updatedBy)

	event := AuditEvent{
		EventID:   txID,
		ModelID:   modelID,
		EventType: "MODEL_UPDATE",
		Timestamp: getCurrentTimestamp(),
		ActorID:   updatedBy,
		DataHash:  updateHash,
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to serialize update event: %w", err)
	}

	return ctx.GetStub().PutState(eventKey(modelID, txID), eventJSON)
}

// QueryAuditTrail retrieves the full audit history for a given AI model.
//
// Uses a range query on the Fabric world state to find all events
// with keys matching "EVENT_<modelID>_*". Returns them as a JSON array.
// This is the primary function used by auditors and regulators to
// inspect a model's complete lifecycle history.
//
// Parameters:
//   - ctx     : Fabric transaction context
//   - modelID : The model whose audit trail is being queried
//
// Returns:
//   - JSON string containing an array of AuditEvent objects
func (t *TrustChainContract) QueryAuditTrail(
	ctx contractapi.TransactionContextInterface,
	modelID string,
) (string, error) {
	if err := t.assertModelExists(ctx, modelID); err != nil {
		return "", err
	}

	// Range query: get all keys from "EVENT_<modelID>_" to "EVENT_<modelID>_~"
	startKey := fmt.Sprintf("EVENT_%s_", modelID)
	endKey   := fmt.Sprintf("EVENT_%s_~", modelID)

	iterator, err := ctx.GetStub().GetStateByRange(startKey, endKey)
	if err != nil {
		return "", fmt.Errorf("failed to get audit trail: %w", err)
	}
	defer iterator.Close()

	var events []AuditEvent
	for iterator.HasNext() {
		result, err := iterator.Next()
		if err != nil {
			return "", fmt.Errorf("iterator error: %w", err)
		}

		var event AuditEvent
		if err := json.Unmarshal(result.Value, &event); err != nil {
			return "", fmt.Errorf("failed to deserialize event: %w", err)
		}
		events = append(events, event)
	}

	eventsJSON, err := json.Marshal(events)
	if err != nil {
		return "", fmt.Errorf("failed to serialize events: %w", err)
	}

	return string(eventsJSON), nil
}

// RevokeAccess marks a model as inactive on the private ledger,
// preventing further events from being logged for it.
//
// This is used when a model is decommissioned, found to be compromised,
// or replaced by a newer version. The audit history is preserved.
//
// Parameters:
//   - ctx     : Fabric transaction context
//   - modelID : The model to deactivate
//   - actorID : The actor whose access is being revoked (logged for audit)
func (t *TrustChainContract) RevokeAccess(
	ctx contractapi.TransactionContextInterface,
	modelID string,
	actorID string,
) error {
	metadataJSON, err := ctx.GetStub().GetState(modelKey(modelID))
	if err != nil || metadataJSON == nil {
		return fmt.Errorf("model %s not found", modelID)
	}

	var metadata ModelMetadata
	if err := json.Unmarshal(metadataJSON, &metadata); err != nil {
		return fmt.Errorf("failed to deserialize metadata: %w", err)
	}

	metadata.IsActive    = false
	metadata.LastUpdated = getCurrentTimestamp()

	updatedJSON, err := json.Marshal(metadata)
	if err != nil {
		return fmt.Errorf("failed to serialize metadata: %w", err)
	}

	return ctx.GetStub().PutState(modelKey(modelID), updatedJSON)
}

// ---------------------------------------------------------------
// INTERNAL HELPERS
// ---------------------------------------------------------------

// assertModelExists checks the world state to confirm a model is registered.
// Returns an error if the model is not found, preventing invalid event logging.
func (t *TrustChainContract) assertModelExists(
	ctx contractapi.TransactionContextInterface,
	modelID string,
) error {
	data, err := ctx.GetStub().GetState(modelKey(modelID))
	if err != nil {
		return fmt.Errorf("failed to read world state: %w", err)
	}
	if data == nil {
		return fmt.Errorf("model %s is not registered", modelID)
	}
	return nil
}

// ---------------------------------------------------------------
// MAIN — chaincode entry point
// ---------------------------------------------------------------

func main() {
	chaincode, err := contractapi.NewChaincode(&TrustChainContract{})
	if err != nil {
		fmt.Printf("Error creating TrustChain chaincode: %s\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting TrustChain chaincode: %s\n", err)
	}
}
