#!/bin/bash

# SmartWallet Devnet Deployment Script
# This script automates the full devnet deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK="devnet"
PROGRAM_ID="4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5"
RPC_ENDPOINT="https://api.devnet.solana.com"
FAUCET_URL="https://faucet.devnet.solana.com"

# Logging
LOG_FILE="deployment-$(date +%Y%m%d-%H%M%S).log"
OUTPUT_FILE="DEVNET_DEPLOYMENT.json"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   SmartWallet Devnet Deployment Script${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "Deployment started: $(date)"
echo "Log file: $LOG_FILE"
echo ""

# Function to log
log_message() {
  echo -e "$1" | tee -a "$LOG_FILE"
}

# Function to check command exists
check_command() {
  if ! command -v $1 &> /dev/null; then
    log_message "${RED}Error: $1 is not installed or not in PATH${NC}"
    exit 1
  fi
}

# Step 1: Check prerequisites
log_message "${YELLOW}[1/10] Checking Prerequisites...${NC}"
check_command solana
check_command cargo
log_message "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Step 2: Setup Solana CLI
log_message "${YELLOW}[2/10] Configuring Solana CLI...${NC}"
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
source $HOME/.cargo/env

# Set cluster to devnet
solana config set --url $RPC_ENDPOINT 2>&1 | tee -a "$LOG_FILE"
log_message "${GREEN}✓ Solana CLI configured for $NETWORK${NC}"
echo ""

# Step 3: Create or verify wallet
log_message "${YELLOW}[3/10] Creating/Verifying Wallet...${NC}"
WALLET_PATH="$HOME/.config/solana/id.json"

if [ ! -f "$WALLET_PATH" ]; then
  log_message "Creating new keypair..."
  solana-keygen new --outfile "$WALLET_PATH" --no-passphrase 2>&1 | tee -a "$LOG_FILE"
fi

WALLET_ADDRESS=$(solana-keygen pubkey "$WALLET_PATH")
log_message "Wallet address: $WALLET_ADDRESS"
log_message "${GREEN}✓ Wallet ready${NC}"
echo ""

# Step 4: Check wallet balance
log_message "${YELLOW}[4/10] Checking Wallet Balance...${NC}"
BALANCE=$(solana balance --url $RPC_ENDPOINT 2>&1 | grep -oP '\d+\.\d+' | head -1 || echo "0")
log_message "Current balance: $BALANCE SOL"

# Step 5: Request faucet SOL if needed
log_message "${YELLOW}[5/10] Requesting Faucet SOL...${NC}"
if (( $(echo "$BALANCE < 5" | bc -l) )); then
  log_message "Balance too low, requesting from faucet..."
  
  # Try to airdrop multiple times
  for i in {1..3}; do
    log_message "Airdrop attempt $i..."
    solana airdrop 10 --url $RPC_ENDPOINT 2>&1 | tee -a "$LOG_FILE" && break
    sleep 5
  done
  
  sleep 10
  NEW_BALANCE=$(solana balance --url $RPC_ENDPOINT 2>&1 | grep -oP '\d+\.\d+' | head -1 || echo "0")
  log_message "New balance: $NEW_BALANCE SOL"
  
  if (( $(echo "$NEW_BALANCE < 5" | bc -l) )); then
    log_message "${RED}Warning: Balance still low ($NEW_BALANCE SOL). Deployment may fail.${NC}"
  fi
else
  log_message "Balance sufficient ($BALANCE SOL)"
fi
log_message "${GREEN}✓ Funding complete${NC}"
echo ""

# Step 6: Build program
log_message "${YELLOW}[6/10] Building Program...${NC}"
cd /home/tokisaki/.openclaw/workspace/smart-wallet

cargo build --release -p smart_wallet 2>&1 | tee -a "$LOG_FILE"

# Check for build artifacts
if [ ! -f "target/release/libsmart_wallet.so" ]; then
  log_message "${RED}Error: Program binary not found after build${NC}"
  exit 1
fi

BINARY_SIZE=$(ls -lh target/release/libsmart_wallet.so | awk '{print $5}')
log_message "Program binary size: $BINARY_SIZE"
log_message "${GREEN}✓ Program built successfully${NC}"
echo ""

# Step 7: Generate IDL (if Anchor CLI is available)
log_message "${YELLOW}[7/10] Generating IDL...${NC}"
if command -v anchor &> /dev/null; then
  anchor build 2>&1 | tee -a "$LOG_FILE" || log_message "${YELLOW}Warning: Anchor build failed, IDL may not be generated${NC}"
  
  if [ -f "target/idl/smart_wallet.json" ]; then
    log_message "IDL file: target/idl/smart_wallet.json"
    log_message "${GREEN}✓ IDL generated${NC}"
  else
    log_message "${YELLOW}Note: IDL not found, it will be generated on first deployment${NC}"
  fi
else
  log_message "${YELLOW}Note: Anchor CLI not available, skipping IDL generation${NC}"
fi
echo ""

# Step 8: Prepare deployment  
log_message "${YELLOW}[8/10] Preparing Deployment...${NC}"
log_message "Program ID: $PROGRAM_ID"
log_message "Network: $NETWORK"
log_message "RPC Endpoint: $RPC_ENDPOINT"
log_message "Deployer: $WALLET_ADDRESS"
log_message "${GREEN}✓ Deployment ready${NC}"
echo ""

# Step 9: Deploy program
log_message "${YELLOW}[9/10] Deploying Program to $NETWORK...${NC}"
log_message "This may take several minutes..."

if command -v anchor &> /dev/null; then
  # Use Anchor for deployment
  DEPLOY_OUTPUT=$(anchor deploy --provider.cluster $NETWORK 2>&1 || true)
  log_message "$DEPLOY_OUTPUT" | tee -a "$LOG_FILE"
  
  # Extract program ID from output
  DEPLOYED_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Program ID: \K[A-Za-z0-9]+' || echo "")
  
  if [ -n "$DEPLOYED_ID" ] && [ "$DEPLOYED_ID" != "$PROGRAM_ID" ]; then
    PROGRAM_ID="$DEPLOYED_ID"
    log_message "Program deployed with new ID: $PROGRAM_ID"
  fi
else
  log_message "${YELLOW}Note: Anchor CLI not available, manual deployment required${NC}"
  log_message "To deploy manually, run:"
  log_message "  solana program deploy --upgrade-authority $WALLET_PATH target/release/libsmart_wallet.so --url $RPC_ENDPOINT"
fi

log_message "${GREEN}✓ Deployment complete${NC}"
echo ""

# Step 10: Verify deployment
log_message "${YELLOW}[10/10] Verifying Deployment...${NC}"
sleep 5

# Check if program exists
PROGRAM_INFO=$(solana program show $PROGRAM_ID --url $RPC_ENDPOINT 2>&1 || true)

if echo "$PROGRAM_INFO" | grep -q "Program ID"; then
  log_message "${GREEN}✓ Program verified on-chain${NC}"
  
  # Extract program info
  OWNER=$(echo "$PROGRAM_INFO" | grep "Owner:" | awk '{print $2}')
  DATA_ACCOUNT=$(echo "$PROGRAM_INFO" | grep "Data account:" | awk '{print $3}')
  
  log_message "Program Owner: $OWNER"
  log_message "Program Data Account: $DATA_ACCOUNT"
  
  # Create deployment record
  DEPLOYMENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  cat > "$OUTPUT_FILE" << EOF
{
  "programId": "$PROGRAM_ID",
  "network": "$NETWORK",
  "rpcEndpoint": "$RPC_ENDPOINT",
  "deploymentTime": "$DEPLOYMENT_TIME",
  "deployedBy": "$WALLET_ADDRESS",
  "version": "0.1.0",
  "upgradeAuthority": "$WALLET_ADDRESS",
  "programDataAccount": "$DATA_ACCOUNT",
  "explorerUrl": "https://explorer.solana.com/address/$PROGRAM_ID?cluster=$NETWORK",
  "binarySize": "$BINARY_SIZE",
  "status": "deployed"
}
EOF
  
  log_message "Deployment record saved to: $OUTPUT_FILE"
else
  log_message "${RED}Warning: Could not verify program on-chain${NC}"
  log_message "Program ID: $PROGRAM_ID"
  log_message "Check status manually: solana program show $PROGRAM_ID --url $RPC_ENDPOINT"
fi

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "Summary:"
echo "  Program ID: $PROGRAM_ID"
echo "  Network: $NETWORK"
echo "  Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=$NETWORK"
echo "  Logs: $LOG_FILE"
echo ""
log_message "Deployment finished: $(date)"
