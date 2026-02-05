# SmartWallet Architecture

## Overview

SmartWallet is a modular, plugin-based smart wallet for AI agents on Solana. The architecture consists of three main layers:

1. **On-Chain Layer** (Rust/Anchor Program)
2. **SDK Layer** (TypeScript)
3. **Application Layer** (User-facing code)

```
┌─────────────────────────────────────────────────────────┐
│                  Application Layer                       │
│  (Agent Bots, DeFi Integrations, Autonomous Services)   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 TypeScript SDK Layer                     │
│  (SmartWalletClient, PluginManager, AgentRegistry)      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              On-Chain Program Layer (Rust)               │
│  (Solana Program, PDAs, Accounts, Instructions)         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Solana Blockchain (Devnet)                  │
└─────────────────────────────────────────────────────────┘
```

## On-Chain Architecture

### Accounts

#### SmartWallet Account

Main account that holds wallet state and configuration.

```rust
pub struct SmartWallet {
    pub authority: Pubkey,           // Who controls the wallet
    pub vault: Pubkey,               // Where funds are stored
    pub daily_limit: u64,            // Max spend per day (lamports)
    pub spent_today: u64,            // Already spent today (lamports)
    pub last_reset: i64,             // Timestamp of last daily reset
    pub nonce: u64,                  // Transaction counter
    pub bump: u8,                    // PDA bump seed
    pub plugins: Vec<PluginConfig>,  // Active authorization plugins
}
```

**Size:** ~256 bytes  
**Account Type:** PDA (Program-Derived Address)  
**Derived from:** `["wallet", authority.pubkey]`

**Key Operations:**
- Initialize wallet with daily limit
- Update spent amount
- Manage plugins
- Reset daily limit
- Change authority

#### AgentRegistry Account

On-chain registry of authorized agents.

```rust
pub struct AgentRegistry {
    pub agents: HashMap<Pubkey, AgentMetadata>,
}

pub struct AgentMetadata {
    pub pubkey: Pubkey,              // Agent's public key
    pub name: String,                // Human-readable name
    pub owner: Pubkey,               // Who registered this agent
    pub created_at: i64,             // Registration timestamp
    pub verified: bool,              // KYC verified?
    pub reputation_score: u32,       // Community votes
    pub permissions: u64,            // Bitmask of capabilities
}
```

**Size:** Variable (~100+ bytes per agent)  
**Account Type:** PDA  
**Derived from:** `["registry", program_id]`

**Permissions (Bitmask):**
- `0b0001` - Can transfer
- `0b0010` - Can swap
- `0b0100` - Can bridge
- `0b1000` - Can vote/govern

### Instructions

#### 1. `initialize(authority, daily_limit)`

Creates a new SmartWallet.

```
Authority: Signer
Accounts:
  - SmartWallet (new PDA, writable)
  - Vault (existing account for funds)
  - Payer (signer, pays rent)
  - SystemProgram

Effects:
  - Create SmartWallet PDA
  - Set authority
  - Set daily limit to 0
  - Initialize plugins vector
```

#### 2. `transfer_sol(amount)`

Transfer SOL from wallet to recipient.

```
Authority: Signer
Accounts:
  - SmartWallet (writable)
  - Vault (writable, where funds come from)
  - Recipient (writable, receives funds)
  - Authority (signer)
  - SystemProgram

Validations:
  ✓ Amount > 0
  ✓ Signer is authority
  ✓ Spent today + amount <= daily_limit
  ✓ Vault has sufficient balance
  ✓ All plugins approve

Effects:
  - Transfer SOL from vault to recipient
  - Update spent_today
  - Increment nonce
  - Emit TransferEvent
```

#### 3. `deposit_sol(amount)`

Deposit SOL to wallet vault.

```
Accounts:
  - Vault (writable, receives funds)
  - Depositor (writable, signer, sends funds)
  - SystemProgram

Effects:
  - Transfer SOL from depositor to vault
  - Emit DepositEvent
```

#### 4. `register_agent(agent_name, permissions)`

Register a new agent.

```
Authority: Signer
Accounts:
  - AgentRegistry (writable)
  - Agent (signer, the agent being registered)
  - Authority (signer)

Effects:
  - Add agent to registry
  - Set permissions
  - Record creation timestamp
```

#### 5. `add_plugin(plugin_type, config)`

Add authorization plugin to wallet.

```
Authority: Signer
Accounts:
  - SmartWallet (writable)
  - Authority (signer)

Parameters:
  - plugin_type: DailyLimit | Whitelist | RateLimit | MultiSig | Custom
  - config: Custom plugin data

Effects:
  - Append plugin to wallet.plugins
  - Plugin becomes immediately active
```

