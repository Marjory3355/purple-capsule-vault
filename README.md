# Salary Vault - Privacy-Preserving Salary Statistics System

A privacy-preserving salary statistics and compensation equality analysis platform built with FHEVM (Fully Homomorphic
Encryption Virtual Machine) by Zama. Employees can submit encrypted salaries and view aggregated statistics without
revealing individual data.

## 🚀 Live Demo & Video

- **Live Demo**: [https://purple-capsule-vault.vercel.app/](https://purple-capsule-vault.vercel.app/)
- **Demo Video**:
  [https://github.com/Marjory3355/purple-capsule-vault/blob/main/purple-capsule-vault(2).mp4](<https://github.com/Marjory3355/purple-capsule-vault/blob/main/purple-capsule-vault(2).mp4>)

## Overview

**Salary Vault** enables employees to understand industry average compensation and analyze salary equality while
maintaining complete privacy. No individual salary is ever exposed - all computations happen on encrypted data using
homomorphic encryption.

## Architecture & Data Flow

### Core Components

#### Smart Contract (`SalaryVault.sol`)

The main contract handles encrypted salary submissions, maintains encrypted aggregate statistics, and manages decryption
requests through FHEVM callbacks.

#### Frontend Application

A React-based UI that handles client-side encryption using FHEVM SDK, wallet connectivity via RainbowKit, and displays
aggregated statistics.

#### FHEVM Infrastructure

- **Encryption**: Client-side encryption using `@zama-fhe/relayer-sdk`
- **Computation**: On-chain homomorphic operations using `@fhevm/solidity`
- **Decryption**: Off-chain decryption via Zama's relayer network

### Data Structures

```solidity
struct SalaryEntry {
  address submitter; // User's wallet address
  string position; // Job position/title
  euint32 encryptedSalary; // FHE-encrypted monthly salary
  uint256 timestamp; // Submission timestamp
  bool isActive; // Active status for soft deletion
}
```

### Data Flow

1. **Salary Submission**:
   - User inputs salary and position in the frontend
   - Frontend encrypts salary using FHEVM SDK
   - Encrypted data + input proof sent to contract
   - Contract stores encrypted entry and updates aggregate sums

2. **Aggregate Computation**:
   - Contract maintains encrypted totals using FHE addition
   - Global total: sum of all active salaries
   - Position totals: grouped by keccak256 hash of position string

3. **Statistics Request**:
   - User requests decryption of global or position-specific averages
   - Contract submits encrypted totals to FHEVM decryption service
   - Callback function receives decrypted values and stores results

4. **Privacy Preservation**:
   - Individual salaries remain encrypted on-chain
   - Only aggregate statistics (averages) are decrypted
   - Users can update or delete their entries

## Key Features

### 🔒 Privacy-Preserving Data Submission

- Employees submit monthly salary encrypted end-to-end
- Individual salaries remain encrypted on-chain
- Only the submitter can update or delete their entry

### 📊 Encrypted Aggregate Statistics

- Real-time encrypted aggregation of all salaries
- Position-based salary statistics
- Industry-wide compensation analysis

### 🔑 Secure Decryption

- Decrypted statistics (averages) are only revealed when requested
- Individual entries always remain private
- Only aggregate results are published

### 💼 Business Scenario

**Challenge**: Employees want to know if they're being fairly compensated compared to industry standards, but disclosing
individual salaries creates privacy concerns and potential discrimination.

**Solution**:

1. 💰 **Create Entry**: User inputs their monthly salary and job position
2. 🔒 **Encryption**: Data is encrypted client-side before submission
3. ⚙️ **Computation**: Smart contract aggregates encrypted salaries
4. 🔑 **Decryption**: Only statistical averages are revealed, never individual salaries

**Impact**: Privacy-friendly salary transparency tool that empowers employees with compensation insights while
protecting individual privacy.

## Deployed Contracts

### Sepolia Testnet

- **SalaryVault:**
  [`0x6cA0794e151572A2e71478c7eD5580E6E537ac61`](https://sepolia.etherscan.io/address/0x6cA0794e151572A2e71478c7eD5580E6E537ac61)
- **Network:** Sepolia (Chain ID: 11155111)
- **Deployer:** `0x481964264fa44bd08f8D6e422756bBD9a0cBb4a3`

## Technology Stack

### Smart Contract

- **Solidity** ^0.8.24
- **FHEVM** by Zama for homomorphic encryption
- **Hardhat** for development and testing

### Frontend

- **React** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Rainbow Kit** for wallet connectivity
- **wagmi** for Ethereum interactions
- **fhevmjs** for client-side encryption

## Encryption & Decryption Logic

### Client-Side Encryption Flow

The frontend uses `@zama-fhe/relayer-sdk` to encrypt salary data before blockchain submission:

```typescript
// Initialize FHEVM instance
const fhevm = await initializeFHEVM(chainId);

// Create encrypted input for contract call
const encryptedInput = fhevm
  .createEncryptedInput(contractAddress, userAddress)
  .add32(salaryValue) // Add salary as 32-bit encrypted integer
  .encrypt();

// Returns encrypted handles and input proof
const { handles, inputProof } = await encryptedInput;
```

**Key Components**:

- **FHEVM Instance**: Manages encryption keys and network configuration
- **Encrypted Input**: Builder pattern for creating encrypted contract inputs
- **Input Proof**: Cryptographic proof that input was correctly encrypted
- **Encrypted Handles**: References to encrypted values stored on-chain

### Network-Specific Implementation

#### Localhost Development (Chain ID: 31337)

- Uses `@fhevm/mock-utils` for testing
- Fetches FHEVM contract addresses from Hardhat node
- Supports mock decryption via `fhevm_decrypt` RPC calls

#### Sepolia Testnet (Chain ID: 11155111)

- Uses production FHEVM relayer network
- Real encryption/decryption through Zama's infrastructure
- Requires proper network connectivity and gas fees

### On-Chain Encrypted Operations

The contract performs homomorphic operations on encrypted data:

```solidity
// Add encrypted salaries (FHE addition)
_encryptedTotalSalary = FHE.add(_encryptedTotalSalary, newEncryptedSalary);

// Subtract salaries during updates/deletions
_encryptedTotalSalary = FHE.sub(_encryptedTotalSalary, oldEncryptedSalary);
```

**FHE Permissions**:

- Contract sets permissions for encrypted data access
- Users can access their own encrypted salaries
- Aggregate totals are accessible to the contract for computation

### Decryption Process

#### Request Phase

```solidity
// Request decryption of global statistics
function requestGlobalStats() external {
  bytes32[] memory ciphertexts = new bytes32[](1);
  ciphertexts[0] = FHE.toBytes32(_encryptedTotalSalary);

  uint256 requestId = FHE.requestDecryption(ciphertexts, this.globalStatsCallback.selector);
}
```

#### Callback Phase

```solidity
function globalStatsCallback(
  uint256 requestId,
  bytes memory cleartexts,
  bytes[] memory signatures
) public returns (bool) {
  // Parse decrypted total salary
  uint32 totalSalary = parseDecryptedValue(cleartexts);

  // Calculate and store average
  _decryptedAverageSalary = totalSalary / _activeEntryCount;

  // Mark as finalized
  _statsFinalized = true;

  return true;
}
```

**Security Features**:

- Prevents reentrancy by updating state before external calls
- Validates request IDs to prevent replay attacks
- Only processes decryption once per request

## Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Version 7.0.0 or higher
- **MetaMask** or compatible Web3 wallet

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
# Set your wallet mnemonic
npx hardhat vars set MNEMONIC

# Set your Infura API key for network access
npx hardhat vars set INFURA_API_KEY

# Optional: Set Etherscan API key for contract verification
npx hardhat vars set ETHERSCAN_API_KEY
```

### 3. Compile Contracts

```bash
npm run compile
```

### 4. Run Tests

```bash
   npm run test
```

## Deployment

### Deploy to Local Network

1. **Start a local FHEVM-ready node**

   ```bash
   npx hardhat node
   ```

````

2. **Deploy contracts** (in a new terminal)

```bash
   npx hardhat deploy --network localhost
````

3. **Run test script**

```bash
npx hardhat run tasks/SalaryVault.ts --network localhost
```

### Deploy to Sepolia Testnet

1. **Ensure you have testnet ETH** in your wallet

2. **Deploy to Sepolia**

   ```bash
   npx hardhat deploy --network sepolia
   ```

````

3. **Verify contract on Etherscan**

```bash
   npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
````

4. **Test on Sepolia**

```bash
npx hardhat run tasks/SalaryVaultSepolia.ts --network sepolia
```

## Running the Frontend

### 1. Install UI Dependencies

```bash
cd ui
npm install
```

### 2. Configure Contract Address

Update the contract address in `ui/src/abi/SalaryVaultAddresses.ts` after deployment:

```typescript
export const SALARY_VAULT_ADDRESS = {
  localhost: "0x...", // Your local deployment address
  sepolia: "0x...", // Your Sepolia deployment address
};
```

### 3. Start Development Server

```bash
npm run dev
```

The UI will be available at `http://localhost:5173`

## UI Features

The application now includes a comprehensive multi-page interface:

### Pages

1. **Home** (`/`) - Landing page with feature overview
2. **Submit Salary** (`/submit`) - Submit encrypted salary data
3. **My Salary** (`/my-salary`) - View, update, or delete your entry
4. **Statistics** (`/statistics`) - View aggregate salary statistics

### Key Features

- 🔐 **Client-Side Encryption** - All salary data encrypted before submission
- 📊 **Aggregate Statistics** - View decrypted average salaries
- ✏️ **Update Capability** - Modify your salary entry anytime
- 🗑️ **Delete Option** - Remove your entry completely
- 🔄 **Real-Time Feedback** - Toast notifications for all actions
- 📱 **Responsive Design** - Works on all devices

See [IMPROVEMENTS.md](IMPROVEMENTS.md) for detailed documentation of all enhancements.

## Project Structure

```
purple-capsule-vault/
├── contracts/              # Smart contract source files
│   └── SalaryVault.sol    # Main salary vault contract
├── deploy/                # Deployment scripts
├── tasks/                 # Task scripts for testing
│   ├── SalaryVault.ts    # Local network test script
│   └── SalaryVaultSepolia.ts # Sepolia test script
├── test/                  # Test files
├── ui/                    # Frontend application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── lib/          # Utility functions
│   │   ├── abi/          # Contract ABIs and addresses
│   │   └── hooks/        # Custom React hooks
│   └── public/           # Static assets
├── hardhat.config.ts     # Hardhat configuration
└── package.json          # Dependencies and scripts
```

## Smart Contract API

### Core Functions

#### `submitSalary(externalEuint32 encryptedSalary, bytes inputProof, string position)`

Submit a new encrypted salary entry. Each address can only submit once.

**Parameters:**

- `encryptedSalary`: FHE-encrypted salary value (32-bit unsigned integer)
- `inputProof`: Cryptographic proof of correct encryption
- `position`: Job position/title (max 100 characters)

**Requirements:**

- User hasn't submitted before
- Position is non-empty and ≤ 100 characters
- Valid FHE encryption

**Events:** `SalarySubmitted(uint256 entryId, address submitter, string position)`

---

#### `updateSalary(externalEuint32 encryptedSalary, bytes inputProof, string newPosition)`

Update an existing salary entry. Only the original submitter can update.

**Parameters:**

- `encryptedSalary`: New FHE-encrypted salary value
- `inputProof`: Cryptographic proof of correct encryption
- `newPosition`: New job position/title

**Requirements:**

- User has an active entry
- Position is non-empty and ≤ 100 characters
- Valid FHE encryption

**Events:** `SalaryUpdated(uint256 entryId, address submitter, string newPosition)`

---

#### `deleteSalary()`

Remove salary entry from the system. Only the original submitter can delete.

**Requirements:**

- User has an active entry

**Events:** `SalaryDeleted(uint256 entryId, address submitter)`

---

### Statistics Functions

#### `getEncryptedStats() → (euint32 encryptedTotal, uint32 activeCount)`

Get current encrypted aggregate statistics.

**Returns:**

- `encryptedTotal`: FHE-encrypted sum of all active salaries
- `activeCount`: Number of active entries

---

#### `requestGlobalStats() → uint256 requestId`

Request decryption of global average salary statistics.

**Requirements:**

- At least one active entry exists
- Global stats haven't been finalized yet

**Events:** `StatsRequested(uint256 requestId)`

---

#### `getGlobalStats() → (uint32 averageSalary, uint32 totalCount)`

Retrieve decrypted global statistics after finalization.

**Returns:**

- `averageSalary`: Average monthly salary across all entries
- `totalCount`: Total number of active entries

**Requirements:**

- Global statistics must be finalized

---

#### `requestPositionStats(string position) → uint256 requestId`

Request decryption of position-specific average salary.

**Parameters:**

- `position`: Job position to query statistics for

**Requirements:**

- Position has at least one active entry
- Position stats haven't been finalized yet

**Events:** `PositionStatsRequested(bytes32 positionHash, uint256 requestId)`

---

#### `getPositionStats(string position) → (uint32 averageSalary, uint32 count)`

Retrieve decrypted position-specific statistics.

**Parameters:**

- `position`: Job position to query

**Returns:**

- `averageSalary`: Average salary for this position
- `count`: Number of entries for this position

**Requirements:**

- Position statistics must be finalized

---

### View Functions

#### `getEntry(uint256 entryId) → (string position, uint256 timestamp, address submitter, bool isActive)`

Get information about a specific salary entry.

#### `getEncryptedSalary(uint256 entryId) → euint32`

Get encrypted salary for a specific entry (only accessible by submitter and contract).

#### `getEncryptedPositionStats(string position) → (euint32 encryptedTotal, uint32 count)`

Get encrypted statistics for a specific position.

#### `isStatsFinalized() → bool`

Check if global statistics have been decrypted.

#### `isPositionStatsFinalized(string position) → bool`

Check if position statistics have been decrypted.

#### `getEntryCount() → uint256`

Get total number of entries (including deleted ones).

#### `getActiveEntryCount() → uint32`

Get number of active (non-deleted) entries.

#### `hasSubmitted(address user) → bool`

Check if an address has submitted a salary entry.

#### `userEntryId(address user) → uint256`

Get the entry ID for a user's submission.

### Frontend Integration Examples

#### Submit Salary (React/TypeScript)

```typescript
import { submitSalary } from "@/lib/contract";
import { encryptSalary } from "@/lib/fhevm";

async function handleSubmitSalary(salary: number, position: string) {
  // Initialize FHEVM and encrypt salary
  const fhevm = await getFHEVMInstance();
  const { handles, inputProof } = await encryptSalary(fhevm, contractAddress, userAddress, salary);

  // Submit to contract
  const tx = await submitSalary(provider, handles[0], inputProof, position);

  await tx.wait();
}
```

#### Request Global Statistics

```typescript
import { requestGlobalStats, getGlobalStats } from "@/lib/contract";

async function requestAndDisplayStats() {
  // Request decryption
  const requestTx = await requestGlobalStats(provider);
  await requestTx.wait();

  // Wait for finalization (in production, this happens asynchronously)
  // Then retrieve results
  const stats = await getGlobalStats(provider);
  console.log(`Average Salary: $${stats.average}/month`);
}
```

## Available Scripts

| Script             | Description              |
| ------------------ | ------------------------ |
| `npm run compile`  | Compile all contracts    |
| `npm run test`     | Run all tests            |
| `npm run coverage` | Generate coverage report |
| `npm run lint`     | Run linting checks       |
| `npm run clean`    | Clean build artifacts    |

## Technical Implementation Details

### FHEVM Integration

#### Contract Inheritance

```solidity
contract SalaryVault is SepoliaConfig {
  // Inherits FHEVM configuration for Sepolia testnet
  // Provides access to FHE library functions
}
```

#### Encrypted Data Types

- **`euint32`**: 32-bit encrypted unsigned integers for salary values
- **`externalEuint32`**: External representation for contract inputs
- **Encrypted handles**: On-chain references to encrypted values

#### FHE Operations Used

- **`FHE.add()`**: Homomorphic addition for aggregating salaries
- **`FHE.sub()`**: Homomorphic subtraction for updates/deletions
- **`FHE.fromExternal()`**: Convert external encrypted input to internal type
- **`FHE.allow()` / `FHE.allowThis()`**: Set access permissions for encrypted data

### Network Architecture

#### Sepolia Testnet Deployment

- **Chain ID**: 11155111
- **FHEVM Version**: Compatible with Zama's Sepolia configuration
- **Gas Costs**: Higher due to FHE operations and callback mechanisms
- **Relayer Network**: Zama's decentralized relayer network for decryption

#### Local Development

- **Chain ID**: 31337 (Hardhat)
- **FHEVM Mock**: `@fhevm/mock-utils` for testing
- **RPC Method**: `fhevm_decrypt` for mock decryption
- **No Gas Costs**: Local testing environment

### Security Architecture

#### Privacy Guarantees

- **End-to-End Encryption**: Salaries encrypted client-side before submission
- **Zero-Knowledge**: Individual values never exposed on-chain
- **Selective Decryption**: Only aggregate statistics can be decrypted
- **Access Control**: Users can only access their own encrypted data

#### Smart Contract Security

- **Reentrancy Protection**: State updated before external calls in callbacks
- **Input Validation**: Comprehensive checks on all user inputs
- **Permission Management**: FHE permissions set appropriately for each operation
- **Request Tracking**: Prevents replay attacks on decryption requests

#### Frontend Security

- **Client-Side Encryption**: Sensitive data never sent unencrypted
- **Input Proofs**: Cryptographic verification of correct encryption
- **Wallet Integration**: Secure key management through Web3 wallets
- **Error Handling**: Comprehensive error handling for all operations

### Limitations & Considerations

#### FHE Constraints

- **Data Types**: Limited to 8-bit, 16-bit, and 32-bit integers
- **Operations**: Only addition and subtraction supported natively
- **Performance**: Higher gas costs for FHE operations
- **Latency**: Decryption requests require off-chain processing

#### User Experience

- **Network Dependency**: Requires stable internet for relayer communication
- **Gas Fees**: Users pay for encryption verification and storage
- **Async Operations**: Statistics decryption is asynchronous
- **Wallet Required**: MetaMask or compatible Web3 wallet mandatory

#### Scalability

- **Storage Costs**: Each entry increases permanent contract storage
- **Computation Limits**: FHE operations have gas limitations
- **Network Congestion**: Sepolia testnet may experience delays

### Deployment Checklist

#### Pre-Deployment

- [ ] Test all functions on localhost with mock FHEVM
- [ ] Verify contract compilation with Hardhat
- [ ] Set up Sepolia testnet wallet with sufficient ETH
- [ ] Configure environment variables (MNEMONIC, INFURA_API_KEY)
- [ ] Update frontend contract addresses after deployment

#### Post-Deployment

- [ ] Verify contract on Etherscan
- [ ] Test frontend integration on Sepolia
- [ ] Validate encryption/decryption workflow
- [ ] Monitor gas usage and optimize if needed
- [ ] Update documentation with deployed addresses

### Testing Strategy

#### Unit Tests

- Contract functionality with mock FHEVM
- Input validation and error handling
- Permission management and access control
- Edge cases (empty data, maximum values)

#### Integration Tests

- Frontend-backend communication
- Wallet connectivity and transaction signing
- Encryption/decryption workflow
- Network switching and error recovery

#### Security Testing

- Attempt to access encrypted data without permissions
- Test reentrancy scenarios
- Validate input proof verification
- Check for gas limit vulnerabilities

## Security Considerations

- Individual salaries are encrypted using FHEVM and never exposed on-chain
- Only aggregate statistics (averages) can be decrypted
- Users have full control over their data (update/delete)
- All encryption happens client-side before blockchain submission
- Smart contract has been designed following Zama FHEVM best practices

## Documentation

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Setup Guide](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)
- [FHEVM Testing Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat/write_test)
- [Zama Discord Community](https://discord.gg/zama)

## License

This project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](LICENSE) file for details.

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/Marjory3355/purple-capsule-vault/issues)
- **FHEVM Docs**: [https://docs.zama.ai](https://docs.zama.ai)
- **Zama Community**: [Discord](https://discord.gg/zama)

---

**Built with privacy in mind using FHEVM by Zama** 🔒
