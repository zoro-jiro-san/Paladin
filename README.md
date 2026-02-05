# SmartWallet - AI Agent Smart Wallet for Solana

A programmable smart wallet for AI agents on Solana with plugin architecture, authorization layers, and autonomous payment capabilities.

## Features

- 🤖 **Agent-First Design** - Built for autonomous agents, not just humans
- 🔌 **Plugin Architecture** - Extensible authorization plugins (daily limits, whitelist, rate limiting, multi-sig)
- 📋 **Agent Registry** - On-chain proof of agent identity and delegation
- 💰 **Autonomous Payments** - Agents can transact without human approval (within authorized limits)
- 🔐 **Multi-Sig Support** - Teams of agents can share a wallet
- ⚡ **Solana Native** - Fast, cheap transactions on Solana devnet

## Project Structure

```
smart-wallet/
├── programs/smart-wallet/     # Rust Anchor program
│   ├── src/
│   │   └── lib.rs             # Main program logic
│   └── Cargo.toml
├── sdk/                        # TypeScript SDK
│   ├── src/
│   │   ├── index.ts           # SmartWalletClient, PluginManager, AgentRegistry
│   │   └── idl.ts             # Program IDL
│   ├── tests/                 # SDK tests
│   └── package.json
├── tests/                      # Integration tests
└── README.md
```

## Building

### Prerequisites

- Rust 1.93.0+
- Solana CLI 1.18.20+
- Anchor CLI 0.29.0+
- Node.js 18+ (for SDK)

### Build Anchor Program

```bash
cd programs/smart-wallet
anchor build
```

### Build TypeScript SDK

```bash
cd sdk
npm install
npm run build
```

## Testing

### Unit Tests (Rust)

```bash
anchor test
```

### SDK Tests (TypeScript)

```bash
cd sdk
npm test
```

## Deployment

Deploy to Solana devnet:

```bash
anchor deploy --provider.cluster devnet
```

## Usage

### TypeScript SDK Example

```typescript
import { Connection, PublicKey } from "@solana/web3.js";
import { SmartWalletClient, PluginManager } from "@zoro-agents/smart-wallet";

// Initialize client
const connection = new Connection("https://api.devnet.solana.com");
const client = new SmartWalletClient({
  programId: new PublicKey("YOUR_PROGRAM_ID"),
  connection,
});

// Create a wallet
await client.initialize(
  authority,
  1000000000, // 1 SOL daily limit
  vault,
  payer
);

// Add a daily limit plugin
const pluginManager = new PluginManager(client, walletAddress);
const plugin = pluginManager.createDailyLimitPlugin(1000000000);
await pluginManager.addPlugin(plugin, authority);

// Transfer SOL
await client.transferSol(
  walletAddress,
  recipientAddress,
  100000000, // 0.1 SOL
  authority
);
```

## Architecture

### Anchor Program (Rust)

**Accounts:**
- `SmartWallet` - Main wallet account with authority, vault, daily limits, plugins
- `AgentRegistry` - On-chain registry of agents and their metadata

**Instructions:**
- `initialize` - Create a new SmartWallet
- `transfer_sol` - Transfer SOL from wallet
- `deposit_sol` - Deposit SOL to wallet
- `register_agent` - Register an agent
- `add_plugin` - Add authorization plugin
- `update_authority` - Change wallet authority
- `update_daily_limit` - Update spending limit

### TypeScript SDK

**Classes:**
- `SmartWalletClient` - High-level API for wallet operations
- `PluginManager` - Create and manage plugins
- `AgentRegistry` - Client for agent registry

## Development Status

- ✅ Program core implementation
- ✅ TypeScript SDK
- ✅ Unit tests
- ⚠️ Devnet deployment
- ⚠️ Integration tests
- ⚠️ Documentation

## Test Coverage

Target: 80%+ code coverage

Run coverage:
```bash
anchor test --coverage
```

## Security

- Daily spending limits
- Plugin-based authorization
- Agent registry with permissions
- Overflow/underflow checks
- Authority-based access control

## Contributing

Submit issues and PRs to improve SmartWallet.

## License

MIT

## Authors

Zoro Agents <hello@zoro-agents.dev>

## Support

- GitHub Issues: [Report bugs](https://github.com/zoro-jiro-san/smart-wallet/issues)
- Discussions: [Ask questions](https://github.com/zoro-jiro-san/smart-wallet/discussions)