#### 6. `update_authority(new_authority)`

Change wallet authority.

```
Authority: Signer
Accounts:
  - SmartWallet (writable)
  - Authority (signer, current authority)

Effects:
  - Update SmartWallet.authority
  - Previous authority loses control
```

#### 7. `update_daily_limit(new_limit)`

Adjust daily spending limit.

```
Authority: Signer
Accounts:
  - SmartWallet (writable)
  - Authority (signer)

Effects:
  - Update daily_limit
  - Keep spent_today unchanged
```

### Plugin System

Plugins provide extensible authorization. Each plugin validates transactions.

#### Plugin Types

```rust
pub enum PluginType {
    DailyLimit,     // Enforce daily spending cap
    Whitelist,      // Restrict recipients
    RateLimit,      // Limit transactions/hour
    MultiSig,       // Require N-of-M approvals
    Custom,         // Custom validation logic
}
```

#### Plugin Config Format

```rust
pub struct PluginConfig {
    pub plugin_type: PluginType,
    pub config: Vec<u8>,            // Custom binary data
    pub enabled: bool,
}
```

#### Daily Limit Plugin Example

```
Type: DailyLimit
Config (8 bytes, Big-Endian):
  ┌────────────────────────┐
  │   Limit (u64)          │
  │   Max lamports/day     │
  └────────────────────────┘

Example: 1 SOL daily limit
  Hex: 0x00000000 3B9ACA00
  Dec: 1,000,000,000 lamports
```

#### Whitelist Plugin Example

```
Type: Whitelist
Config:
  ┌────────────────────────┐
  │  Count (u32)           │  (4 bytes)
  ├────────────────────────┤
  │  Address 1 (32 bytes)  │
  ├────────────────────────┤
  │  Address 2 (32 bytes)  │
  └────────────────────────┘

Example: 2 whitelisted addresses
  Length: 4 + (2 * 32) = 68 bytes
```

### State Transitions

```
Initialize
    ↓
    SmartWallet created
    ├─→ Daily Limit = config value
    ├─→ Spent Today = 0
    ├─→ Plugins = []
    └─→ Authority = setter
         ↓
         Transfer
         ├─→ Validate amount
         ├─→ Run plugins
         ├─→ Check daily limit
         └─→ Update spent_today
              ↓
              Deposit
              ├─→ Add to vault
              └─→ Emit event
              
         Reset (daily)
         ├─→ Reset spent_today to 0
         └─→ Update last_reset timestamp
              
         Plugin Management
         ├─→ Add Plugin
         ├─→ Remove Plugin
         └─→ Modify Plugin

         Update Settings
         ├─→ Change daily_limit
         ├─→ Change authority
         └─→ Modify permissions
```

## SDK Architecture

### SmartWalletClient

High-level API for interacting with SmartWallet program.

```typescript
class SmartWalletClient {
  // Configuration
  programId: PublicKey
  connection: Connection
  provider?: AnchorProvider
  program?: Program

  // Initialization
  initialize(authority, dailyLimit, vault, payer): Promise<string>
  
  // Transfers
  transferSol(wallet, recipient, amount, authority): Promise<string>
  depositSol(vault, amount, depositor): Promise<string>
  
  // Agent Management
  registerAgent(registry, agent, name, permissions, authority): Promise<string>
  
  // Plugins
  addPlugin(wallet, plugin, authority): Promise<string>
  
  // Settings
  updateAuthority(wallet, newAuthority, authority): Promise<string>
  updateDailyLimit(wallet, newLimit, authority): Promise<string>
  
  // Queries
  getWallet(wallet): Promise<SmartWalletData>
  getAgentRegistry(registry): Promise<RegistryData>
  
  // Helpers
  derivePda(seeds, programId): [PublicKey, number]
}
```

### PluginManager

Simplifies plugin creation and management.

```typescript
class PluginManager {
  client: SmartWalletClient
  wallet: PublicKey

  createDailyLimitPlugin(limitLamports): PluginConfig
  createWhitelistPlugin(addresses): PluginConfig
  createRateLimitPlugin(maxPerHour): PluginConfig
  addPlugin(plugin, authority): Promise<string>
}
```

### AgentRegistry

Client for agent registration and lookup.

```typescript
class AgentRegistry {
  client: SmartWalletClient
  registryPda: PublicKey

  registerAgent(agent, name, permissions, authority): Promise<string>
  getRegistry(): Promise<RegistryData>
}
```

### IDL (Interface Definition Language)

The IDL is generated from the Rust program and provides:
- Account layout definitions
- Instruction signatures
- Event schemas
- Error codes

Used by TypeScript SDK for type safety and serialization.

## Data Flow

### Transfer Flow

