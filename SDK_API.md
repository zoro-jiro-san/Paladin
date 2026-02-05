# SmartWallet SDK API Reference

## Installation

```bash
npm install @zoro-agents/smart-wallet @solana/web3.js
```

## Quick Start

```typescript
import { SmartWalletClient } from '@zoro-agents/smart-wallet';
import { Connection, PublicKey } from '@solana/web3.js';

const client = new SmartWalletClient({
  programId: new PublicKey('4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5'),
  connection: new Connection('https://api.devnet.solana.com'),
});
```

## SmartWalletClient

Main class for interacting with SmartWallet program.

### Constructor

```typescript
constructor(config: SmartWalletConfig)
```

**Parameters:**
- `config.programId`: PublicKey - SmartWallet program ID
- `config.connection`: Connection - Solana RPC connection
- `config.wallet?`: Wallet - Optional wallet for signing

**Example:**
```typescript
const client = new SmartWalletClient({
  programId: new PublicKey('4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5'),
  connection: new Connection('https://api.devnet.solana.com'),
  wallet: myWallet, // Optional
});
```

### Methods

#### initialize

Create a new SmartWallet.

```typescript
async initialize(
  authority: PublicKey,
  dailyLimit: number,
  vault: PublicKey,
  payer: Signer
): Promise<string>
```

**Parameters:**
- `authority`: PublicKey - Who controls the wallet
- `dailyLimit`: number - Max SOL per day (in lamports)
- `vault`: PublicKey - Account to store funds
- `payer`: Signer - Account that pays transaction fees

**Returns:** Transaction signature (string)

**Example:**
```typescript
const signature = await client.initialize(
  authorityPubkey,
  1_000_000_000, // 1 SOL daily limit
  vaultPubkey,
  payerKeypair
);
console.log('Created:', signature);
```

#### transferSol

Transfer SOL from wallet to recipient.

```typescript
async transferSol(
  wallet: PublicKey,
  recipient: PublicKey,
  amount: number,
  authority: Signer
): Promise<string>
```

**Parameters:**
- `wallet`: PublicKey - SmartWallet account
- `recipient`: PublicKey - Destination address
- `amount`: number - Amount in lamports (1 SOL = 1,000,000,000 lamports)
- `authority`: Signer - Wallet authority

**Returns:** Transaction signature

**Throws:**
- `DailyLimitExceeded` - Transfer exceeds daily limit
- `Unauthorized` - Signer is not wallet authority
- `InsufficientBalance` - Vault doesn't have enough SOL

**Example:**
```typescript
const signature = await client.transferSol(
  walletPubkey,
  recipientPubkey,
  100_000_000, // 0.1 SOL
  authorityKeypair
);
```

#### depositSol

Deposit SOL to wallet vault.

```typescript
async depositSol(
  vault: PublicKey,
  amount: number,
  depositor: Signer
): Promise<string>
```

**Parameters:**
- `vault`: PublicKey - Vault account to receive funds
- `amount`: number - Amount in lamports
- `depositor`: Signer - Who is depositing (must have SOL)

**Returns:** Transaction signature

**Example:**
```typescript
const signature = await client.depositSol(
  vaultPubkey,
  500_000_000, // 0.5 SOL
  depositorKeypair
);
```

#### registerAgent

Register an agent in the registry.

```typescript
async registerAgent(
  agentRegistry: PublicKey,
  agent: PublicKey,
  agentName: string,
  permissions: bigint,
  authority: Signer
): Promise<string>
```

**Parameters:**
- `agentRegistry`: PublicKey - Registry account
- `agent`: PublicKey - Agent's public key
- `agentName`: string - Human-readable name
- `permissions`: bigint - Bitmask of capabilities
  - `0b0001` - Can transfer
  - `0b0010` - Can swap
  - `0b0100` - Can bridge
  - `0b1000` - Can vote
- `authority`: Signer - Registry authority

**Returns:** Transaction signature

**Example:**
```typescript
const signature = await client.registerAgent(
  registryPubkey,
  agentPubkey,
  "Trading Agent",
  BigInt(0b0011), // Can transfer and swap
  authorityKeypair
);
```

#### addPlugin

Add authorization plugin to wallet.

```typescript
async addPlugin(
  wallet: PublicKey,
  plugin: PluginConfig,
  authority: Signer
): Promise<string>
```

**Parameters:**
- `wallet`: PublicKey - SmartWallet account
- `plugin`: PluginConfig - Plugin configuration
- `authority`: Signer - Wallet authority

**Returns:** Transaction signature

**Example:**
```typescript
const dailyLimitPlugin = pluginManager.createDailyLimitPlugin(1_000_000_000);
const signature = await client.addPlugin(
  walletPubkey,
  dailyLimitPlugin,
  authorityKeypair
);
```

#### updateAuthority

Change wallet authority.

```typescript
async updateAuthority(
  wallet: PublicKey,
  newAuthority: PublicKey,
  currentAuthority: Signer
): Promise<string>
```

**Parameters:**
- `wallet`: PublicKey - SmartWallet account
- `newAuthority`: PublicKey - New authority
- `currentAuthority`: Signer - Current authority (must sign)

