# Salary Vault - Privacy-Preserving Salary Statistics System

A privacy-preserving salary statistics and compensation equality analysis platform built with FHEVM (Fully Homomorphic Encryption Virtual Machine) by Zama. Employees can submit encrypted salaries and view aggregated statistics without revealing individual data.

## Overview

**Salary Vault** enables employees to understand industry average compensation and analyze salary equality while maintaining complete privacy. No individual salary is ever exposed - all computations happen on encrypted data using homomorphic encryption.

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

**Challenge**: Employees want to know if they're being fairly compensated compared to industry standards, but disclosing individual salaries creates privacy concerns and potential discrimination.

**Solution**: 
1. 💰 **Create Entry**: User inputs their monthly salary and job position
2. 🔒 **Encryption**: Data is encrypted client-side before submission
3. ⚙️ **Computation**: Smart contract aggregates encrypted salaries
4. 🔑 **Decryption**: Only statistical averages are revealed, never individual salaries

**Impact**: Privacy-friendly salary transparency tool that empowers employees with compensation insights while protecting individual privacy.

## Deployed Contracts

### Sepolia Testnet
- **SalaryVault:** [`0x6cA0794e151572A2e71478c7eD5580E6E537ac61`](https://sepolia.etherscan.io/address/0x6cA0794e151572A2e71478c7eD5580E6E537ac61)
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

### Quick Start


### Deploy to Local Network

1. **Start a local FHEVM-ready node**

   ```bash
   npx hardhat node
```

2. **Deploy contracts** (in a new terminal)

```bash
   npx hardhat deploy --network localhost
   ```

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

3. **Verify contract on Etherscan**

```bash
   npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
   ```

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
  sepolia: "0x..."    // Your Sepolia deployment address
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
- 🗑�?**Delete Option** - Remove your entry completely
- 🔄 **Real-Time Feedback** - Toast notifications for all actions
- 📱 **Responsive Design** - Works on all devices

See [IMPROVEMENTS.md](IMPROVEMENTS.md) for detailed documentation of all enhancements.

## Project Structure

```
purple-capsule-vault/
├── contracts/              # Smart contract source files
�?  └── SalaryVault.sol    # Main salary vault contract
├── deploy/                # Deployment scripts
├── tasks/                 # Task scripts for testing
�?  ├── SalaryVault.ts    # Local network test script
�?  └── SalaryVaultSepolia.ts # Sepolia test script
├── test/                  # Test files
├── ui/                    # Frontend application
�?  ├── src/
�?  �?  ├── components/   # React components
�?  �?  ├── pages/        # Page components
�?  �?  ├── lib/          # Utility functions
�?  �?  ├── abi/          # Contract ABIs and addresses
�?  �?  └── hooks/        # Custom React hooks
�?  └── public/           # Static assets
├── hardhat.config.ts     # Hardhat configuration
└── package.json          # Dependencies and scripts
```

## Smart Contract API

### Main Functions

#### `submitSalary(encryptedSalary, inputProof, position)`
Submit a new encrypted salary entry (one per address).

#### `updateSalary(encryptedSalary, inputProof, newPosition)`
Update your existing salary entry.

#### `deleteSalary()`
Remove your salary entry from the system.

#### `getEncryptedStats()`
Get encrypted aggregate statistics (total and count).

#### `requestGlobalStats()`
Request decryption of global average salary.

#### `getGlobalStats()`
Retrieve decrypted global average (after finalization).

#### `requestPositionStats(position)`
Request decryption of position-specific average.

#### `getPositionStats(position)`
Retrieve decrypted position average (after finalization).

## Available Scripts

| Script             | Description                    |
| ------------------ | ------------------------------ |
| `npm run compile`  | Compile all contracts          |
| `npm run test`     | Run all tests                  |
| `npm run coverage` | Generate coverage report       |
| `npm run lint`     | Run linting checks             |
| `npm run clean`    | Clean build artifacts          |

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

