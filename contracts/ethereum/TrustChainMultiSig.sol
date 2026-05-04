// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TrustChainMultiSig
 * @author Navin Balaji Elangchezhiyan (CSE 540 - ASU)
 *
 * @notice Multi-signature approval system for HIGH RISK healthcare AI diagnoses.
 *
 * @dev When the TrustChain AI model predicts HIGH RISK diabetes (confidence > 75%),
 *      the diagnosis cannot be finalized until TWO authorized doctors sign off.
 *      This prevents a single point of failure in high-stakes medical decisions.
 *
 *      Flow:
 *        1. AI predicts HIGH RISK → creates pending ApprovalRequest on-chain
 *        2. Doctor 1 reviews and signs → approval recorded on blockchain
 *        3. Doctor 2 reviews and signs → diagnosis FINALIZED on blockchain
 *        4. Both signatures + timestamp permanently recorded — cannot be altered
 *
 *      This ensures:
 *        - No single doctor can finalize a high-risk diagnosis alone
 *        - Full audit trail of who approved what and when
 *        - HIPAA compliant — only hashes stored, never raw patient data
 *        - Tamper-proof — once finalized, cannot be changed
 */
contract TrustChainMultiSig {

    // ---------------------------------------------------------------
    // CONSTANTS
    // ---------------------------------------------------------------

    /// @dev Number of required signatures to finalize a high-risk diagnosis
    uint256 public constant REQUIRED_SIGNATURES = 2;

    // ---------------------------------------------------------------
    // DATA STRUCTURES
    // ---------------------------------------------------------------

    /// @dev Represents a pending approval request for a high-risk diagnosis
    struct ApprovalRequest {
        uint256 requestID;       // Unique ID for this approval request
        string  modelID;         // AI model that made the prediction
        bytes32 patientHash;     // Hash of patient data (HIPAA compliant)
        bytes32 diagnosisHash;   // Hash of the AI diagnosis result
        uint8   confidence;      // AI confidence score (0-100)
        uint256 createdAt;       // When the request was created
        uint256 finalizedAt;     // When the request was finalized (0 if pending)
        bool    isFinalized;     // Whether both doctors have signed
        bool    isRejected;      // Whether the diagnosis was rejected
        address[] signers;       // Addresses of doctors who have signed
        address requestedBy;     // Address that created the request (AI system)
    }

    /// @dev Represents a doctor's signature on a diagnosis
    struct DoctorSignature {
        address doctor;          // Doctor's Ethereum address
        uint256 signedAt;        // Timestamp of signature
        string  notes;           // Optional clinical notes
        bool    approved;        // True = approved, False = rejected
    }

    // ---------------------------------------------------------------
    // STATE VARIABLES
    // ---------------------------------------------------------------

    /// @dev Contract owner (hospital admin)
    address public contractOwner;

    /// @dev Counter for generating unique request IDs
    uint256 private requestCounter;

    /// @dev Maps requestID => ApprovalRequest
    mapping(uint256 => ApprovalRequest) public approvalRequests;

    /// @dev Maps requestID => doctor address => DoctorSignature
    mapping(uint256 => mapping(address => DoctorSignature)) public signatures;

    /// @dev Maps doctor address => bool (authorized doctors)
    mapping(address => bool) public authorizedDoctors;

    /// @dev List of all request IDs
    uint256[] public allRequestIDs;

    /// @dev Maps patientHash => list of requestIDs (history)
    mapping(bytes32 => uint256[]) public patientHistory;

    // ---------------------------------------------------------------
    // EVENTS
    // ---------------------------------------------------------------

    /// @notice Emitted when a high-risk diagnosis requires multi-sig approval
    event ApprovalRequested(
        uint256 indexed requestID,
        string  indexed modelID,
        bytes32 patientHash,
        uint8   confidence,
        address requestedBy,
        uint256 timestamp
    );

    /// @notice Emitted when a doctor signs an approval request
    event DiagnosisSigned(
        uint256 indexed requestID,
        address indexed doctor,
        bool    approved,
        uint256 timestamp,
        uint256 signaturesCount
    );

    /// @notice Emitted when a diagnosis is finalized with required signatures
    event DiagnosisFinalized(
        uint256 indexed requestID,
        bytes32 patientHash,
        bytes32 diagnosisHash,
        address signer1,
        address signer2,
        uint256 timestamp
    );

    /// @notice Emitted when a diagnosis is rejected
    event DiagnosisRejected(
        uint256 indexed requestID,
        bytes32 patientHash,
        address rejectedBy,
        uint256 timestamp
    );

    /// @notice Emitted when a doctor is authorized
    event DoctorAuthorized(address indexed doctor, uint256 timestamp);

    /// @notice Emitted when a doctor is deauthorized
    event DoctorDeauthorized(address indexed doctor, uint256 timestamp);

    // ---------------------------------------------------------------
    // MODIFIERS
    // ---------------------------------------------------------------

    modifier onlyOwner() {
        require(msg.sender == contractOwner, "MultiSig: Caller is not the owner");
        _;
    }

    modifier onlyAuthorizedDoctor() {
        require(authorizedDoctors[msg.sender], "MultiSig: Caller is not an authorized doctor");
        _;
    }

    modifier requestExists(uint256 requestID) {
        require(approvalRequests[requestID].createdAt != 0, "MultiSig: Request does not exist");
        _;
    }

    modifier notFinalized(uint256 requestID) {
        require(!approvalRequests[requestID].isFinalized, "MultiSig: Request already finalized");
        require(!approvalRequests[requestID].isRejected, "MultiSig: Request already rejected");
        _;
    }

    // ---------------------------------------------------------------
    // CONSTRUCTOR
    // ---------------------------------------------------------------

    constructor() {
        contractOwner = msg.sender;
        requestCounter = 0;
        // Owner is automatically an authorized doctor
        authorizedDoctors[msg.sender] = true;
    }

    // ---------------------------------------------------------------
    // DOCTOR MANAGEMENT
    // ---------------------------------------------------------------

    /**
     * @notice Authorize a doctor to sign high-risk diagnoses
     * @param doctor Ethereum address of the doctor
     */
    function authorizeDoctor(address doctor) external onlyOwner {
        authorizedDoctors[doctor] = true;
        emit DoctorAuthorized(doctor, block.timestamp);
    }

    /**
     * @notice Deauthorize a doctor
     * @param doctor Ethereum address of the doctor
     */
    function deauthorizeDoctor(address doctor) external onlyOwner {
        authorizedDoctors[doctor] = false;
        emit DoctorDeauthorized(doctor, block.timestamp);
    }

    // ---------------------------------------------------------------
    // CORE FUNCTIONS
    // ---------------------------------------------------------------

    /**
     * @notice Submit a HIGH RISK AI diagnosis for multi-sig approval.
     * @dev Called automatically when AI confidence > 75% for diabetes.
     *      Creates a pending request that requires 2 doctor signatures.
     *
     * @param modelID       The AI model that made the prediction
     * @param patientHash   Keccak256 hash of patient data (HIPAA compliant)
     * @param diagnosisHash Keccak256 hash of the diagnosis result
     * @param confidence    AI confidence score (0-100)
     */
    function requestApproval(
        string memory modelID,
        bytes32 patientHash,
        bytes32 diagnosisHash,
        uint8 confidence
    ) external returns (uint256) {
        require(confidence <= 100, "MultiSig: Confidence must be 0-100");
        require(confidence >= 75, "MultiSig: Only HIGH RISK diagnoses require multi-sig");

        requestCounter++;
        uint256 requestID = requestCounter;

        ApprovalRequest storage req = approvalRequests[requestID];
        req.requestID    = requestID;
        req.modelID      = modelID;
        req.patientHash  = patientHash;
        req.diagnosisHash = diagnosisHash;
        req.confidence   = confidence;
        req.createdAt    = block.timestamp;
        req.isFinalized  = false;
        req.isRejected   = false;
        req.requestedBy  = msg.sender;

        allRequestIDs.push(requestID);
        patientHistory[patientHash].push(requestID);

        emit ApprovalRequested(
            requestID, modelID, patientHash,
            confidence, msg.sender, block.timestamp
        );

        return requestID;
    }

    /**
     * @notice Sign a high-risk diagnosis approval request.
     * @dev Requires caller to be an authorized doctor.
     *      Once REQUIRED_SIGNATURES doctors sign, diagnosis is auto-finalized.
     *
     * @param requestID The ID of the approval request
     * @param approved  True to approve, False to reject
     * @param notes     Optional clinical notes from the doctor
     */
    function signDiagnosis(
        uint256 requestID,
        bool approved,
        string memory notes
    ) external onlyAuthorizedDoctor requestExists(requestID) notFinalized(requestID) {
        require(
            signatures[requestID][msg.sender].signedAt == 0,
            "MultiSig: Doctor has already signed this request"
        );

        // Record the signature
        signatures[requestID][msg.sender] = DoctorSignature({
            doctor:    msg.sender,
            signedAt:  block.timestamp,
            notes:     notes,
            approved:  approved
        });

        if (!approved) {
            // If any doctor rejects → diagnosis is rejected
            approvalRequests[requestID].isRejected = true;
            emit DiagnosisRejected(requestID, approvalRequests[requestID].patientHash, msg.sender, block.timestamp);
            return;
        }

        approvalRequests[requestID].signers.push(msg.sender);

        uint256 sigCount = approvalRequests[requestID].signers.length;

        emit DiagnosisSigned(requestID, msg.sender, approved, block.timestamp, sigCount);

        // Auto-finalize when required signatures reached
        if (sigCount >= REQUIRED_SIGNATURES) {
            approvalRequests[requestID].isFinalized = true;
            approvalRequests[requestID].finalizedAt = block.timestamp;

            emit DiagnosisFinalized(
                requestID,
                approvalRequests[requestID].patientHash,
                approvalRequests[requestID].diagnosisHash,
                approvalRequests[requestID].signers[0],
                approvalRequests[requestID].signers[1],
                block.timestamp
            );
        }
    }

    // ---------------------------------------------------------------
    // QUERY FUNCTIONS
    // ---------------------------------------------------------------

    /**
     * @notice Get details of an approval request
     */
    function getRequest(uint256 requestID)
        external view requestExists(requestID)
        returns (
            uint256 id,
            string memory modelID,
            bytes32 patientHash,
            uint8 confidence,
            bool isFinalized,
            bool isRejected,
            uint256 signaturesCount,
            uint256 createdAt,
            uint256 finalizedAt
        )
    {
        ApprovalRequest storage req = approvalRequests[requestID];
        return (
            req.requestID,
            req.modelID,
            req.patientHash,
            req.confidence,
            req.isFinalized,
            req.isRejected,
            req.signers.length,
            req.createdAt,
            req.finalizedAt
        );
    }

    /**
     * @notice Get all pending (unfinalized) request IDs
     */
    function getPendingRequests() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < allRequestIDs.length; i++) {
            if (!approvalRequests[allRequestIDs[i]].isFinalized &&
                !approvalRequests[allRequestIDs[i]].isRejected) {
                count++;
            }
        }
        uint256[] memory pending = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < allRequestIDs.length; i++) {
            if (!approvalRequests[allRequestIDs[i]].isFinalized &&
                !approvalRequests[allRequestIDs[i]].isRejected) {
                pending[idx++] = allRequestIDs[i];
            }
        }
        return pending;
    }

    /**
     * @notice Get diagnosis history for a patient
     * @param patientHash Hash of patient data
     */
    function getPatientHistory(bytes32 patientHash)
        external view returns (uint256[] memory)
    {
        return patientHistory[patientHash];
    }

    /**
     * @notice Get total number of approval requests
     */
    function getTotalRequests() external view returns (uint256) {
        return requestCounter;
    }

    /**
     * @notice Check if a doctor has signed a specific request
     */
    function hasSigned(uint256 requestID, address doctor)
        external view returns (bool)
    {
        return signatures[requestID][doctor].signedAt != 0;
    }
}
