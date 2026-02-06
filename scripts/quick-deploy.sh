#!/bin/bash
# Quick Solana Program Deployment using web3.js

set -e

PROGRAM_PATH="./target/release/libsmart_wallet.so"
PROGRAM_ID="4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5"

echo "════════════════════════════════════════════════════════════"
echo "  SmartWallet DevNet Deployment"
echo "════════════════════════════════════════════════════════════"

# Step 1: Verify binary
echo ""
echo "[1/5] Verifying program binary..."
if [ -f "$PROGRAM_PATH" ]; then
    SIZE=$(ls -lh "$PROGRAM_PATH" | awk '{print $5}')
    echo "✓ Program found: $PROGRAM_PATH ($SIZE)"
else
    echo "✗ Program not found at $PROGRAM_PATH"
    exit 1
fi

# Step 2: Check web3.js availability
echo ""
echo "[2/5] Checking dependencies..."
if npm list @solana/web3.js > /dev/null 2>&1; then
    echo "✓ @solana/web3.js available"
else
    echo "✗ @solana/web3.js not found"
    echo "  Installing..."
    npm install @solana/web3.js --save
fi

# Step 3: Setup wallet
echo ""
echo "[3/5] Setting up wallet..."
KEYPAIR_PATH="$HOME/.config/solana/id.json"
mkdir -p "$(dirname "$KEYPAIR_PATH")"

if [ ! -f "$KEYPAIR_PATH" ]; then
    echo "✓ Creating new keypair..."
    node -e "
      const {Keypair} = require('@solana/web3.js');
      const fs = require('fs');
      const keypair = Keypair.generate();
      fs.mkdirSync('$(dirname "$KEYPAIR_PATH")', {recursive: true});
      fs.writeFileSync('$KEYPAIR_PATH', JSON.stringify(Array.from(keypair.secretKey)), {mode: 0o600});
      console.log('✓ Keypair created: ' + keypair.publicKey.toBase58());
    "
else
    echo "✓ Using existing keypair: $(cat $KEYPAIR_PATH | node -e "const fs=require('fs'); const data=JSON.parse(require('fs').readFileSync(0, 'utf-8')); const {Keypair} = require('@solana/web3.js'); const kp = Keypair.fromSecretKey(Buffer.from(data)); console.log(kp.publicKey.toBase58());")"
fi

# Step 4: Request airdrop
echo ""
echo "[4/5] Requesting airdrop..."
node -e "
  const {Connection, PublicKey, Keypair} = require('@solana/web3.js');
  const fs = require('fs');
  
  async function airdrop() {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const secretKey = JSON.parse(fs.readFileSync('$KEYPAIR_PATH', 'utf-8'));
    const keypair = Keypair.fromSecretKey(Buffer.from(secretKey));
    
    const balance = await connection.getBalance(keypair.publicKey);
    console.log('✓ Current balance: ' + (balance / 1e9).toFixed(2) + ' SOL');
    
    if (balance < 5e9) {
      console.log('  Requesting 5 SOL from faucet...');
      try {
        const sig = await connection.requestAirdrop(keypair.publicKey, 5e9);
        console.log('  Airdrop requested, waiting...');
        await new Promise(r => setTimeout(r, 3000));
        const newBalance = await connection.getBalance(keypair.publicKey);
        console.log('✓ Updated balance: ' + (newBalance / 1e9).toFixed(2) + ' SOL');
      } catch (e) {
        console.log('⚠ Airdrop failed: ' + e.message);
        console.log('  Please manually fund: https://faucet.devnet.solana.com');
      }
    }
  }
  
  airdrop().catch(console.error);
"

# Step 5: Deployment status
echo ""
echo "[5/5] Deployment preparation complete"
echo ""
echo "════════════════════════════════════════════════════════════"
echo "✨ READY FOR DEPLOYMENT"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Program ID: $PROGRAM_ID"
echo "Network: Solana DevNet"
echo "Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo ""
echo "Next steps:"
echo "1. Ensure wallet has 5+ SOL (just funded with airdrop)"
echo "2. Run: npm run build           (if not already built)"
echo "3. Run: anchor deploy --provider.cluster devnet"
echo ""
echo "OR use Anchor CLI if available:"
echo "  anchor deploy --provider.cluster devnet"
echo ""

# Save deployment info
cat > DEVNET_DEPLOYMENT.json << JSON_EOF
{
  "programId": "$PROGRAM_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "network": "devnet",
  "rpcEndpoint": "https://api.devnet.solana.com",
  "binaryPath": "$PROGRAM_PATH",
  "wallet": "$KEYPAIR_PATH",
  "status": "prepared"
}
JSON_EOF

echo "✓ Deployment info saved to DEVNET_DEPLOYMENT.json"