**Returns:** Transaction signature

**Example:**
```typescript
const signature = await client.updateAuthority(
  walletPubkey,
  newAuthorityPubkey,
  currentAuthorityKeypair
);
```

#### updateDailyLimit

Update daily spending limit.

```typescript
async updateDailyLimit(
  wallet: PublicKey,
  newLimit: number,
  authority: Signer
): Promise<string>
```

**Parameters:**
- `wallet`: PublicKey - SmartWallet account
- `newLimit`: number - New daily limit in lamports
- `authority`: Signer - Wallet authority

**Returns:** Transaction signature

**Example:**
```typescript
const signature = await client.updateDailyLimit(
  walletPubkey,
  2_000_000_000, // 2 SOL
  authorityKeypair
);
```

#### getWallet

Query wallet account data.

```typescript
async getWallet(wallet: PublicKey): Promise<SmartWalletData>
```

**Parameters:**
- `wallet`: PublicKey - SmartWallet account address

**Returns:** Wallet account data

**Example:**
```typescript
const walletData = await client.getWallet(walletPubkey);
console.log('Authority:', walletData.authority);
console.log('Daily Limit:', walletData.dailyLimit / 1_000_000_000, 'SOL');
console.log('Spent Today:', walletData.spentToday / 1_000_000_000, 'SOL');
```

#### getAgentRegistry

Query agent registry data.

```typescript
async getAgentRegistry(registry: PublicKey): Promise<RegistryData>
```

**Parameters:**
- `registry`: PublicKey - AgentRegistry account

**Returns:** Registry account data with all agents

**Example:**
```typescript
const registryData = await client.getAgentRegistry(registryPubkey);
for (const [agentKey, metadata] of registryData.agents) {
  console.log(`Agent: ${metadata.name} (${agentKey})`);
}
```

## PluginManager

Simplifies plugin creation and management.

### Constructor

```typescript
constructor(client: SmartWalletClient, wallet: PublicKey)
```

**Parameters:**
- `client`: SmartWalletClient - The client instance
- `wallet`: PublicKey - The SmartWallet to manage plugins for

### Methods

#### createDailyLimitPlugin

Create a daily spending limit plugin.

```typescript
createDailyLimitPlugin(limitLamports: number): PluginConfig
```

**Parameters:**
- `limitLamports`: number - Max daily spend in lamports

**Returns:** PluginConfig ready to add

**Example:**
```typescript
const plugin = pluginManager.createDailyLimitPlugin(1_000_000_000);
// Plugin type: "daily-limit"
// Config: 8-byte encoded limit
```

#### createWhitelistPlugin

Create a recipient whitelist plugin.

```typescript
createWhitelistPlugin(allowedAddresses: PublicKey[]): PluginConfig
```

**Parameters:**
- `allowedAddresses`: PublicKey[] - List of allowed recipients

**Returns:** PluginConfig ready to add

**Example:**
```typescript
const whitelist = [agentAddress1, agentAddress2, treasuryAddress];
const plugin = pluginManager.createWhitelistPlugin(whitelist);
```

#### createRateLimitPlugin

Create a transaction rate limit plugin.

```typescript
createRateLimitPlugin(maxTransfersPerHour: number): PluginConfig
```

**Parameters:**
- `maxTransfersPerHour`: number - Max transactions per hour

**Returns:** PluginConfig ready to add

**Example:**
```typescript
const plugin = pluginManager.createRateLimitPlugin(100);
```

#### addPlugin

Add plugin to wallet.

```typescript
async addPlugin(
  plugin: PluginConfig,
  authority: Signer
): Promise<string>
```

**Parameters:**
- `plugin`: PluginConfig - Plugin to add
- `authority`: Signer - Wallet authority

**Returns:** Transaction signature

**Example:**
```typescript
const plugin = pluginManager.createDailyLimitPlugin(5_000_000_000);
const signature = await pluginManager.addPlugin(plugin, authorityKeypair);
```

## AgentRegistry

Client for agent registration and lookup.

### Constructor

```typescript
constructor(client: SmartWalletClient, registryPda: PublicKey)
```

**Parameters:**
- `client`: SmartWalletClient - The client instance
- `registryPda`: PublicKey - Registry account address

### Methods

#### registerAgent

Register a new agent.

```typescript
async registerAgent(
  agent: PublicKey,
  agentName: string,
  permissions: bigint,
  authority: Signer
): Promise<string>
```

**Parameters:**
- `agent`: PublicKey - Agent's public key
- `agentName`: string - Human-readable name (max 255 chars)
- `permissions`: bigint - Permission bitmask
- `authority`: Signer - Registry authority

**Returns:** Transaction signature

**Example:**
```typescript
const signature = await registry.registerAgent(
  agentKeypair.publicKey,
  "Arbitrage Bot",
  BigInt(0b0011),
  authorityKeypair
);
```

#### getRegistry

Get all agents in registry.

```typescript
async getRegistry(): Promise<RegistryData>
```

**Returns:** Registry data with all agents

**Example:**
```typescript
const registry = await agentRegistry.getRegistry();
console.log(`Total agents: ${registry.agents.size}`);
```

