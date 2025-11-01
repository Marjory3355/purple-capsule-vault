# 🔓 Local Network Decryption Guide

## Problem: Why Doesn't Local Decryption Work Automatically?

On **localhost (Hardhat)**, there is **no real FHEVM Gateway** service:

| Feature | Localhost | Sepolia |
|---------|-----------|---------|
| **Gateway Service** | ❌ Doesn't exist | ✅ Real service |
| **Auto Callback** | ❌ Never triggers | ✅ Triggers after 3-10 min |
| **`requestGlobalStats()`** | ✅ Works but waits forever | ✅ Works and completes |
| **Manual Trigger** | ✅ Required | ❌ Not needed |

**Bottom Line**: Localhost can request decryption, but the callback **never happens automatically**.

---

## 🎯 Solution: Manual Decryption Script

### Step 1: Start Hardhat Node

```bash
cd E:\zama\purple-capsule-vault
npx hardhat node
```

Keep this running in a separate terminal.

### Step 2: Deploy Contract

```bash
npx hardhat deploy --network localhost
```

Copy the deployed contract address (e.g., `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`).

### Step 3: Submit Test Data

Use the frontend or Hardhat console to submit some salary data:

```bash
# Option A: Use the frontend
# 1. Open http://localhost:5173
# 2. Connect wallet to Localhost
# 3. Submit 2-3 salary entries

# Option B: Use Hardhat task
npx hardhat task:SalaryVault --network localhost
```

### Step 4: Run Manual Decryption Script

**First, update the contract address in the script:**

Edit `scripts/trigger-local-decrypt.ts`:
```typescript
const salaryVaultAddress = "YOUR_DEPLOYED_ADDRESS_HERE";
```

**Then run the script:**

```bash
npx hardhat run scripts/trigger-local-decrypt.ts --network localhost
```

**Expected Output:**

```
🔓 Manual Local Decryption Tool
================================

📊 Active entries: 3

⏳ Decrypting encrypted salary data...

🔐 Encrypted total handle: 0x...
📊 Active count: 3

🔓 Decrypting total salary...
✅ Decrypted total: $25500
✅ Calculated average: $8500/month

📞 Triggering callback manually...
✅ Callback executed successfully!

📈 Final Decrypted Results:
   Average Salary: $8500/month
   Total Entries: 3

✅ Local decryption completed successfully!
```

### Step 5: View Results in Frontend

Refresh the frontend and navigate to "View Statistics". The decrypted average should now be visible!

---

## 🔄 Complete Local Testing Workflow

```
┌─────────────────────────────────────────────────────┐
│  1. Start Hardhat Node                              │
│     npx hardhat node                                │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│  2. Deploy Contract                                 │
│     npx hardhat deploy --network localhost          │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│  3. Update Contract Address                         │
│     - In ui/src/abi/SalaryVaultAddresses.ts         │
│     - In scripts/trigger-local-decrypt.ts           │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│  4. Submit Encrypted Data                           │
│     - Use frontend (http://localhost:5173)          │
│     - OR use: npx hardhat task:SalaryVault          │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│  5. Manual Decryption                               │
│     npx hardhat run scripts/trigger-local-decrypt.ts│
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│  6. View Results                                    │
│     - Refresh frontend                              │
│     - Check "View Statistics"                       │
└─────────────────────────────────────────────────────┘
```

---

## 💡 Why Is This Necessary?

### FHEVM Architecture on Different Networks:

#### Sepolia (Production-like):
```
Smart Contract
    ↓ requestDecryption()
FHEVM Gateway (Real Service) ←────┐
    ↓ Decrypt encrypted data       │
    ↓ Wait 3-10 minutes            │
    ↓ callback() with decrypted    │
Smart Contract ←───────────────────┘
```

#### Localhost (Development):
```
Smart Contract
    ↓ requestDecryption()
FHEVM Gateway (❌ Doesn't Exist)
    ↓ ❌ NO CALLBACK!
    ↓ ⏳ Waits forever...
    
Manual Script (Our Solution) ←─────┐
    ↓ Decrypt using mock FHEVM     │
    ↓ Call callback() directly     │
Smart Contract ←───────────────────┘
```

---

## 🚀 Alternative: Test on Sepolia Directly

If manual decryption is too cumbersome, **test directly on Sepolia**:

### Advantages:
- ✅ Real Gateway - automatic decryption
- ✅ No manual scripts needed
- ✅ True production-like behavior
- ✅ 3-10 minutes for real decryption

### Setup:
1. Get test ETH from Sepolia faucet
2. Switch wallet to Sepolia network
3. Deploy: `npx hardhat deploy --network sepolia`
4. Use frontend normally - Gateway handles everything!

---

## 📝 Summary

| Method | Speed | Complexity | Realism |
|--------|-------|------------|---------|
| **Localhost + Manual Script** | Instant | Medium | Low |
| **Sepolia Testnet** | 3-10 min | Easy | High ✨ |

**Recommendation**: 
- 🛠️ Use localhost for **rapid development** (with manual script)
- 🚀 Use Sepolia for **testing & demos** (automatic, realistic)

---

## 🐛 Troubleshooting

### Error: "FHEVM instance not available"
```bash
# Make sure Hardhat node is running with FHEVM plugin
npx hardhat node
```

### Error: "Contract not deployed"
```bash
# Redeploy the contract
npx hardhat deploy --network localhost --reset
```

### Error: "No salary data to decrypt"
```bash
# Submit test data first
npx hardhat task:SalaryVault --network localhost
# OR use the frontend to submit data
```

### Decryption works but frontend doesn't show results
```bash
# Refresh the frontend page
# Make sure you're on the "View Statistics" page
# Check browser console for errors
```

---

## 📚 Related Files

- **Manual Decrypt Script**: `scripts/trigger-local-decrypt.ts`
- **Contract**: `contracts/SalaryVault.sol`
- **Frontend**: `ui/src/pages/Index.tsx`
- **FHEVM Utils**: `ui/src/lib/fhevm.ts`
- **Contract Addresses**: `ui/src/abi/SalaryVaultAddresses.ts`

---

## 🎓 Learning Points

1. **Local FHEVM = Mock Only**: Localhost only has **encryption**, not **decryption gateway**
2. **Production = Full Stack**: Sepolia/Mainnet have real Gateway services
3. **Manual = Workaround**: The script simulates what Gateway would do
4. **Recommendation**: Use Sepolia for realistic testing and demos

**Happy Testing! 🎉**

