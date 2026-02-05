# SmartWallet Build Guide

## Prerequisites

- **Rust** 1.93.0+ with Cargo
- **Solana CLI** 1.18.20+
- **Anchor CLI** 0.29.0+
- **Node.js** 18+ (for SDK)

## Installation

### 1. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env
```

### 2. Install Solana CLI

```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.18.20/install)"
```

### 3. Install Anchor CLI

```bash
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked
```

### 4. Install Node.js (if not present)

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or download from https://nodejs.org/
```

## Building the Program

### Build Anchor Program

```bash
# From root directory
anchor build

# Or with release optimizations
cargo build --release -p smart_wallet --target-dir target
```

**Output:** `target/deploy/smart_wallet.so`

### Generate IDL

```bash
anchor idl init -f idl.json
```

**Output:** IDL JSON for use with SDKs

## Building the SDK

### Install Dependencies

```bash
cd sdk
npm install
```

### Build TypeScript SDK

```bash
npm run build
```

**Output:** `sdk/dist/` with compiled JavaScript and types

### Development Mode

For active development with auto-recompilation:

```bash
npm run dev
```

## Testing

### Test Anchor Program

```bash
# Run all tests
anchor test

# Run with coverage
anchor test --coverage

# Run specific test file
cargo test --test integration_tests
```

### Test TypeScript SDK

```bash
cd sdk
npm test

# With coverage
npm test -- --coverage
```

### Integration Tests

```bash
# Run all tests (program + SDK)
npm run test:integration
```

## Deployment

### 1. Setup Solana Wallet

```bash
# Generate new keypair
solana-keygen new --outfile ~/.config/solana/id.json

# Or use existing
solana-keygen recover
```

### 2. Request Devnet SOL

```bash
# Request SOL from devnet faucet
solana airdrop 10 --url devnet

# Check balance
solana balance --url devnet
```

### 3. Deploy to Devnet

```bash
# Check current balance
solana balance --url devnet

# Deploy program
anchor deploy --provider.cluster devnet

# Verify deployment
solana program info <PROGRAM_ID> --url devnet
```

### 4. Initialize on Devnet

After deployment, initialize with:

```bash
# Run initialization test
anchor test --provider.cluster devnet

# Or manually with SDK
npm run init:devnet
```

## Verification

### Verify Build

```bash
# Check program size
ls -lh target/deploy/smart_wallet.so

# Check build artifacts
anchor build --verifiable
```

### Verify Deployment

```bash
# Check program on devnet
solana program info <PROGRAM_ID> --url devnet

# Check program upgrade authority
solana program info <PROGRAM_ID> --url devnet | grep -i authority

# View program logs
solana logs <PROGRAM_ID> --url devnet
```

### Test Connection

```bash
# Test Solana connection
solana cluster-version --url devnet

# Test RPC endpoint
curl https://api.devnet.solana.com -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'
```

## Troubleshooting

### Rust Build Issues

```bash
# Update Rust
rustup update

# Check toolchain
rustup toolchain list

# Clean build
cargo clean
anchor build
```

### Anchor Build Issues

```bash
# Clear Anchor cache
rm -rf .anchor

# Rebuild
anchor build

# Check anchor version
anchor --version
```

### Deployment Issues

```bash
# Check program size limit (200KB)
ls -lh target/deploy/smart_wallet.so

# If too large, optimize:
cargo build --release -p smart_wallet

# Check wallet balance
solana balance --url devnet

# Request more SOL
solana airdrop 10 --url devnet
```

### Test Failures

```bash
# Run tests with verbose output
RUST_LOG=debug anchor test

# Run single test
cargo test test_wallet_initialization -- --nocapture

# Check test configuration
cat Anchor.toml
```

## Continuous Integration

### GitHub Actions Setup

Add to `.github/workflows/build.yml`:

```yaml
name: Build & Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - uses: actions/setup-rust@v1
      
      - name: Install Anchor
        run: cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked
      
      - name: Build Program
        run: anchor build
      
      - name: Test Program
        run: anchor test
      
      - name: Build SDK
        run: cd sdk && npm install && npm run build
      
      - name: Test SDK
        run: cd sdk && npm test
```

## Release Checklist

- [ ] All tests passing (80%+ coverage)
- [ ] No compiler warnings
- [ ] Code reviewed
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Deployed to devnet
- [ ] Verified on devnet
- [ ] npm package built
- [ ] Documentation updated

## Scripts

Useful scripts in `package.json`:

```json
{
  "scripts": {
    "build": "anchor build && cd sdk && npm run build",
    "test": "anchor test && cd sdk && npm test",
    "deploy:devnet": "anchor deploy --provider.cluster devnet",
    "verify:devnet": "solana program info ... --url devnet"
  }
}
```

## Next Steps

1. ✅ Build program
2. ✅ Build SDK
3. ✅ Run tests (80%+ coverage)
4. ✅ Deploy to devnet
5. ✅ Verify deployment
6. ⬜ Create example bots
7. ⬜ Document APIs
8. ⬜ Submit to hackathon
