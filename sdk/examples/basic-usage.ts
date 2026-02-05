import {
  Connection,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  SmartWalletClient,
  PluginManager,
  AgentRegistry,
} from "@zoro-agents/smart-wallet";

/**
 * Basic SmartWallet usage example
 *
 * This example demonstrates:
 * 1. Creating a SmartWallet
 * 2. Adding a daily limit plugin
 * 3. Registering agents
 * 4. Transferring SOL
 */
async function main() {
  // Setup connection
  const connection = new Connection("https://api.devnet.solana.com");

  // Program ID (replace with actual deployed program ID)
  const programId = new PublicKey(
    "4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5"
  );

  // Create keypairs (in production, use secure key management)
  const walletOwner = Keypair.generate();
  const agent1 = Keypair.generate();
  const agent2 = Keypair.generate();
  const recipient = Keypair.generate();

  console.log("🚀 SmartWallet Example");
  console.log("======================\n");

  // Initialize SDK
  console.log("📱 Initializing SmartWallet SDK...");
  const client = new SmartWalletClient({
    programId,
    connection,
    wallet: walletOwner, // Your wallet/provider
  });

  // Create a new SmartWallet
  console.log("\n💼 Creating SmartWallet...");
  const dailyLimit = 1 * LAMPORTS_PER_SOL; // 1 SOL daily limit
  const vault = walletOwner.publicKey;

  try {
    // Note: In production, you'd need to fund the wallet first
    // const createTx = await client.initialize(
    //   walletOwner.publicKey,
    //   dailyLimit,
    //   vault,
    //   walletOwner
    // );
    // console.log(`✅ Wallet created: ${createTx}`);

    // Create plugin manager
    console.log("\n🔌 Setting up plugins...");
    const pluginManager = new PluginManager(client, vault);

    // Create a daily limit plugin
    const dailyLimitPlugin = pluginManager.createDailyLimitPlugin(dailyLimit);
    console.log("   • Daily limit plugin created");

    // Create a whitelist plugin
    const whitelistPlugin = pluginManager.createWhitelistPlugin([
      agent1.publicKey,
      agent2.publicKey,
      recipient.publicKey,
    ]);
    console.log("   • Whitelist plugin created");

    // Add plugins to wallet
    // await pluginManager.addPlugin(dailyLimitPlugin, walletOwner);
    // await pluginManager.addPlugin(whitelistPlugin, walletOwner);
    // console.log("   ✅ Plugins added");

    // Register agents
    console.log("\n👥 Registering agents...");
    const registryPda = PublicKey.default; // In production, derive this
    const registry = new AgentRegistry(client, registryPda);

    // const agent1Tx = await registry.registerAgent(
    //   agent1.publicKey,
    //   "Trading Agent",
    //   BigInt(0b0001), // Can trade
    //   walletOwner
    // );
    // console.log(`   ✅ Agent 1 registered: ${agent1Tx}`);

    // const agent2Tx = await registry.registerAgent(
    //   agent2.publicKey,
    //   "Payment Agent",
    //   BigInt(0b0010), // Can pay
    //   walletOwner
    // );
    // console.log(`   ✅ Agent 2 registered: ${agent2Tx}`);

    // Transfer SOL
    console.log("\n💸 Transferring SOL...");
    const transferAmount = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL

    // const transferTx = await client.transferSol(
    //   vault,
    //   recipient.publicKey,
    //   transferAmount,
    //   walletOwner
    // );
    // console.log(`   ✅ Transfer complete: ${transferTx}`);

    // Query wallet state
    console.log("\n📊 Querying wallet state...");
    // const walletData = await client.getWallet(vault);
    // console.log(`   Authority: ${walletData.authority}`);
    // console.log(`   Daily Limit: ${walletData.dailyLimit / LAMPORTS_PER_SOL} SOL`);
    // console.log(`   Spent Today: ${walletData.spentToday / LAMPORTS_PER_SOL} SOL`);
    // console.log(`   Plugins: ${walletData.plugins.length}`);

    console.log("\n✅ Example complete!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run example
main().catch(console.error);
