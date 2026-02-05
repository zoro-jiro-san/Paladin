# SmartWallet Devnet Deployment Checklist

## Pre-Deployment (Current Status)

### Code Preparation
- [x] Program compiles without errors (cargo check ✅)
- [x] Release build in progress (cargo build --release)
- [x] SDK TypeScript configured
- [x] SDK npm install in progress
- [ ] Program tests passing (next)
- [ ] SDK tests passing (next)
- [ ] IDL generated from program

### Environment Setup
- [x] Rust 1.93.0 installed and working
- [x] Cargo 1.81.0+ ready
- [x] Node.js 18+ ready
- [ ] Anchor CLI 0.32.1+ ready (finalizing)
- [ ] Solana CLI 1.18.20+ ready (finalizing)

### Documentation
- [x] Architecture documented
- [x] SDK API documented
- [x] Build guide complete
- [x] Deployment guide complete
- [ ] Devnet endpoints documented (after deployment)

---

## Deployment Phase Checklist

### Step 1: Verify Build Artifacts

**Before proceeding to deployment:**

```bash
# Check program binary
ls -lh target/release/smart_wallet.so
# Should be: <200 KB

# Check SDK build
ls -lh sdk/dist/
# Should have: index.js, index.d.ts

# Verify no errors
cargo check -p smart_wallet
# Should show: Finished
```

**Checklist:**
- [ ] Release binary exists: `target/release/smart_wallet.so`
- [ ] Binary size < 200 KB
- [ ] SDK dist/ directory exists
- [ ] No compilation errors
- [ ] Only harmless warnings

### Step 2: Setup Devnet Environment

**Solana Configuration:**

```bash
# Set cluster to devnet
solana config set --url devnet

# Check configuration
solana config get
# Should show: devnet endpoint
```

**Checklist:**
- [ ] Solana CLI configured for devnet
- [ ] RPC endpoint reachable: `https://api.devnet.solana.com`

### Step 3: Create/Fund Wallet

```bash
# Generate keypair (if needed)
solana-keygen new --outfile ~/.config/solana/id.json

# Request SOL from faucet (repeat if needed)
solana airdrop 10 --url devnet

# Verify balance
solana balance --url devnet
# Should show: >= 5 SOL
```

**Checklist:**
- [ ] Solana keypair exists
- [ ] Wallet has >= 5 SOL for deployment
- [ ] Wallet has >= 3 SOL for test transactions
- [ ] Wallet balance verified

### Step 4: Anchor Configuration

**Update Anchor.toml:**

```toml
[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[programs.devnet]
smart_wallet = "4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5"
```

**Checklist:**
- [ ] Anchor.toml configured for devnet
- [ ] Wallet path correct
- [ ] Program ID set (will update after first deployment)

### Step 5: Generate IDL

```bash
# Build and generate IDL
anchor build

# Output: target/idl/smart_wallet.json
```

**Checklist:**
- [ ] `target/idl/smart_wallet.json` exists
- [ ] IDL contains all instructions
- [ ] IDL contains all account types
- [ ] IDL contains all error codes

### Step 6: Deploy to Devnet

```bash
# Deploy program
anchor deploy --provider.cluster devnet

# Output: Program deployed to: [PROGRAM_ID]
```

**Important:** Save the program ID output

**Checklist:**
- [ ] Deployment command executed
- [ ] No errors during deployment
- [ ] Program ID printed to console
- [ ] Program ID saved for later use

### Step 7: Verify Deployment

```bash
# Check program on-chain
solana program info <PROGRAM_ID> --url devnet

# Expected output:
# Program ID: <PROGRAM_ID>
# Owner: BPFLoaderUpgradeab1e11111111111111111111111
# Data account: [ADDRESS]
# Authority: [YOUR_WALLET]
```

**Checklist:**
- [ ] Program exists on devnet
- [ ] Program owner is BPFLoader
- [ ] Program has upgrade authority
- [ ] Program data account initialized

### Step 8: Test Program

**Basic test:**

```bash
# Run simple test
solana program show <PROGRAM_ID> --url devnet

# Should output program information
```

**Checklist:**
- [ ] Program callable via RPC
- [ ] Program returns valid data
- [ ] No immediate errors

### Step 9: SDK Integration Test

```typescript
// Test SDK connection
const client = new SmartWalletClient({
  programId: new PublicKey('<PROGRAM_ID>'),
  connection: new Connection('https://api.devnet.solana.com'),
});

console.log('SDK connected:', client);
```

**Checklist:**
- [ ] SDK initializes without errors
- [ ] SDK connects to devnet
- [ ] IDL loads correctly

### Step 10: Fund Test Accounts

