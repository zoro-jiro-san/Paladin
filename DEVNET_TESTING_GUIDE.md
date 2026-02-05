# SmartWallet DevNet Testing Guide

**Version:** 1.0  
**Date:** February 6, 2026  
**Target:** Solana Devnet  
**Program ID:** `4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5`

---

## Quick Start

After deployment is complete, follow these steps to verify and test the SmartWallet program on devnet.

### 1. Verify Deployment

```bash
# Check if program exists on devnet
solana program show 4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5 --url devnet

# Expected output:
# Program ID: 4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5
# Owner: BPFLoaderUpgradeab1e11111111111111111111111
# ...
```

### 2. View on Explorer

Open in browser:
```
https://explorer.solana.com/address/4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5?cluster=devnet
```

---

## Test Scenarios

### Scenario 1: Initialize Wallet (Instruction 1)

**What it tests:** Wallet creation with authority and daily limits

```typescript
const authority = Keypair.generate();
const vault = Keypair.generate().publicKey;
const dailyLimit = 100 * LAMPORTS_PER_SOL; // 100 SOL

const tx = await client.initializeWallet({
  authority: authority,
  vault: vault,
  dailyLimit: dailyLimit,
});
```

**Expected Result:**
- Wallet account created
- Authority set correctly
- Daily limit = 100 SOL
- Spent today = 0

**Verification:**
- Account exists at computed PDA
- State matches initialization parameters
- Authority can perform operations

---

### Scenario 2: Deposit SOL (Instruction 3)

**What it tests:** Funding wallet vault

```typescript
const depositor = Keypair.generate();
const depositAmount = 50 * LAMPORTS_PER_SOL; // 50 SOL

const tx = await client.depositSol({
  amount: depositAmount,
  depositor: depositor,
  vault: vaultPDA,
});
```

**Expected Result:**
- Vault balance increases by deposit amount
- Event emitted: DepositEvent
- No authorization required (anyone can deposit)

**Verification:**
- Vault balance = 50 SOL
- Event log shows deposit
- Transaction confirmed on-chain

---

### Scenario 3: Transfer SOL (Instruction 2)

**What it tests:** Controlled transfers with daily limits

```typescript
const recipient = Keypair.generate().publicKey;
const transferAmount = 10 * LAMPORTS_PER_SOL; // 10 SOL

const tx = await client.transferSol({
  amount: transferAmount,
  authority: authority,
  recipient: recipient,
  wallet: walletPDA,
});
```

**Expected Result:**
- Recipient receives 10 SOL
- spent_today increases to 10 SOL
- Event emitted: TransferEvent
- Authority signature required

**Verification:**
- Recipient balance increases by 10 SOL
- wallet.spent_today = 10 SOL
- Transaction confirmed
- Event in logs

**Daily Limit Test:**
- Try to transfer 100 SOL (at 10 already spent, would exceed 100 limit)
- Should succeed
- Try to transfer 1 more SOL (would exceed limit)
- Should fail with DailyLimitExceeded error

---

### Scenario 4: Register Agent (Instruction 4)

**What it tests:** Agent registry functionality

```typescript
const agent = Keypair.generate();
const agentName = "TestAgent-001";
const permissions = 1; // Full permissions

const tx = await client.registerAgent({
  agent: agent.publicKey,
  name: agentName,
  permissions: permissions,
});
```

**Expected Result:**
- Agent registered in registry
- Metadata stored: name, pubkey, timestamp, permissions
- Initial reputation score = 0
- Verified status = false

**Verification:**
- Query agent registry account
- Agent entry exists
- All metadata correct
- Can register multiple agents

---

### Scenario 5: Add Plugin (Instruction 5)

**What it tests:** Plugin system

**Daily Limit Plugin:**
```typescript
const plugin = pm.createDailyLimitPlugin({
  limit: 50 * LAMPORTS_PER_SOL,
  resetInterval: 86400,
});
```

**Whitelist Plugin:**
```typescript
const plugin = pm.createWhitelistPlugin({
  addresses: [agent1.publicKey, agent2.publicKey],
});
```

**Rate Limit Plugin:**
```typescript
const plugin = pm.createRateLimitPlugin({
  maxTransfers: 10,
  windowSeconds: 3600,
});
```

**Expected Result:**
- Plugin stored in wallet.plugins vector
- Plugin validation passes
- Plugin rules enforced on transfers

