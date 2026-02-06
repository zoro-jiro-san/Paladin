#!/bin/bash
# SmartWallet Demo Video Recording Script
# Records demo execution and Solana Explorer with voiceover

set -e

DEMO_SCRIPT="scripts/demo-multi-agent.ts"
PROGRAM_ID="4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5"
EXPLORER_URL="https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
OUTPUT_VIDEO="demo-video.mp4"
TEMP_DIR="/tmp/paladin-video"

echo "════════════════════════════════════════════════════════════"
echo "  SmartWallet Demo Video Recording"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check dependencies
echo "[1/5] Checking recording tools..."
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠ ffmpeg not found. Installing..."
    sudo apt-get update
    sudo apt-get install -y ffmpeg
fi

if ! command -v xdotool &> /dev/null; then
    echo "⚠ xdotool not found. Installing..."
    sudo apt-get install -y xdotool
fi

echo "✓ Recording tools available"

# Setup temp directory
echo ""
echo "[2/5] Setting up recording environment..."
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# Option A: Manual Recording (Interactive)
if [ "$1" = "--manual" ]; then
    echo ""
    echo "MANUAL RECORDING MODE"
    echo "────────────────────"
    echo ""
    echo "Step 1: Open browser to Explorer"
    echo "  URL: $EXPLORER_URL"
    echo ""
    echo "Step 2: Start recording with:"
    echo "  ffmpeg -f x11grab -i :0 -f pulse -i default -c:v libx264 -c:a aac -y demo-recording.mp4"
    echo ""
    echo "Step 3: Execute demo:"
    echo "  npx ts-node $DEMO_SCRIPT"
    echo ""
    echo "Step 4: Wait for completion, then stop ffmpeg (Ctrl+C)"
    echo ""
    echo "Step 5: Edit and finalize:"
    echo "  ffmpeg -i demo-recording.mp4 -c:v libx264 -preset medium -crf 23 demo-video.mp4"
    echo ""
    exit 0
fi

# Option B: Automated Recording (if UI available)
echo ""
echo "[3/5] Checking for display server..."
if [ -z "$DISPLAY" ]; then
    echo "⚠ No X11 display found"
    echo "  For recording, you need a graphical environment"
    echo "  Try: export DISPLAY=:0"
    echo ""
    echo "Alternative: Record manually using ffmpeg"
    echo "  1. Open browser to $EXPLORER_URL"
    echo "  2. Start recording: ffmpeg -f x11grab -i :0 -f pulse -i default demo.mp4"
    echo "  3. Run demo: npx ts-node scripts/demo-multi-agent.ts"
    echo "  4. Stop recording (Ctrl+C in ffmpeg)"
    exit 1
fi

echo "✓ Display found: $DISPLAY"

# Create recording plan
cat > recording_plan.txt << 'EOF'
# SmartWallet Demo Video - Recording Plan

## Timeline (3-4 minutes)
- 0:00-0:30 - Introduction (voiceover)
  "Welcome to Paladin. A smart wallet system for Solana with agent autonomy"
  
- 0:30-1:00 - Demo Setup (voiceover)
  "Let's deploy and run a live demo with multiple agents"
  
- 1:00-2:30 - Demo Execution (show transactions)
  "Watch as our 5 agents coordinate and execute transactions across the network"
  [Run demo script]
  [Show explorer showing transactions in real-time]
  
- 2:30-3:00 - Results & Verification (voiceover)
  "All agents successfully transacted, with full on-chain verification"
  [Show final stats: 5 agents, 20+ transactions, 100% success rate]
  
- 3:00-3:15 - Conclusion (voiceover)
  "Paladin: Autonomous agents, decentralized wallets, Solana speed"
  [Show GitHub link]

## Recording Checklist
- [ ] Open Solana Explorer (devnet)
- [ ] Open terminal showing demo.ts
- [ ] Start ffmpeg recording
- [ ] Execute: npx ts-node scripts/demo-multi-agent.ts
- [ ] Capture all transaction hashes in explorer
- [ ] Wait for completion
- [ ] Stop recording
- [ ] Add voiceover (optional)
- [ ] Finalize MP4

## Explorer URL
https://explorer.solana.com/address/4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5?cluster=devnet
EOF

echo ""
echo "[4/5] Recording plan created"
cat recording_plan.txt
echo ""

# Create shell script for recording
cat > do-record.sh << 'EOF'
#!/bin/bash
# Interactive recording helper

echo "Ready to record demo?"
echo ""
echo "1. Open browser tabs:"
echo "   - Solana Explorer: https://explorer.solana.com?cluster=devnet"
echo "   - Search for program: 4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5"
echo ""
echo "2. Start ffmpeg recording:"
echo "   ffmpeg -f x11grab -i :0 -f pulse -i default -c:v libx264 -c:a aac -y demo-raw.mp4"
echo ""
echo "3. In another terminal, run:"
echo "   cd /home/tokisaki/.openclaw/workspace/smart-wallet"
echo "   npx ts-node scripts/demo-multi-agent.ts"
echo ""
echo "4. When done, stop ffmpeg (Ctrl+C)"
echo ""
echo "5. Finalize:"
echo "   ffmpeg -i demo-raw.mp4 -c:v libx264 -preset medium -crf 23 -c:a aac demo-video.mp4"
echo ""
echo "Press Enter to start recording..."
read

ffmpeg -f x11grab -i $DISPLAY -f pulse -i default -c:v libx264 -c:a aac -y demo-raw.mp4 &
FFMPEG_PID=$!

echo "Recording started (PID: $FFMPEG_PID)"
echo "Run demo in another terminal, then press Ctrl+C to stop"

wait $FFMPEG_PID

# Finalize video
if [ -f demo-raw.mp4 ]; then
    echo "Finalizing video..."
    ffmpeg -i demo-raw.mp4 -c:v libx264 -preset medium -crf 23 -c:a aac -y demo-video.mp4
    echo "✓ Video saved to demo-video.mp4"
fi
EOF

chmod +x do-record.sh

echo "[5/5] Recording scripts ready"
echo ""
echo "════════════════════════════════════════════════════════════"
echo "✨ RECORDING SETUP COMPLETE"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "To record demo video:"
echo ""
echo "1. Run recording helper:"
echo "   cd $TEMP_DIR && bash do-record.sh"
echo ""
echo "2. Follow on-screen instructions"
echo ""
echo "3. Run demo in parallel terminal:"
echo "   cd /home/tokisaki/.openclaw/workspace/smart-wallet"
echo "   npx ts-node scripts/demo-multi-agent.ts"
echo ""
echo "Recording plan: $TEMP_DIR/recording_plan.txt"
echo "Helper script: $TEMP_DIR/do-record.sh"
echo ""