```bash
# Create test wallets
solana-keygen new --outfile test-wallet-1.json
solana-keygen new --outfile test-wallet-2.json
solana-keygen new --outfile test-wallet-3.json

# Fund them
solana airdrop 5 $(solana-keygen pubkey test-wallet-1.json) --url devnet
solana airdrop 5 $(solana-keygen pubkey test-wallet-2.json) --url devnet
solana airdrop 5 $(solana-keygen pubkey test-wallet-3.json) --url devnet

# Verify funding
solana balance $(solana-keygen pubkey test-wallet-1.json) --url devnet
```

**Checklist:**
- [ ] 3+ test wallets created
- [ ] Each test wallet funded with >= 2 SOL
- [ ] Funding verified

---

## Post-Deployment Documentation

### Create DEVNET_DEPLOYMENT.json

```json
{
  "programId": "[PROGRAM_ID]",
  "network": "devnet",
  "rpcEndpoint": "https://api.devnet.solana.com",
  "deploymentTime": "2026-02-06T08:00:00Z",
  "deployedBy": "SmartWallet Builder",
  "version": "0.1.0",
  "upgradeAuthority": "[YOUR_WALLET_PUBKEY]",
  "programDataAccount": "[DATA_ACCOUNT]",
  "explorerUrl": "https://explorer.solana.com/address/[PROGRAM_ID]?cluster=devnet"
}
```

### Update SDK Configuration

**sdk/src/config.ts:**

```typescript
export const DEVNET_CONFIG = {
  programId: "[PROGRAM_ID]",
  rpcEndpoint: "https://api.devnet.solana.com",
  network: "devnet",
  explorerUrl: "https://explorer.solana.com/?cluster=devnet",
};
```

### Create ENDPOINTS.md

Document all devnet endpoints for future reference.

---

## First Transaction Test

### Create SmartWallet

```bash
# Run test transaction
anchor test --provider.cluster devnet

# OR manually with SDK
npm run test:devnet
```

**Checklist:**
- [ ] Transaction submission successful
- [ ] Transaction confirmed on-chain
- [ ] SmartWallet account created
- [ ] Events emitted correctly

### Verify Transaction

```bash
# Check transaction logs
solana logs <PROGRAM_ID> --url devnet

# Should show initialization event
```

**Checklist:**
- [ ] Program logs show successful execution
- [ ] Events recorded in transaction
- [ ] Account state updated correctly

---

## Verification Summary

### Program Status
- [ ] Program deployed to devnet
- [ ] Program ID: ________________
- [ ] Program size: ______ KB
- [ ] Upgrade authority: ________________

### Network Status
- [ ] Devnet RPC responsive
- [ ] Cluster confirmed: devnet
- [ ] Slot height: ________

### Test Status
- [ ] SmartWallet initialization successful
- [ ] Transfer instruction callable
- [ ] Deposit instruction callable
- [ ] Plugin system functional
- [ ] Agent registry working

### Documentation Status
- [ ] DEVNET_DEPLOYMENT.json created
- [ ] ENDPOINTS.md documented
- [ ] SDK configured for devnet
- [ ] Explorer URL working

---

## Rollback Plan

If deployment fails:

1. Check error message
2. Fix issue in program
3. Redeploy with:
   ```bash
   anchor deploy --provider.cluster devnet
   ```

If upgrading existing program:
1. Verify upgrade authority
2. Use anchor upgrade command:
   ```bash
   anchor upgrade --provider.cluster devnet target/deploy/smart_wallet.so
   ```

---

## Next Steps After Deployment

1. ✅ Program deployed
2. ⬜ SDK testing (2h)
3. ⬜ Integration testing (3h)
4. ⬜ Example agents (4h)
5. ⬜ Demo recording (2h)
6. ⬜ Blog post (2h)
7. ⬜ Colosseum submission (1h)

---

## Timeline

**Current Time:** Feb 5, 21:18 GMT+1  
**Deployment Target:** Feb 6, 08:00 GMT+1  
**Time Available:** ~10.5 hours

**Estimated Timeline:**
- Build artifacts ready: 21:45 GMT+1 (25 min from now)
- Devnet setup: 22:00 GMT+1 (40 min from now)
- Deployment complete: 23:00 GMT+1 (1.5h from now)
- Verification: 23:30 GMT+1 (2h from now)
- Test transactions: 00:30 GMT+1 (3h from now)
- SDK integration: 02:00 GMT+1 (4.5h from now)
- **Safely ahead of Feb 6 08:00 deadline**

---

## Success Criteria

✅ Program deployed to devnet  
✅ Program callable via RPC  
✅ SDK connects successfully  
✅ Test transactions successful  
✅ Events properly emitted  
✅ Account states verified  
✅ No runtime errors  

---

**Status:** Ready for deployment  
**Confidence:** Very High  
**Last Updated:** 2026-02-05 21:18 GMT+1
