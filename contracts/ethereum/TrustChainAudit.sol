// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TrustChainAudit
 * @author Navin Balaji Elangchezhiyan (CSE 540 - ASU)
 *
 * @notice This contract serves as the PUBLIC audit trail layer of TrustChain.
 *         It records immutable, tamper-proof audit events for healthcare AI models
 *         on the Ethereum blockchain, allowing external verification by regulators,
 *         auditors, and patients.
 *
 * @dev All audit events are stored on-chain and emitted as events.
 *      This contract does NOT store sensitive patient data — only cryptographic
 *      hashes (dataHash) are recorded to preserve HIPAA compliance.
 */
contract TrustChainAudit {

    // ---------------------------------------------------------------
    // DATA STRUCTURES
    // ---------------------------------------------------------------

    /**
     * @dev Represents a single audit event for a healthcare AI model.
     *      Each event captures what happened, when, who did it, and
     *      a hash of the associated data (e.g., input/output of prediction).
     */
    struct AuditEvent {
        uint256 eventID;       // Unique identifier for this audit event
        string  modelID;       // Identifier of the AI model being audited
        string  eventType;     // Type of event: "TRAINING", "PREDICTION", "UPDATE", "ACCESS"
        uint256 timestamp;     // Block timestamp when event was recorded
        address actorID;       // Ethereum address of the actor (hospital, engineer, etc.)
        bytes32 dataHash;      // Keccak256 hash of associated data (for integrity verification)
    }

    /**
     * @dev Stores registration metadata for a healthcare AI model.
     *      Tracks ownership, versioning, and lifecycle of the model.
     */
    struct ModelMetadata {
        string  modelID;       // Unique identifier for the AI model
        string  modelName;     // Human-readable name of the model
        string  version;       // Version string (e.g., "1.0.0")
        address owner;         // Ethereum address of the model owner/deployer
        uint256 createdAt;     // Timestamp when model was registered
        uint256 lastUpdated;   // Timestamp of the most recent update
        bool    isActive;      // Whether the model is currently active
    }

    // ---------------------------------------------------------------
    // STATE VARIABLES
    // ---------------------------------------------------------------

    /// @dev Counter for generating unique event IDs
    uint256 private eventCounter;

    /// @dev Maps modelID => ModelMetadata for registered AI models
    mapping(string => ModelMetadata) public models;

    /// @dev Maps modelID => list of AuditEvents for full audit trail retrieval
    mapping(string => AuditEvent[]) private auditTrails;

    /// @dev Maps actorID => modelID => bool for access control
    mapping(address => mapping(string => bool)) private accessControl;

    /// @dev Contract owner (admin) address
    address public contractOwner;

    // ---------------------------------------------------------------
    // EVENTS (emitted on-chain for external listeners/indexers)
    // ---------------------------------------------------------------

    /// @notice Emitted whenever any audit event is logged for a model
    event AuditLogged(
        uint256 indexed eventID,
        string  indexed modelID,
        string  eventType,
        address indexed actorID,
        uint256 timestamp,
        bytes32 dataHash
    );

    /// @notice Emitted when a new AI model is registered on the network
    event ModelRegistered(
        string indexed modelID,
        string  modelName,
        string  version,
        address indexed owner,
        uint256 timestamp
    );

    /// @notice Emitted when an actor's access to a model is revoked
    event AccessRevoked(
        string  indexed modelID,
        address indexed actorID,
        uint256 timestamp
    );

    /// @notice Emitted when a model is updated to a new version
    event ModelUpdated(
        string indexed modelID,
        string  newVersion,
        address indexed updatedBy,
        uint256 timestamp
    );

    // ---------------------------------------------------------------
    // MODIFIERS
    // ---------------------------------------------------------------

    /// @dev Restricts function to the contract owner only
    modifier onlyOwner() {
        require(msg.sender == contractOwner, "TrustChain: Caller is not the owner");
        _;
    }

    /// @dev Restricts function to actors who have been granted access to a model
    modifier onlyAuthorized(string memory modelID) {
        require(
            accessControl[msg.sender][modelID] || msg.sender == contractOwner,
            "TrustChain: Caller is not authorized for this model"
        );
        _;
    }

    /// @dev Ensures the model has been registered before interacting with it
    modifier modelExists(string memory modelID) {
        require(models[modelID].createdAt != 0, "TrustChain: Model does not exist");
        _;
    }

    // ---------------------------------------------------------------
    // CONSTRUCTOR
    // ---------------------------------------------------------------

    /**
     * @dev Sets the deploying address as the contract owner.
     */
    constructor() {
        contractOwner = msg.sender;
        eventCounter = 0;
    }

    // ---------------------------------------------------------------
    // CORE FUNCTIONS
    // ---------------------------------------------------------------

    /**
     * @notice Registers a new healthcare AI model on the public audit chain.
     * @dev Only the contract owner (admin) can register new models.
     *      Emits a ModelRegistered event.
     *
     * @param modelID   Unique string identifier for the model
     * @param modelName Human-readable name (e.g., "DiabetesDetectorV1")
     * @param version   Version string (e.g., "1.0.0")
     */
    function registerModel(
        string memory modelID,
        string memory modelName,
        string memory version
    ) external onlyOwner {
        require(models[modelID].createdAt == 0, "TrustChain: Model already registered");

        models[modelID] = ModelMetadata({
            modelID:     modelID,
            modelName:   modelName,
            version:     version,
            owner:       msg.sender,
            createdAt:   block.timestamp,
            lastUpdated: block.timestamp,
            isActive:    true
        });

        // Grant owner access by default
        accessControl[msg.sender][modelID] = true;

        emit ModelRegistered(modelID, modelName, version, msg.sender, block.timestamp);
    }

    /**
     * @notice Logs a general AI model event (e.g., training started, data ingestion).
     * @dev Records a new AuditEvent on-chain. The dataHash should be a keccak256
     *      hash of the associated training data or metadata — NOT raw data.
     *      Emits an AuditLogged event.
     *
     * @param modelID   The model this event is associated with
     * @param eventType Type of event (e.g., "TRAINING_START", "DATA_INGESTION")
     * @param dataHash  Hash of the associated data for integrity verification
     */
    function logModelEvent(
        string memory modelID,
        string memory eventType,
        bytes32 dataHash
    ) external onlyAuthorized(modelID) modelExists(modelID) {
        eventCounter++;

        AuditEvent memory newEvent = AuditEvent({
            eventID:   eventCounter,
            modelID:   modelID,
            eventType: eventType,
            timestamp: block.timestamp,
            actorID:   msg.sender,
            dataHash:  dataHash
        });

        auditTrails[modelID].push(newEvent);

        emit AuditLogged(eventCounter, modelID, eventType, msg.sender, block.timestamp, dataHash);
    }

    /**
     * @notice Logs a single AI prediction event.
     * @dev Records input hash, output hash, and confidence score for each prediction.
     *      This allows auditors to verify what the model received and returned
     *      without exposing raw patient data (HIPAA-safe).
     *      Emits an AuditLogged event with eventType = "PREDICTION".
     *
     * @param modelID     The model that made the prediction
     * @param inputHash   Hash of the input data (e.g., patient features)
     * @param outputHash  Hash of the output/diagnosis result
     * @param confidence  Confidence score as a percentage (0–100)
     */
    function logPrediction(
        string memory modelID,
        bytes32 inputHash,
        bytes32 outputHash,
        uint8 confidence
    ) external onlyAuthorized(modelID) modelExists(modelID) {
        require(confidence <= 100, "TrustChain: Confidence must be 0-100");

        eventCounter++;

        // Combine input, output, and confidence into a single dataHash
        bytes32 combinedHash = keccak256(abi.encodePacked(inputHash, outputHash, confidence));

        AuditEvent memory predEvent = AuditEvent({
            eventID:   eventCounter,
            modelID:   modelID,
            eventType: "PREDICTION",
            timestamp: block.timestamp,
            actorID:   msg.sender,
            dataHash:  combinedHash
        });

        auditTrails[modelID].push(predEvent);

        emit AuditLogged(eventCounter, modelID, "PREDICTION", msg.sender, block.timestamp, combinedHash);
    }

    /**
     * @notice Logs a model version update event.
     * @dev Records who updated the model and to what version.
     *      Updates the ModelMetadata version and lastUpdated fields.
     *      Emits both AuditLogged and ModelUpdated events.
     *
     * @param modelID    The model being updated
     * @param newVersion The new version string (e.g., "1.1.0")
     */
    function logModelUpdate(
        string memory modelID,
        string memory newVersion
    ) external onlyAuthorized(modelID) modelExists(modelID) {
        // Update stored metadata
        models[modelID].version     = newVersion;
        models[modelID].lastUpdated = block.timestamp;

        eventCounter++;

        bytes32 updateHash = keccak256(abi.encodePacked(modelID, newVersion, block.timestamp));

        AuditEvent memory updateEvent = AuditEvent({
            eventID:   eventCounter,
            modelID:   modelID,
            eventType: "MODEL_UPDATE",
            timestamp: block.timestamp,
            actorID:   msg.sender,
            dataHash:  updateHash
        });

        auditTrails[modelID].push(updateEvent);

        emit AuditLogged(eventCounter, modelID, "MODEL_UPDATE", msg.sender, block.timestamp, updateHash);
        emit ModelUpdated(modelID, newVersion, msg.sender, block.timestamp);
    }

    /**
     * @notice Grants an actor access to log events for a specific model.
     * @dev Only the contract owner can grant access.
     *
     * @param modelID The model to grant access to
     * @param actor   The Ethereum address of the actor (e.g., hospital system)
     */
    function grantAccess(
        string memory modelID,
        address actor
    ) external onlyOwner modelExists(modelID) {
        accessControl[actor][modelID] = true;
    }

    /**
     * @notice Revokes an actor's access to a specific model.
     * @dev Only the contract owner can revoke access.
     *      Emits an AccessRevoked event for the audit trail.
     *
     * @param modelID The model to revoke access from
     * @param actor   The Ethereum address of the actor being revoked
     */
    function revokeAccess(
        string memory modelID,
        address actor
    ) external onlyOwner modelExists(modelID) {
        accessControl[actor][modelID] = false;

        emit AccessRevoked(modelID, actor, block.timestamp);
    }

    // ---------------------------------------------------------------
    // QUERY FUNCTIONS (read-only)
    // ---------------------------------------------------------------

    /**
     * @notice Retrieves the full audit trail for a given AI model.
     * @dev Returns all AuditEvent structs recorded for the model.
     *      This allows regulators and auditors to inspect every event
     *      from model registration through all predictions and updates.
     *
     * @param modelID The model whose audit trail is being queried
     * @return Array of AuditEvent structs in chronological order
     */
    function queryAuditTrail(
        string memory modelID
    ) external view modelExists(modelID) returns (AuditEvent[] memory) {
        return auditTrails[modelID];
    }

    /**
     * @notice Returns the metadata for a registered AI model.
     * @param modelID The model to look up
     * @return ModelMetadata struct with name, version, owner, timestamps
     */
    function getModelMetadata(
        string memory modelID
    ) external view modelExists(modelID) returns (ModelMetadata memory) {
        return models[modelID];
    }

    /**
     * @notice Returns the total number of audit events recorded across all models.
     * @return Total event count
     */
    function getTotalEventCount() external view returns (uint256) {
        return eventCounter;
    }

    /**
     * @notice Checks whether a given actor has access to a model.
     * @param actor   The Ethereum address to check
     * @param modelID The model to check access for
     * @return True if the actor has access, false otherwise
     */
    function hasAccess(
        address actor,
        string memory modelID
    ) external view returns (bool) {
        return accessControl[actor][modelID];
    }
}
