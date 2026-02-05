# SmartWallet Deployment Guide

## Overview

SmartWallet is deployed to Solana devnet for the Colosseum Hackathon.

**Program ID:** `4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5`  
**RPC Endpoint:** `https://api.devnet.solana.com`  
**Network:** Solana Devnet

## Deployment Steps

### 1. Prerequisites

```bash
# Install requirements
rustup update
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked

# Configure Solana
solana config set --url devnet

# Create/import keypair
solana-keygen new --outfile ~/.config/solana/keypair.json
```

### 2. Request Devnet SOL

```bash
# Get test SOL
solana airdrop 10 --url devnet

# Verify balance
solana balance --url devnet
```

### 3. Build Program

```bash
# Clean build
cargo clean
anchor build

# Output: target/deploy/smart_wallet.so
```

### 4. Deploy to Devnet

```bash
# Deploy
anchor deploy --provider.cluster devnet

# This will:
# - Deploy the program
# - Output the program ID
# - Update Anchor.toml

# Expected output:
# Program deployed to: 4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5
```

### 5. Verify Deployment

```bash
# Check program info
solana program info 4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5 --url devnet

# Should show:
# Program ID: 4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5
# Owner: BPFLoaderUpgradeab1e11111111111111111111111
# ProgramData Account: [ADDRESS]
# Authority: [KEYPAIR_PUBKEY]
# Last Extended: slot [NUMBER]

# Check program size
solana program show 4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5 --url devnet | grep "Program Data"
```

### 6. Test on Devnet

```bash
# Run tests against devnet
anchor test --provider.cluster devnet

# Or manually test with SDK:
cd sdk
node -e "
const { SmartWalletClient } = require('./dist');
const { Connection, PublicKey } = require('@solana/web3.js');

const client = new SmartWalletClient({
  programId: new PublicKey('4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5'),
  connection: new Connection('https://api.devnet.solana.com'),
});

console.log('✅ SDK connected to devnet');
"
```

## Post-Deployment

### 1. Document Deployment

Create `DEVNET_DEPLOYMENT.json`:

```json
{
  "programId": "4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5",
  "network": "devnet",
  "rpcEndpoint": "https://api.devnet.solana.com",
  "deploymentTime": "2026-02-06T08:00:00Z",
  "deployedBy": "SmartWallet Builder",
  "version": "0.1.0",
  "upgradeAuthority": "[YOUR_PUBKEY]",
  "programDataAccount": "[ADDRESS]"
}
```

### 2. Update SDK Configuration

```typescript
// sdk/src/config.ts
export const DEVNET_CONFIG = {
  programId: "4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5",
  rpcEndpoint: "https://api.devnet.solana.com",
  network: "devnet",
};
```

### 3. Fund Test Accounts

```bash
# Create test wallets
solana-keygen new --outfile test-wallet-1.json
solana-keygen new --outfile test-wallet-2.json
solana-keygen new --outfile test-wallet-3.json

# Fund them
solana airdrop 5 $(solana-keygen pubkey test-wallet-1.json) --url devnet
solana airdrop 5 $(solana-keygen pubkey test-wallet-2.json) --url devnet
solana airdrop 5 $(solana-keygen pubkey test-wallet-3.json) --url devnet
```

### 4. Document Endpoints

Create `ENDPOINTS.md`:

```markdown
# SmartWallet Devnet Endpoints

## Program
- **Program ID:** 4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5
- **Network:** Solana Devnet
- **Status:** ✅ Deployed

## RPC Endpoints

### Public
- https://api.devnet.solana.com

### High-performance
- https://api.devnet.solana.com (recommended)

## SDK Usage

```typescript
import { SmartWalletClient } from '@zoro-agents/smart-wallet';
import { Connection, PublicKey } from '@solana/web3.js';

const client = new SmartWalletClient({
  programId: new PublicKey('4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5'),
  connection: new Connection('https://api.devnet.solana.com'),
});
```

## Test Accounts

See `DEVNET_DEPLOYMENT.json` for funded test accounts.
```

## Troubleshooting

### Deployment Fails

```bash
# Check wallet balance
solana balance --url devnet

# If insufficient, request more SOL
solana airdrop 10 --url devnet

# Check RPC connection
solana cluster-version --url devnet
```

### Program Size

```bash
# SmartWallet should be < 200KB
ls -lh target/deploy/smart_wallet.so

# If too large:
# 1. Remove unused code
# 2. Use release build optimizations
# 3. Strip debug symbols
cargo build --release -p smart_wallet --target-dir target
```

### Program Already Exists

```bash
# If program ID already exists, you need to either:
# 1. Use a new keypair for a new program ID
# 2. Use upgrade authority to replace existing program

# Check upgrade authority
solana program info 4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5 --url devnet | grep Authority
```

## Verification Checklist

- [ ] Program deployed to devnet
- [ ] Program ID: 4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5
- [ ] Program size < 200KB
- [ ] Tests passing on devnet
- [ ] SDK can initialize client
- [ ] Documentation updated
- [ ] DEVNET_DEPLOYMENT.json created
- [ ] Test accounts funded
- [ ] Example transactions executed

## Rollback

If deployment fails:

```bash
# Revert to previous version
anchor upgrade --provider.cluster devnet target/deploy/smart_wallet.so

# Or redeploy with fixes
anchor deploy --provider.cluster devnet
```

## Monitoring

### Check Program Logs

```bash
# Stream live logs
solana logs 4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5 --url devnet

# Or filter by program
solana logs | grep 4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5
```

### Monitor Transactions

```bash
# Get recent transactions
solana transaction-history 4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5 --url devnet
```

## Next Steps

1. ✅ Deploy to devnet
2. ✅ Verify deployment
3. ✅ Run tests
4. ⬜ Create demo agents
5. ⬜ Execute test transactions
6. ⬜ Record demo video
7. ⬜ Submit to Colosseum