```
1. Application calls: client.transferSol(...)
                       ↓
2. SDK validates inputs
   - Check amount > 0
   - Verify recipient is Pubkey
                       ↓
3. SDK prepares transaction
   - Serialize parameters
   - Create transaction instruction
   - Add accounts
                       ↓
4. SDK signs with signer
   - Request signature from authority
                       ↓
5. SDK submits to network
   - Send via RPC endpoint
                       ↓
6. Program receives instruction
   - Deserialize inputs
   - Load SmartWallet account
                       ↓
7. Program validates
   - Check authority signature
   - Run plugins
   - Verify daily limit
                       ↓
8. Program executes
   - Transfer SOL
   - Update state
   - Emit event
                       ↓
9. Transaction confirmed
   - SDK returns signature
   - Application receives confirmation
```

### Account Lookup Flow

```
SmartWallet Address Derivation
  ├─ Input: authority Pubkey
  ├─ Seeds: ["wallet", authority.toBuffer()]
  ├─ Program ID: SmartWallet program ID
  └─ Output: SmartWallet PDA

Agent Lookup
  ├─ Query AgentRegistry PDA
  ├─ HashMap lookup: agent Pubkey → AgentMetadata
  └─ Return agent info
```

## Error Handling

### Program Errors

```rust
#[error_code]
pub enum SmartWalletError {
    DailyLimitExceeded,
    Unauthorized,
    InvalidAmount,
    PluginValidationFailed,
    InsufficientBalance,
}
```

### SDK Error Handling

TypeScript SDK catches and translates program errors:

```typescript
try {
  await client.transferSol(...)
} catch (error) {
  if (error.code === 6000) {
    // DailyLimitExceeded
  } else if (error.code === 6001) {
    // Unauthorized
  }
  // ... other error handling
}
```

## Security Considerations

### Program Safety

1. **Authority Check**: All state-modifying operations require signer authority
2. **Overflow Protection**: All arithmetic uses checked operations
3. **Plugin Validation**: Each plugin can veto transactions
4. **Daily Limit**: Enforced at program level, resistant to time manipulation
5. **PDA Separation**: Vault separated from wallet metadata

### SDK Safety

1. **Type Safety**: TypeScript strict mode prevents type errors
2. **Input Validation**: Check amounts, addresses before submission
3. **Signer Management**: Private keys never leave signer
4. **Error Handling**: Comprehensive error recovery

### Deployment Safety

1. **Program Verification**: Anchor verifiable builds
2. **Test Coverage**: 80%+ code coverage required
3. **Audit Checklist**: Security review before deployment
4. **Gradual Rollout**: Devnet → Testnet → Mainnet

## Scalability

### On-Chain Scalability

- **Account Size**: SmartWallet ~256 bytes, scales with plugins
- **Instruction Size**: Fixed transaction sizes per instruction
- **State Complexity**: HashMap for agents scales to thousands

### SDK Scalability

- **Concurrent Requests**: SDK supports parallel transactions
- **Batch Operations**: Can batch multiple instructions
- **Rate Limiting**: SDK enforces rate limiting per wallet

## Future Enhancements

1. **Multi-Sig Plugins**: N-of-M approval for high-value transfers
2. **NFT Support**: Transfer NFTs in addition to SOL/SPL tokens
3. **Cross-Chain Bridges**: Bridge wallets to Polygon/Ethereum
4. **DAO Governance**: Agent voting on fund allocation
5. **Reputation System**: On-chain reputation scores
6. **Upgradeable Plugins**: Deploy new plugin logic without redeploying program

## Integration Points

### With DeFi Protocols

SmartWallet can integrate with:
- **Jupiter**: Token swaps
- **Raydium**: AMM liquidity
- **Magic Eden**: NFT trading
- **Lending Protocols**: Collateral management

### With Agent Frameworks

- **OpenClaw**: Native integration for agents
- **Langchain**: Custom tools for SmartWallet
- **Custom Bots**: Direct SDK usage

## Testing Strategy

### Unit Tests

- Account initialization
- Daily limit enforcement
- Plugin validation
- Error cases

### Integration Tests

- Full transfer flow
- Agent registration
- Plugin interactions
- Multi-agent scenarios

### End-to-End Tests

- Devnet deployment
- Real transactions
- Performance benchmarks

## Monitoring & Observability

### On-Chain Events

- `TransferEvent`: Logged for all transfers
- `DepositEvent`: Logged for all deposits
- Custom plugin events

### SDK Logging

- Transaction submission
- Confirmation waiting
- Error details

### Devnet Explorer

All transactions visible on:
- https://explorer.solana.com/?cluster=devnet
- Transaction logs and program output
- Account state history