**Verification:**
- Plugin count increases
- Each plugin type configurable
- Multiple plugins supported
- Plugins persist across transactions

---

### Scenario 6: Update Authority (Instruction 6)

**What it tests:** Authority changes

```typescript
const newAuthority = Keypair.generate().publicKey;

const tx = await client.updateAuthority({
  wallet: walletPDA,
  currentAuthority: oldAuthority,
  newAuthority: newAuthority,
});
```

**Expected Result:**
- wallet.authority = newAuthority
- Old authority loses control
- New authority can perform operations

**Verification:**
- Old authority transfers fail
- New authority can transfer
- Event logged on-chain

---

### Scenario 7: Update Daily Limit (Instruction 7)

**What it tests:** Dynamic limit updates

```typescript
const newLimit = 200 * LAMPORTS_PER_SOL;

const tx = await client.updateDailyLimit({
  wallet: walletPDA,
  authority: authority,
  newLimit: newLimit,
});
```

**Expected Result:**
- wallet.daily_limit = newLimit
- spent_today resets (optional implementation detail)
- New transfers respect new limit

**Verification:**
- Can transfer more after limit increase
- Transfer blocked after limit decrease
- Authority required to change

---

## Error Scenarios to Test

### Error 1: DailyLimitExceeded

```typescript
// Setup: daily_limit = 100 SOL, spent_today = 95 SOL
// Try to transfer 10 SOL (would total 105)

const tx = await client.transferSol({
  amount: 10 * LAMPORTS_PER_SOL,
  authority: authority,
  recipient: someAddress,
  wallet: walletPDA,
});

// Expected: Transaction fails with SmartWalletError::DailyLimitExceeded
```

### Error 2: Unauthorized

```typescript
// Try to transfer with wrong authority
const wrongAuthority = Keypair.generate();

const tx = await client.transferSol({
  amount: 10 * LAMPORTS_PER_SOL,
  authority: wrongAuthority.publicKey,
  recipient: someAddress,
  wallet: walletPDA,
});

// Expected: Transaction fails with SmartWalletError::Unauthorized
```

### Error 3: InvalidAmount

```typescript
// Try to transfer 0 or negative amount
const tx = await client.transferSol({
  amount: 0,
  authority: authority,
  recipient: someAddress,
  wallet: walletPDA,
});

// Expected: Transaction fails with SmartWalletError::InvalidAmount
```

### Error 4: InsufficientBalance

```typescript
// Try to transfer more than vault contains
const tx = await client.transferSol({
  amount: 1000 * LAMPORTS_PER_SOL, // vault only has 100 SOL
  authority: authority,
  recipient: someAddress,
  wallet: walletPDA,
});

// Expected: Transaction fails with SmartWalletError::InsufficientBalance
```

---

## Multi-Agent Test Scenarios

### Scenario A: Chain Transfers

**Setup:**
- Agent A: Authority, 100 SOL vault
- Agent B: Recipient of A's transfer
- Agent C: Recipient of B's transfer
- Agent D: Final recipient

**Execution:**
```
A → B (10 SOL)
B → C (10 SOL)
C → D (10 SOL)
```

**Expected:**
- A: 90 SOL remaining
- B: Received 10, spent 10 = 0
- C: Received 10, spent 10 = 0
- D: Received 10

**Verification:**
- All transfers confirmed
- All daily limits respected
- Final balances correct

### Scenario B: Circular Transfers

**Setup:**
- 5 agents with 20 SOL each
- Connected in a circle

**Execution:**
```
Agent1 → Agent2 (5 SOL)
Agent2 → Agent3 (5 SOL)
Agent3 → Agent4 (5 SOL)
Agent4 → Agent5 (5 SOL)
Agent5 → Agent1 (5 SOL)
```

**Expected:**
- Money circulates through agents
- Each agent net = 0 change (all spent 5, all received 5)
- All daily limits respected

---

## Performance Metrics to Measure

### Transaction Metrics
- **Confirmation Time:** How long until transaction confirmed
- **Gas Cost:** Transaction fee in lamports
- **Throughput:** Transactions per second

### Account Metrics
- **Account Size:** Data account size
- **Account Rent:** Rent for 2-year storage
- **State Serialization:** Time to read/write state

