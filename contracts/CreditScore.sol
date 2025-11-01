// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title CreditScore - Privacy-Preserving Credit Score System
/// @author purple-capsule-vault
/// @notice A Web3 credit scoring system where users submit encrypted financial metrics and receive encrypted credit scores
/// @dev Uses FHEVM for fully homomorphic encryption to calculate scores on encrypted data
contract CreditScore is SepoliaConfig {
    /// @notice Credit profile containing encrypted financial metrics
    struct CreditProfile {
        euint32 encryptedIncome;           // Monthly income in units (e.g., USD)
        euint32 encryptedRepaymentRate;    // Repayment rate (0-100, representing percentage)
        euint32 encryptedDebtRatio;        // Debt-to-income ratio (0-100, representing percentage)
        euint32 encryptedCreditHistory;    // Credit history length in months
        euint32 encryptedScore;            // Calculated credit score (0-1000)
        uint256 timestamp;                 // Submission time
        address owner;                     // Profile owner
        bool isActive;                     // Whether profile is active
        bool scoreCalculated;              // Whether score has been calculated
    }

    /// @notice Mapping from user address to their credit profile
    mapping(address => CreditProfile) public creditProfiles;
    
    /// @notice Total number of active profiles
    uint256 public activeProfileCount;
    
    /// @notice Track decryption requests for individual scores
    mapping(uint256 => address) private _decryptionRequests;
    
    /// @notice Mapping to store decrypted scores (only visible to owner)
    mapping(address => uint32) private _decryptedScores;
    
    /// @notice Mapping to track if score has been decrypted
    mapping(address => bool) private _scoreFinalized;

    // Credit score calculation weights (in percentage, total = 100)
    uint32 private constant INCOME_WEIGHT = 25;          // 25% - Higher income = better score
    uint32 private constant REPAYMENT_WEIGHT = 35;       // 35% - Higher repayment rate = better score
    uint32 private constant DEBT_WEIGHT = 25;            // 25% - Lower debt ratio = better score
    uint32 private constant HISTORY_WEIGHT = 15;         // 15% - Longer history = better score

    // Maximum values for normalization
    uint32 private constant MAX_INCOME = 50000;          // Max income for scoring (normalized to 1000)
    uint32 private constant MAX_HISTORY_MONTHS = 120;    // 10 years max history

    event ProfileCreated(address indexed owner, uint256 indexed timestamp);
    event ProfileUpdated(address indexed owner, uint256 indexed timestamp);
    event ProfileDeleted(address indexed owner);
    event ScoreCalculated(address indexed owner, uint256 indexed timestamp);
    event ScoreDecryptionRequested(address indexed owner, uint256 indexed requestId);
    event ScoreRevealed(address indexed owner, uint32 score);

    /// @notice Create a new credit profile with encrypted financial metrics
    /// @param encryptedIncome Encrypted monthly income
    /// @param incomeProof Input proof for income
    /// @param encryptedRepaymentRate Encrypted repayment rate (0-100)
    /// @param repaymentProof Input proof for repayment rate
    /// @param encryptedDebtRatio Encrypted debt-to-income ratio (0-100)
    /// @param debtProof Input proof for debt ratio
    /// @param encryptedCreditHistory Encrypted credit history in months
    /// @param historyProof Input proof for credit history
    function createProfile(
        externalEuint32 encryptedIncome,
        bytes calldata incomeProof,
        externalEuint32 encryptedRepaymentRate,
        bytes calldata repaymentProof,
        externalEuint32 encryptedDebtRatio,
        bytes calldata debtProof,
        externalEuint32 encryptedCreditHistory,
        bytes calldata historyProof
    ) external {
        require(!creditProfiles[msg.sender].isActive, "Profile already exists. Use updateProfile instead");

        // Convert external encrypted values to internal format
        euint32 income = FHE.fromExternal(encryptedIncome, incomeProof);
        euint32 repaymentRate = FHE.fromExternal(encryptedRepaymentRate, repaymentProof);
        euint32 debtRatio = FHE.fromExternal(encryptedDebtRatio, debtProof);
        euint32 creditHistory = FHE.fromExternal(encryptedCreditHistory, historyProof);

        // Create profile
        CreditProfile storage profile = creditProfiles[msg.sender];
        profile.encryptedIncome = income;
        profile.encryptedRepaymentRate = repaymentRate;
        profile.encryptedDebtRatio = debtRatio;
        profile.encryptedCreditHistory = creditHistory;
        profile.timestamp = block.timestamp;
        profile.owner = msg.sender;
        profile.isActive = true;
        profile.scoreCalculated = false;

        // Allow contract and user to access encrypted values
        FHE.allowThis(income);
        FHE.allow(income, msg.sender);
        FHE.allowThis(repaymentRate);
        FHE.allow(repaymentRate, msg.sender);
        FHE.allowThis(debtRatio);
        FHE.allow(debtRatio, msg.sender);
        FHE.allowThis(creditHistory);
        FHE.allow(creditHistory, msg.sender);

        activeProfileCount++;

        emit ProfileCreated(msg.sender, block.timestamp);
    }

    /// @notice Calculate encrypted credit score based on encrypted financial metrics
    /// @dev Performs homomorphic computation on encrypted data without division (FHE limitation)
    /// Uses range-based scoring system for each metric
    function calculateScore() external {
        CreditProfile storage profile = creditProfiles[msg.sender];
        require(profile.isActive, "No active profile found");
        require(!profile.scoreCalculated, "Score already calculated");

        // Calculate income score (0-250 points, 25% weight)
        // Use tiered approach: multiple ranges
        euint32 incomeScore = _calculateIncomeScore(profile.encryptedIncome);
        
        // Calculate repayment score (0-350 points, 35% weight)
        // Repayment rate is 0-100, scale to 0-350 using tiered approach
        euint32 repaymentScore = _calculateRepaymentScore(profile.encryptedRepaymentRate);
        
        // Calculate debt score (0-250 points, 25% weight)
        // Lower debt ratio is better, use tiered approach
        euint32 debtScore = _calculateDebtScore(profile.encryptedDebtRatio);
        
        // Calculate history score (0-150 points, 15% weight)
        // Use tiered approach for credit history
        euint32 historyScore = _calculateHistoryScore(profile.encryptedCreditHistory);

        // Sum all components to get final score (0-1000)
        euint32 totalScore = FHE.add(incomeScore, repaymentScore);
        totalScore = FHE.add(totalScore, debtScore);
        totalScore = FHE.add(totalScore, historyScore);

        // Store encrypted score
        profile.encryptedScore = totalScore;
        profile.scoreCalculated = true;

        // Allow contract and user to access the score
        FHE.allowThis(totalScore);
        FHE.allow(totalScore, msg.sender);

        emit ScoreCalculated(msg.sender, block.timestamp);
    }

    /// @dev Calculate income score using tiered ranges (0-250 points)
    function _calculateIncomeScore(euint32 income) private returns (euint32) {
        // Income tiers:
        // > 9999: 250 points (>= 10000)
        // > 7499: 200 points (>= 7500)
        // > 4999: 150 points (>= 5000)
        // > 2999: 100 points (>= 3000)
        // > 1499:  50 points (>= 1500)
        // <= 1499: 25 points (< 1500)
        
        euint32 score = FHE.asEuint32(25); // Base score
        
        // Check if income > 1499 (>= 1500)
        ebool tier1 = FHE.gt(income, FHE.asEuint32(1499));
        score = FHE.select(tier1, FHE.asEuint32(50), score);
        
        // Check if income > 2999 (>= 3000)
        ebool tier2 = FHE.gt(income, FHE.asEuint32(2999));
        score = FHE.select(tier2, FHE.asEuint32(100), score);
        
        // Check if income > 4999 (>= 5000)
        ebool tier3 = FHE.gt(income, FHE.asEuint32(4999));
        score = FHE.select(tier3, FHE.asEuint32(150), score);
        
        // Check if income > 7499 (>= 7500)
        ebool tier4 = FHE.gt(income, FHE.asEuint32(7499));
        score = FHE.select(tier4, FHE.asEuint32(200), score);
        
        // Check if income > 9999 (>= 10000)
        ebool tier5 = FHE.gt(income, FHE.asEuint32(9999));
        score = FHE.select(tier5, FHE.asEuint32(250), score);
        
        return score;
    }

    /// @dev Calculate repayment score using tiered ranges (0-350 points)
    function _calculateRepaymentScore(euint32 repaymentRate) private returns (euint32) {
        // Repayment rate tiers (percentage):
        // > 94: 350 points (>= 95, excellent)
        // > 89: 300 points (>= 90, very good)
        // > 79: 250 points (>= 80, good)
        // > 69: 200 points (>= 70, fair)
        // > 59: 150 points (>= 60, poor)
        // <= 59: 100 points (< 60, very poor)
        
        euint32 score = FHE.asEuint32(100); // Base score
        
        ebool tier1 = FHE.gt(repaymentRate, FHE.asEuint32(59));
        score = FHE.select(tier1, FHE.asEuint32(150), score);
        
        ebool tier2 = FHE.gt(repaymentRate, FHE.asEuint32(69));
        score = FHE.select(tier2, FHE.asEuint32(200), score);
        
        ebool tier3 = FHE.gt(repaymentRate, FHE.asEuint32(79));
        score = FHE.select(tier3, FHE.asEuint32(250), score);
        
        ebool tier4 = FHE.gt(repaymentRate, FHE.asEuint32(89));
        score = FHE.select(tier4, FHE.asEuint32(300), score);
        
        ebool tier5 = FHE.gt(repaymentRate, FHE.asEuint32(94));
        score = FHE.select(tier5, FHE.asEuint32(350), score);
        
        return score;
    }

    /// @dev Calculate debt score using tiered ranges (0-250 points)
    /// Lower debt ratio is better
    function _calculateDebtScore(euint32 debtRatio) private returns (euint32) {
        // Debt ratio tiers (percentage):
        // <= 19:  250 points (< 20, excellent)
        // <= 29:  200 points (< 30, very good)
        // <= 39:  150 points (< 40, good)
        // <= 49:  100 points (< 50, fair)
        // <= 64:   50 points (< 65, poor)
        // > 64:    25 points (>= 65, very poor)
        
        euint32 score = FHE.asEuint32(250); // Start with best score
        
        // Reduce score as debt ratio increases
        ebool tier1 = FHE.gt(debtRatio, FHE.asEuint32(19));
        score = FHE.select(tier1, FHE.asEuint32(200), score);
        
        ebool tier2 = FHE.gt(debtRatio, FHE.asEuint32(29));
        score = FHE.select(tier2, FHE.asEuint32(150), score);
        
        ebool tier3 = FHE.gt(debtRatio, FHE.asEuint32(39));
        score = FHE.select(tier3, FHE.asEuint32(100), score);
        
        ebool tier4 = FHE.gt(debtRatio, FHE.asEuint32(49));
        score = FHE.select(tier4, FHE.asEuint32(50), score);
        
        ebool tier5 = FHE.gt(debtRatio, FHE.asEuint32(64));
        score = FHE.select(tier5, FHE.asEuint32(25), score);
        
        return score;
    }

    /// @dev Calculate credit history score using tiered ranges (0-150 points)
    function _calculateHistoryScore(euint32 history) private returns (euint32) {
        // History tiers (in months):
        // > 119 (>= 120, 10 years): 150 points
        // > 83 (>= 84, 7 years):    120 points
        // > 59 (>= 60, 5 years):     90 points
        // > 35 (>= 36, 3 years):     60 points
        // > 11 (>= 12, 1 year):      30 points
        // <= 11 (< 12):              10 points
        
        euint32 score = FHE.asEuint32(10); // Base score
        
        ebool tier1 = FHE.gt(history, FHE.asEuint32(11));
        score = FHE.select(tier1, FHE.asEuint32(30), score);
        
        ebool tier2 = FHE.gt(history, FHE.asEuint32(35));
        score = FHE.select(tier2, FHE.asEuint32(60), score);
        
        ebool tier3 = FHE.gt(history, FHE.asEuint32(59));
        score = FHE.select(tier3, FHE.asEuint32(90), score);
        
        ebool tier4 = FHE.gt(history, FHE.asEuint32(83));
        score = FHE.select(tier4, FHE.asEuint32(120), score);
        
        ebool tier5 = FHE.gt(history, FHE.asEuint32(119));
        score = FHE.select(tier5, FHE.asEuint32(150), score);
        
        return score;
    }

    /// @notice Update existing credit profile with new encrypted metrics
    /// @param encryptedIncome New encrypted monthly income
    /// @param incomeProof Input proof for income
    /// @param encryptedRepaymentRate New encrypted repayment rate
    /// @param repaymentProof Input proof for repayment rate
    /// @param encryptedDebtRatio New encrypted debt ratio
    /// @param debtProof Input proof for debt ratio
    /// @param encryptedCreditHistory New encrypted credit history
    /// @param historyProof Input proof for credit history
    function updateProfile(
        externalEuint32 encryptedIncome,
        bytes calldata incomeProof,
        externalEuint32 encryptedRepaymentRate,
        bytes calldata repaymentProof,
        externalEuint32 encryptedDebtRatio,
        bytes calldata debtProof,
        externalEuint32 encryptedCreditHistory,
        bytes calldata historyProof
    ) external {
        CreditProfile storage profile = creditProfiles[msg.sender];
        require(profile.isActive, "No active profile found");

        // Convert external encrypted values
        euint32 income = FHE.fromExternal(encryptedIncome, incomeProof);
        euint32 repaymentRate = FHE.fromExternal(encryptedRepaymentRate, repaymentProof);
        euint32 debtRatio = FHE.fromExternal(encryptedDebtRatio, debtProof);
        euint32 creditHistory = FHE.fromExternal(encryptedCreditHistory, historyProof);

        // Update profile
        profile.encryptedIncome = income;
        profile.encryptedRepaymentRate = repaymentRate;
        profile.encryptedDebtRatio = debtRatio;
        profile.encryptedCreditHistory = creditHistory;
        profile.timestamp = block.timestamp;
        profile.scoreCalculated = false; // Reset score calculation flag
        
        // Reset finalization
        _scoreFinalized[msg.sender] = false;

        // Update permissions
        FHE.allowThis(income);
        FHE.allow(income, msg.sender);
        FHE.allowThis(repaymentRate);
        FHE.allow(repaymentRate, msg.sender);
        FHE.allowThis(debtRatio);
        FHE.allow(debtRatio, msg.sender);
        FHE.allowThis(creditHistory);
        FHE.allow(creditHistory, msg.sender);

        emit ProfileUpdated(msg.sender, block.timestamp);
    }

    /// @notice Delete credit profile
    function deleteProfile() external {
        CreditProfile storage profile = creditProfiles[msg.sender];
        require(profile.isActive, "No active profile found");

        profile.isActive = false;
        activeProfileCount--;
        
        // Reset finalization
        _scoreFinalized[msg.sender] = false;

        emit ProfileDeleted(msg.sender);
    }

    /// @notice Request decryption of user's credit score
    /// @dev Only the profile owner can request decryption of their own score
    function requestScoreDecryption() external {
        CreditProfile storage profile = creditProfiles[msg.sender];
        require(profile.isActive, "No active profile found");
        require(profile.scoreCalculated, "Score not calculated yet. Call calculateScore first");
        require(!_scoreFinalized[msg.sender], "Score already decrypted");

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(profile.encryptedScore);

        uint256 requestId = FHE.requestDecryption(cts, this.scoreDecryptionCallback.selector);
        _decryptionRequests[requestId] = msg.sender;

        emit ScoreDecryptionRequested(msg.sender, requestId);
    }

    /// @notice Callback for score decryption
    /// @param requestId The decryption request ID
    /// @param cleartexts The decrypted data
    /// @dev Protected against reentrancy by marking state as finalized before external interactions
    function scoreDecryptionCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes[] memory /*signatures*/
    ) public returns (bool) {
        address owner = _decryptionRequests[requestId];
        require(owner != address(0), "Invalid request");
        require(!_scoreFinalized[owner], "Already finalized");

        uint32 score;
        require(cleartexts.length >= 4, "Invalid cleartext length");
        assembly {
            score := shr(224, mload(add(cleartexts, 32)))
        }

        // Validate score is within expected range (0-1000)
        require(score <= 1000, "Score exceeds maximum");

        _decryptedScores[owner] = score;
        
        // Mark as finalized BEFORE emitting event (checks-effects-interactions)
        _scoreFinalized[owner] = true;
        delete _decryptionRequests[requestId]; // Clear request to prevent reuse

        emit ScoreRevealed(owner, score);
        return true;
    }

    /// @notice Get user's credit profile information (metadata only, encrypted values require permissions)
    /// @param user The address of the user
    /// @return timestamp The profile creation/update timestamp
    /// @return isActive Whether the profile is active
    /// @return scoreCalculated Whether the score has been calculated
    function getProfile(address user) external view returns (
        uint256 timestamp,
        bool isActive,
        bool scoreCalculated
    ) {
        CreditProfile storage profile = creditProfiles[user];
        return (profile.timestamp, profile.isActive, profile.scoreCalculated);
    }

    /// @notice Check if user has an active profile
    /// @param user The address to check
    /// @return Whether the user has an active profile
    function hasProfile(address user) external view returns (bool) {
        return creditProfiles[user].isActive;
    }

    /// @notice Check if user's score has been decrypted
    /// @param user The address to check
    /// @return Whether the score has been finalized
    function isScoreFinalized(address user) external view returns (bool) {
        return _scoreFinalized[user];
    }

    /// @notice Get decrypted credit score (only available after decryption request)
    /// @param user The address of the user
    /// @return score The decrypted credit score (0-1000)
    function getDecryptedScore(address user) external view returns (uint32 score) {
        require(_scoreFinalized[user], "Score not available yet. Request decryption first");
        // Only the owner can view their own decrypted score
        require(msg.sender == user, "Can only view your own score");
        return _decryptedScores[user];
    }

    /// @notice Get encrypted credit score (requires FHE permissions)
    /// @param user The address of the user
    /// @return The encrypted credit score
    function getEncryptedScore(address user) external view returns (euint32) {
        CreditProfile storage profile = creditProfiles[user];
        require(profile.isActive, "No active profile");
        require(profile.scoreCalculated, "Score not calculated");
        return profile.encryptedScore;
    }

    /// @notice Get total number of active profiles
    /// @return The count of active credit profiles
    function getActiveProfileCount() external view returns (uint256) {
        return activeProfileCount;
    }

    /// @notice Get credit score calculation weights
    /// @return incomeWeight Weight for income factor (percentage)
    /// @return repaymentWeight Weight for repayment rate factor (percentage)
    /// @return debtWeight Weight for debt ratio factor (percentage)
    /// @return historyWeight Weight for credit history factor (percentage)
    function getScoreWeights() external pure returns (
        uint32 incomeWeight,
        uint32 repaymentWeight,
        uint32 debtWeight,
        uint32 historyWeight
    ) {
        return (INCOME_WEIGHT, REPAYMENT_WEIGHT, DEBT_WEIGHT, HISTORY_WEIGHT);
    }
}