## Types

### SmartWalletConfig

```typescript
interface SmartWalletConfig {
  programId: PublicKey;
  connection: Connection;
  wallet?: any;
}
```

### PluginConfig

```typescript
interface PluginConfig {
  type: "daily-limit" | "whitelist" | "rate-limit" | "multi-sig" | "custom";
  config: Buffer;
}
```

### TransferOptions

```typescript
interface TransferOptions {
  from: PublicKey;
  to: PublicKey;
  amount: number;
  signer: Signer;
}
```

## Constants

### Lamports Conversion

```typescript
// 1 SOL = 1,000,000,000 lamports
const SOL_TO_LAMPORTS = 1_000_000_000;

// Examples:
const 0_5_SOL = 500_000_000;    // 0.5 SOL
const 1_SOL = 1_000_000_000;    // 1 SOL
const 10_SOL = 10_000_000_000;  // 10 SOL
```

### Devnet Configuration

```typescript
const DEVNET_CONFIG = {
  programId: '4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5',
  rpcEndpoint: 'https://api.devnet.solana.com',
};
```

## Error Handling

### Error Codes

```typescript
// Program errors (from-chain)
6000: DailyLimitExceeded
6001: Unauthorized
6002: InvalidAmount
6003: PluginValidationFailed
6004: InsufficientBalance

// SDK errors (client-side)
'Program not initialized'
'Invalid PublicKey'
'Insufficient balance for transaction fees'
```

### Error Handling Pattern

```typescript
try {
  const signature = await client.transferSol(...);
} catch (error: any) {
  if (error.code === 6000) {
    console.error('Daily limit exceeded');
  } else if (error.code === 6001) {
    console.error('Unauthorized access');
  } else if (error.message.includes('Insufficient balance')) {
    console.error('Not enough SOL for fees');
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Examples

### Complete Wallet Setup

```typescript
import { SmartWalletClient, PluginManager, AgentRegistry } from '@zoro-agents/smart-wallet';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

async function setupWallet() {
  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com');
  const client = new SmartWalletClient({
    programId: new PublicKey('4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5'),
    connection,
  });

  // Create keypairs (in production, use secure key management)
  const owner = Keypair.generate();
  const vault = Keypair.generate();
  const payer = Keypair.generate();

  // Fund payer with SOL (use faucet in production)
  // await connection.requestAirdrop(payer.publicKey, 10 * LAMPORTS_PER_SOL);

  // 1. Initialize wallet
  const initTx = await client.initialize(
    owner.publicKey,
    1 * LAMPORTS_PER_SOL, // 1 SOL daily limit
    vault.publicKey,
    payer
  );
  console.log('Wallet created:', initTx);

  // 2. Add plugins
  const pluginManager = new PluginManager(client, vault.publicKey);
  const dailyLimitPlugin = pluginManager.createDailyLimitPlugin(1 * LAMPORTS_PER_SOL);
  const addPluginTx = await pluginManager.addPlugin(dailyLimitPlugin, owner);
  console.log('Plugin added:', addPluginTx);

  // 3. Deposit SOL
  const depositTx = await client.depositSol(
    vault.publicKey,
    5 * LAMPORTS_PER_SOL,
    payer
  );
  console.log('Deposit completed:', depositTx);

  // 4. Query wallet
  const walletData = await client.getWallet(vault.publicKey);
  console.log('Wallet state:', walletData);

  return { client, walletAddress: vault.publicKey, owner };
}
```

### Agent Transfer

```typescript
async function agentTransfer(
  client: SmartWalletClient,
  walletAddress: PublicKey,
  agentAuthority: Keypair,
  recipientAddress: PublicKey
) {
  const transferAmount = 0.1 * LAMPORTS_PER_SOL;
  
  const signature = await client.transferSol(
    walletAddress,
    recipientAddress,
    transferAmount,
    agentAuthority
  );
  
  console.log('Transfer completed:', signature);
  return signature;
}
```

## FAQ

### How do I convert SOL to lamports?

```typescript
const sol = 1.5;
const lamports = sol * LAMPORTS_PER_SOL; // 1,500,000,000
```

### How do I verify a transaction?

```typescript
const connection = new Connection('https://api.devnet.solana.com');
const signature = 'your-signature-here';
const status = await connection.getSignatureStatus(signature);
console.log(status);
```

### How do I derive wallet address?

```typescript
const [walletPda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from('wallet'), authority.toBuffer()],
  programId
);
```

### How do I increase daily limit?

```typescript
const newLimit = 10 * LAMPORTS_PER_SOL; // 10 SOL
const signature = await client.updateDailyLimit(
  walletAddress,
  newLimit,
  authorityKeypair
);
```

### Can I batch multiple transfers?

```typescript
// Not directly in this version, but can be done via:
// - Multiple separate transactions
// - Custom instructions via Anchor Provider
// - Future version will support batching
```

## Support

- **GitHub**: https://github.com/zoro-jiro-san/smart-wallet
- **Issues**: Report bugs at GitHub Issues
- **Discussions**: Ask questions at GitHub Discussions

## License

MIT