### Network Metrics
- **RPC Latency:** Time to get response
- **Block Time:** Average block time on devnet
- **Slot Height:** Current slot height

---

## Test Checklist

### Basic Functionality
- [ ] Wallet initialization
- [ ] Deposit SOL
- [ ] Transfer SOL
- [ ] Register agent
- [ ] Add plugin
- [ ] Update authority
- [ ] Update daily limit

### Error Handling
- [ ] DailyLimitExceeded error
- [ ] Unauthorized error
- [ ] InvalidAmount error
- [ ] InsufficientBalance error

### Plugin System
- [ ] Daily limit plugin enforces limit
- [ ] Whitelist plugin restricts recipients
- [ ] Rate limit plugin limits transaction frequency
- [ ] Multiple plugins work together

### Multi-Agent
- [ ] 5+ agents transact simultaneously
- [ ] Chain transfers work
- [ ] Circular transfers work
- [ ] Authority transfers between agents

### Limits & Edge Cases
- [ ] Zero amount rejected
- [ ] Very large amounts handled
- [ ] Daily limit reset after 24 hours
- [ ] Account initialization idempotent

### Security
- [ ] Authority spoofing prevented
- [ ] Unauthorized transfers rejected
- [ ] Plugin validation enforced
- [ ] Vault protection verified

### Performance
- [ ] Transactions complete < 5 seconds
- [ ] 10+ transactions per second
- [ ] Memory efficient
- [ ] State mutations correct

---

## Troubleshooting

### Issue: "Program not found"

```
Error: Program at 4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5 not found
```

**Solution:**
- Check deployment completed successfully
- Verify cluster is set to devnet: `solana config get`
- Wait 5-10 seconds for confirmation
- Check explorer: https://explorer.solana.com/address/.../account?cluster=devnet

### Issue: "Insufficient funds"

```
Error: Insufficient fund for account creation
```

**Solution:**
- Request more devnet SOL: `solana airdrop 10`
- Use alternative faucet: https://faucet.devnet.solana.com
- Wait for airdrop to complete
- Check balance: `solana balance`

### Issue: "Daily limit exceeded" (unexpected)

```
Error: DailyLimitExceeded at unexpected time
```

**Solution:**
- Check current spent_today: Query wallet account
- Check current time vs last_reset
- May be in a different calendar day
- Reset timestamp is unix_timestamp, not calendar based

### Issue: "Transaction timeout"

```
Error: Transaction not confirmed within 30 seconds
```

**Solution:**
- Check network health: `solana health`
- Try again in 10 seconds
- Use different RPC endpoint
- Check transaction on explorer by signature

---

## Advanced Testing

### Load Testing

```bash
# Send 100 transactions rapidly
for i in {1..100}; do
  # Build and send transfer transaction
  echo "Transfer $i"
done
```

### Stress Testing

- Transfer max amount: `u64::MAX`
- Register all addresses in agent registry
- Add maximum plugins
- Run for extended period

### Fuzzing

- Random transfer amounts
- Random recipient addresses
- Random plugin configurations
- Random account order in transactions

---

## Success Criteria

✅ **Deployment Verified**
- Program exists on devnet
- Program ID correct
- Explorer shows deployed code

✅ **All 7 Instructions Work**
- Initialize wallet ✓
- Transfer SOL ✓
- Deposit SOL ✓
- Register agent ✓
- Add plugin ✓
- Update authority ✓
- Update daily limit ✓

✅ **Error Handling**
- Daily limit enforcement ✓
- Authorization checks ✓
- Invalid amount rejection ✓
- Insufficient balance prevention ✓

✅ **Plugin System**
- Daily limit plugin works ✓
- Whitelist plugin works ✓
- Rate limit plugin works ✓
- Multiple plugins together ✓

✅ **Multi-Agent Scenarios**
- 5+ agents can transact ✓
- Chain transfers work ✓
- Circular transfers work ✓

✅ **Performance**
- Transactions < 5s ✓
- 10+ TPS achievable ✓
- No state corruption ✓

---

## Next Steps

1. Wait for deployment to complete
2. Verify deployment on explorer
3. Run test scenarios in order
4. Execute multi-agent demo
5. Measure and record performance metrics
6. Document all results
7. Generate final report

---

**Version:** 1.0  
**Last Updated:** Feb 6, 2026  
**Status:** Ready for testing after deployment
