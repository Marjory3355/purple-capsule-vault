// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title SalaryVault - Privacy-Preserving Salary Management System
/// @author purple-capsule-vault
/// @notice Employees can submit encrypted salary and position data, system can calculate and publish average salary statistics
contract SalaryVault is SepoliaConfig {
    struct SalaryEntry {
        address submitter; // Submitter address
        string position; // Job position/title
        euint32 encryptedSalary; // Encrypted monthly salary
        uint256 timestamp; // Submission timestamp
        bool isActive; // Active status
    }

    // Salary entry storage
    mapping(uint256 => SalaryEntry) public salaryEntries;
    uint256 public entryCount; // Total entry count
    
    // User management
    mapping(address => bool) public hasSubmitted; // Has user submitted
    mapping(address => uint256) public userEntryId; // User's entry ID
    
    // Encrypted aggregate data
    euint32 private _encryptedTotalSalary; // Encrypted sum of all salaries
    uint32 private _activeEntryCount; // Active entry count
    
    // Position-based statistics
    mapping(bytes32 => euint32) private _encryptedPositionTotal; // Encrypted position salary sum
    mapping(bytes32 => uint32) private _positionCount; // Position entry count
    
    // Decrypted statistical results
    uint32 private _decryptedAverageSalary; // Decrypted global average salary
    bool private _statsFinalized; // Are global stats decrypted
    mapping(uint256 => bool) private _globalStatsRequest; // Track global stats requests
    
    // Position-based decrypted results
    mapping(bytes32 => uint32) private _decryptedPositionAverage; // Position average salary
    mapping(bytes32 => bool) private _positionFinalized; // Are position stats decrypted
    mapping(uint256 => bytes32) private _positionStatsRequest; // Track position stats requests

    // Events
    event SalarySubmitted(uint256 indexed entryId, address indexed submitter, string position);
    event SalaryUpdated(uint256 indexed entryId, address indexed submitter, string newPosition);
    event SalaryDeleted(uint256 indexed entryId, address indexed submitter);
    event StatsRequested(uint256 requestId);
    event StatsPublished(uint32 averageSalary, uint32 totalCount);
    event PositionStatsRequested(bytes32 indexed positionHash, uint256 requestId);
    event PositionStatsPublished(bytes32 indexed positionHash, uint32 averageSalary, uint32 count);

    /// @notice Submit new salary entry (each address can only submit once)
    /// @param encryptedSalary Encrypted salary value
    /// @param inputProof Input proof for encrypted salary
    /// @param position Position name
    function submitSalary(
        externalEuint32 encryptedSalary,
        bytes calldata inputProof,
        string memory position
    ) external {
        require(!hasSubmitted[msg.sender], "Already submitted");
        require(bytes(position).length > 0, "Position cannot be empty");
        require(bytes(position).length <= 100, "Position too long");
        
        euint32 salary = FHE.fromExternal(encryptedSalary, inputProof);
        
        uint256 entryId = entryCount++;
        salaryEntries[entryId] = SalaryEntry({
            submitter: msg.sender,
            position: position,
            encryptedSalary: salary,
            timestamp: block.timestamp,
            isActive: true
        });
        
        hasSubmitted[msg.sender] = true;
        userEntryId[msg.sender] = entryId;
        
        // Update aggregate data
        if (_activeEntryCount == 0) {
            _encryptedTotalSalary = salary;
        } else {
            _encryptedTotalSalary = FHE.add(_encryptedTotalSalary, salary);
        }
        _activeEntryCount++;
        
        // Update position statistics
        bytes32 positionHash = keccak256(bytes(position));
        if (_positionCount[positionHash] == 0) {
            _encryptedPositionTotal[positionHash] = salary;
        } else {
            _encryptedPositionTotal[positionHash] = FHE.add(_encryptedPositionTotal[positionHash], salary);
        }
        _positionCount[positionHash]++;
        
        // Set permissions
        FHE.allowThis(salary);
        FHE.allow(salary, msg.sender);
        FHE.allowThis(_encryptedTotalSalary);
        FHE.allowThis(_encryptedPositionTotal[positionHash]);
        
        emit SalarySubmitted(entryId, msg.sender, position);
    }

    /// @notice Update existing salary entry (only callable by original submitter)
    /// @param encryptedSalary New encrypted salary value
    /// @param inputProof Input proof for encrypted salary
    /// @param newPosition New position (can be same or different)
    function updateSalary(
        externalEuint32 encryptedSalary,
        bytes calldata inputProof,
        string memory newPosition
    ) external {
        require(hasSubmitted[msg.sender], "No entry to update");
        require(bytes(newPosition).length > 0, "Position cannot be empty");
        require(bytes(newPosition).length <= 100, "Position too long");
        
        uint256 entryId = userEntryId[msg.sender];
        SalaryEntry storage entry = salaryEntries[entryId];
        require(entry.isActive, "Entry not active");
        
        euint32 newSalary = FHE.fromExternal(encryptedSalary, inputProof);
        
        // Store old encrypted salary for subtraction
        euint32 oldEncryptedSalary = entry.encryptedSalary;
        
        // Remove old salary from aggregate data
        _encryptedTotalSalary = FHE.sub(_encryptedTotalSalary, oldEncryptedSalary);
        bytes32 oldPositionHash = keccak256(bytes(entry.position));
        _encryptedPositionTotal[oldPositionHash] = FHE.sub(_encryptedPositionTotal[oldPositionHash], oldEncryptedSalary);
        _positionCount[oldPositionHash]--;
        
        // Clean up if position count reaches zero
        if (_positionCount[oldPositionHash] == 0) {
            delete _encryptedPositionTotal[oldPositionHash];
        }
        
        // Update entry - ensure atomic update
        entry.encryptedSalary = newSalary;
        entry.position = newPosition;
        entry.timestamp = block.timestamp;
        
        // Add new salary to aggregate data
        _encryptedTotalSalary = FHE.add(_encryptedTotalSalary, newSalary);
        bytes32 newPositionHash = keccak256(bytes(newPosition));
        if (_positionCount[newPositionHash] == 0) {
            _encryptedPositionTotal[newPositionHash] = newSalary;
        } else {
            _encryptedPositionTotal[newPositionHash] = FHE.add(_encryptedPositionTotal[newPositionHash], newSalary);
        }
        _positionCount[newPositionHash]++;
        
        // Update permissions - optimize to only set necessary permissions
        FHE.allowThis(newSalary);
        FHE.allow(newSalary, msg.sender);
        FHE.allowThis(_encryptedTotalSalary);
        FHE.allowThis(_encryptedPositionTotal[newPositionHash]);
        
        // Clean up old position permissions if still has entries
        if (_positionCount[oldPositionHash] > 0) {
            FHE.allowThis(_encryptedPositionTotal[oldPositionHash]);
        }
        
        emit SalaryUpdated(entryId, msg.sender, newPosition);
    }

    /// @notice Delete salary entry (only callable by original submitter)
    function deleteSalary() external {
        require(hasSubmitted[msg.sender], "No entry to delete");
        
        uint256 entryId = userEntryId[msg.sender];
        SalaryEntry storage entry = salaryEntries[entryId];
        require(entry.isActive, "Entry already deleted");
        
        // Remove from aggregate data
        _encryptedTotalSalary = FHE.sub(_encryptedTotalSalary, entry.encryptedSalary);
        _activeEntryCount--;
        
        bytes32 positionHash = keccak256(bytes(entry.position));
        _encryptedPositionTotal[positionHash] = FHE.sub(_encryptedPositionTotal[positionHash], entry.encryptedSalary);
        _positionCount[positionHash]--;
        
        if (_positionCount[positionHash] == 0) {
            delete _encryptedPositionTotal[positionHash];
        } else {
            FHE.allowThis(_encryptedPositionTotal[positionHash]);
        }
        
        entry.isActive = false;
        hasSubmitted[msg.sender] = false;
        
        FHE.allowThis(_encryptedTotalSalary);
        
        emit SalaryDeleted(entryId, msg.sender);
    }

    /// @notice Get salary entry information
    /// @param entryId Entry ID
    /// @return position Position
    /// @return timestamp Submission timestamp
    /// @return submitter Submitter address
    /// @return isActive Active status
    function getEntry(uint256 entryId) external view returns (
        string memory position,
        uint256 timestamp,
        address submitter,
        bool isActive
    ) {
        SalaryEntry storage entry = salaryEntries[entryId];
        return (entry.position, entry.timestamp, entry.submitter, entry.isActive);
    }

    /// @notice Get entry's encrypted salary (only accessible by submitter and contract)
    /// @param entryId Entry ID
    /// @return Encrypted salary value
    function getEncryptedSalary(uint256 entryId) external view returns (euint32) {
        require(entryId < entryCount, "Entry does not exist");
        return salaryEntries[entryId].encryptedSalary;
    }

    /// @notice Get current encrypted aggregate statistics
    /// @return encryptedTotal Encrypted sum of all salaries
    /// @return activeCount Active entry count
    function getEncryptedStats() external view returns (euint32 encryptedTotal, uint32 activeCount) {
        return (_encryptedTotalSalary, _activeEntryCount);
    }

    /// @notice Get encrypted statistics for specific position
    /// @param position Position name
    /// @return encryptedTotal Encrypted sum for this position
    /// @return count Entry count for this position
    function getEncryptedPositionStats(string memory position) external view returns (euint32 encryptedTotal, uint32 count) {
        require(bytes(position).length > 0, "Position cannot be empty");
        bytes32 positionHash = keccak256(bytes(position));
        return (_encryptedPositionTotal[positionHash], _positionCount[positionHash]);
    }

    /// @notice Request decryption of global statistics
    function requestGlobalStats() external {
        require(_activeEntryCount > 0, "No data to decrypt");
        require(!_statsFinalized, "Stats already finalized");
        
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(_encryptedTotalSalary);
        
        uint256 requestId = FHE.requestDecryption(cts, this.globalStatsCallback.selector);
        require(requestId > 0, "Invalid decryption request");
        _globalStatsRequest[requestId] = true;
        
        emit StatsRequested(requestId);
    }

    /// @notice Callback function for global statistics decryption
    /// @dev Prevents reentrancy by marking state as completed before external interactions
    function globalStatsCallback(uint256 requestId, bytes memory cleartexts, bytes[] memory /*signatures*/) public returns (bool) {
        require(_globalStatsRequest[requestId], "Invalid request");
        require(!_statsFinalized, "Already finalized");
        require(_activeEntryCount > 0, "No active entries");
        
        uint32 totalSalary;
        require(cleartexts.length >= 4, "Invalid cleartext length");
        assembly {
            totalSalary := shr(224, mload(add(cleartexts, 32)))
        }
        
        // Calculate average (prevent division by zero)
        require(_activeEntryCount > 0, "No active entries");
        _decryptedAverageSalary = totalSalary / _activeEntryCount;
        
        // Mark as completed before emitting event (checks-effects-interactions)
        _statsFinalized = true;
        delete _globalStatsRequest[requestId]; // Clear request to prevent reuse
        
        emit StatsPublished(_decryptedAverageSalary, _activeEntryCount);
        return true;
    }

    /// @notice Request decryption of position-specific statistics
    /// @param position Position name
    function requestPositionStats(string memory position) external {
        require(bytes(position).length > 0, "Position cannot be empty");
        bytes32 positionHash = keccak256(bytes(position));
        require(_positionCount[positionHash] > 0, "No data for this position");
        require(!_positionFinalized[positionHash], "Position stats already finalized");
        
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(_encryptedPositionTotal[positionHash]);
        
        uint256 requestId = FHE.requestDecryption(cts, this.positionStatsCallback.selector);
        require(requestId > 0, "Invalid decryption request");
        _positionStatsRequest[requestId] = positionHash;
        
        emit PositionStatsRequested(positionHash, requestId);
    }

    /// @notice Callback function for position statistics decryption
    /// @dev Prevents reentrancy by marking state as completed before external interactions
    function positionStatsCallback(uint256 requestId, bytes memory cleartexts, bytes[] memory /*signatures*/) public returns (bool) {
        bytes32 positionHash = _positionStatsRequest[requestId];
        require(positionHash != bytes32(0), "Invalid request");
        require(!_positionFinalized[positionHash], "Already finalized");
        require(_positionCount[positionHash] > 0, "No data");
        
        uint32 totalSalary;
        require(cleartexts.length >= 4, "Invalid cleartext length");
        assembly {
            totalSalary := shr(224, mload(add(cleartexts, 32)))
        }
        
        // Calculate average (allow zero totals for edge cases)
        uint32 count = _positionCount[positionHash];
        _decryptedPositionAverage[positionHash] = count > 0 ? totalSalary / count : 0;
        
        // Mark as completed before emitting event (checks-effects-interactions)
        _positionFinalized[positionHash] = true;
        delete _positionStatsRequest[requestId]; // Clear request to prevent reuse
        
        emit PositionStatsPublished(positionHash, _decryptedPositionAverage[positionHash], count);
        return true;
    }

    /// @notice Check if global statistics are available
    /// @return Whether statistics have been decrypted
    function isStatsFinalized() external view returns (bool) {
        return _statsFinalized;
    }

    /// @notice Get decrypted global statistics (only available after finalization)
    /// @return averageSalary Average salary across all entries
    /// @return totalCount Active entry count
    function getGlobalStats() external view returns (uint32 averageSalary, uint32 totalCount) {
        require(_statsFinalized, "Stats not available yet");
        return (_decryptedAverageSalary, _activeEntryCount);
    }

    /// @notice Check if position statistics are available
    /// @param position Position name
    /// @return Whether position statistics have been decrypted
    function isPositionStatsFinalized(string memory position) external view returns (bool) {
        bytes32 positionHash = keccak256(bytes(position));
        return _positionFinalized[positionHash];
    }

    /// @notice Get decrypted position statistics (only available after finalization)
    /// @param position Position name
    /// @return averageSalary Average salary for this position
    /// @return count Entry count for this position
    function getPositionStats(string memory position) external view returns (uint32 averageSalary, uint32 count) {
        bytes32 positionHash = keccak256(bytes(position));
        require(_positionFinalized[positionHash], "Position stats not available yet");
        return (_decryptedPositionAverage[positionHash], _positionCount[positionHash]);
    }

    /// @notice Get total entry count
    /// @return Total entry count
    function getEntryCount() external view returns (uint256) {
        return entryCount;
    }

    /// @notice Get active entry count
    /// @return Active entry count
    function getActiveEntryCount() external view returns (uint32) {
        return _activeEntryCount;
    }
}


