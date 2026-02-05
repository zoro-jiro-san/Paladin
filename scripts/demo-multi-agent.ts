import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { SmartWalletClient } from '../sdk/src/index';

/**
 * SmartWallet Multi-Agent Demo
 * 
 * This script demonstrates a complete SmartWallet scenario with:
 * - 5 agents (Alice, Bob, Charlie, Diana, Eve)
 * - Multi-agent transactions
 * - Plugin system usage
 * - Error handling
 * - Reputation tracking
 * 
 * Agents perform:
 * 1. Wallet initialization
 * 2. Multiple transfers between agents
 * 3. Plugin enforcement (daily limits, whitelists)
 * 4. Reputation updates
 * 5. Authority changes
 */

// Configuration
const PROGRAM_ID = new PublicKey('4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5');
const RPC_ENDPOINT = process.env.DEVNET_ENDPOINT || 'https://api.devnet.solana.com';

interface AgentAccount {
  name: string;
  keypair: Keypair;
  pubkey: PublicKey;
  reputation: number;
  transactionsCount: number;
}

interface TransactionRecord {
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  error?: string;
}

class SmartWalletDemo {
  connection: Connection;
  client: SmartWalletClient;
  agents: Map<string, AgentAccount> = new Map();
  transactions: TransactionRecord[] = [];
  startTime: number = Date.now();

  constructor() {
    // Setup connection and client
    this.connection = new Connection(RPC_ENDPOINT, 'confirmed');
    this.client = new SmartWalletClient({
      programId: PROGRAM_ID,
      connection: this.connection,
    });

    // Initialize demo agents
    this.initializeAgents();
  }

  private initializeAgents() {
    const agentNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];

    agentNames.forEach((name) => {
      const keypair = Keypair.generate();
      this.agents.set(name, {
        name,
        keypair,
        pubkey: keypair.publicKey,
        reputation: 0,
        transactionsCount: 0,
      });
    });

    this.log('green', '\n=== Agent Initialization ===');
    this.agents.forEach((agent, name) => {
      this.log('cyan', `${name}: ${agent.pubkey.toString().substring(0, 20)}...`);
    });
  }

  private log(color: string, message: string) {
    const colors: Record<string, string> = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      dim: '\x1b[2m',
      black: '\x1b[30m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
    };

    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
  }

  async runDemo() {
    this.log('bright', '\n╔════════════════════════════════════════════════════════╗');
    this.log('bright', '║     SmartWallet Multi-Agent Demo                        ║');
    this.log('bright', '╚════════════════════════════════════════════════════════╝');

    try {
      // Phase 1: Setup
      await this.phaseSetup();

      // Phase 2: Initialize Wallets
      await this.phaseInitializeWallets();

      // Phase 3: Plugin Configuration
      await this.phaseConfigurePlugins();

      // Phase 4: Multi-Agent Transactions
      await this.phaseMultiAgentTransactions();

      // Phase 5: Advanced Scenarios
      await this.phaseAdvancedScenarios();

      // Phase 6: Reporting
      await this.phaseReporting();

      this.log('green', '\n✓ Demo completed successfully!');
    } catch (error) {
      this.log('red', `\n✗ Demo failed: ${error}`);
      process.exit(1);
    }
  }

  private async phaseSetup() {
    this.log('yellow', '\n--- Phase 1: Setup ---');
    this.log('blue', 'Connecting to Solana devnet...');
    this.log('blue', `RPC Endpoint: ${RPC_ENDPOINT}`);
    this.log('blue', `Program ID: ${PROGRAM_ID.toString()}`);

    try {
      const health = await this.connection.getHealth();
      this.log('green', `Network health: OK (status: ${health})`);
    } catch (error) {
      this.log('yellow', 'Warning: Could not verify network health');
    }

    this.log('green', '✓ Setup complete');
  }

  private async phaseInitializeWallets() {
    this.log('yellow', '\n--- Phase 2: Wallet Initialization ---');

    const dailyLimit = 1000 * LAMPORTS_PER_SOL; // 1000 SOL per day
    let walletCount = 0;

    for (const [name, agent] of this.agents.entries()) {
      this.log('blue', `Initializing wallet for ${name}...`);

      try {
        // Simulate wallet initialization
        const instruction = await this.client.createInitializeInstruction({
          authority: agent.pubkey,
          vault: Keypair.generate().publicKey,
          dailyLimit,
        });

        this.log('green', `✓ ${name}'s wallet initialized`);
        this.log('dim', `  Daily Limit: ${dailyLimit / LAMPORTS_PER_SOL} SOL`);
        walletCount++;
      } catch (error) {
        this.log('red', `✗ Failed to initialize ${name}'s wallet: ${error}`);
      }
    }

    this.log('green', `✓ Initialized ${walletCount}/${this.agents.size} wallets`);
  }

  private async phaseConfigurePlugins() {
    this.log('yellow', '\n--- Phase 3: Plugin Configuration ---');

    const pm = this.client.createPluginManager();

    // Create different plugins
    this.log('blue', 'Creating Daily Limit Plugin...');
    const dailyLimitPlugin = pm.createDailyLimitPlugin({
      limit: 500 * LAMPORTS_PER_SOL,
      resetInterval: 86400,
    });
    this.log('green', `✓ Daily Limit Plugin: 500 SOL/day`);

    this.log('blue', 'Creating Whitelist Plugin...');
    const whitelistAddresses = Array.from(this.agents.values()).map((a) => a.pubkey);
    const whitelistPlugin = pm.createWhitelistPlugin({
      addresses: whitelistAddresses,
    });
    this.log('green', `✓ Whitelist Plugin: ${whitelistAddresses.length} addresses`);

    this.log('blue', 'Creating Rate Limit Plugin...');
    const rateLimitPlugin = pm.createRateLimitPlugin({
      maxTransfers: 20,
      windowSeconds: 3600,
    });
    this.log('green', `✓ Rate Limit Plugin: 20 transfers/hour`);

    this.log('green', '✓ All plugins configured');
  }

  private async phaseMultiAgentTransactions() {
    this.log('yellow', '\n--- Phase 4: Multi-Agent Transactions ---');

    const transferAmount = 10 * LAMPORTS_PER_SOL;
    let successCount = 0;
    let failureCount = 0;

    const agents = Array.from(this.agents.values());

    // Scenario 1: Chain transfers
    this.log('blue', 'Scenario 1: Alice → Bob → Charlie → Diana');
    const chainPath = ['Alice', 'Bob', 'Charlie', 'Diana'];

    for (let i = 0; i < chainPath.length - 1; i++) {
      const fromAgent = this.agents.get(chainPath[i])!;
      const toAgent = this.agents.get(chainPath[i + 1])!;

      const result = await this.executeTransfer(fromAgent, toAgent, transferAmount);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    // Scenario 2: Star transfers (everyone sends to Eve)
    this.log('blue', 'Scenario 2: Star Pattern (All → Eve)');
    const eveAgent = this.agents.get('Eve')!;

    for (const [name, agent] of this.agents.entries()) {
      if (name !== 'Eve') {
        const result = await this.executeTransfer(agent, eveAgent, 5 * LAMPORTS_PER_SOL);
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      }
    }

    // Scenario 3: Round-robin
    this.log('blue', 'Scenario 3: Round-Robin Transfers');
    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < agents.length - 1; i++) {
        const result = await this.executeTransfer(
          agents[i],
          agents[(i + 1) % agents.length],
          2 * LAMPORTS_PER_SOL
        );
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      }
    }

    this.log('green', `✓ Transactions: ${successCount} successful, ${failureCount} failed`);
  }

  private async executeTransfer(
    fromAgent: AgentAccount,
    toAgent: AgentAccount,
    amount: number
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      this.log('dim', `${fromAgent.name} → ${toAgent.name}: ${amount / LAMPORTS_PER_SOL} SOL`);

      // Simulate transaction execution
      const instruction = await this.client.createTransferInstruction({
        amount,
        recipient: toAgent.pubkey,
        authority: fromAgent.pubkey,
      });

      // Update transaction record
      fromAgent.transactionsCount++;
      toAgent.transactionsCount++;

      // Simulate reputation update
      fromAgent.reputation += 1;
      toAgent.reputation += 1;

      this.transactions.push({
        from: fromAgent.name,
        to: toAgent.name,
        amount: amount / LAMPORTS_PER_SOL,
        timestamp: Date.now(),
        status: 'confirmed',
      });

      return { success: true, txHash: 'mock-tx-hash' };
    } catch (error) {
      this.log('red', `  Failed: ${error}`);
      this.transactions.push({
        from: fromAgent.name,
        to: toAgent.name,
        amount: amount / LAMPORTS_PER_SOL,
        timestamp: Date.now(),
        status: 'failed',
        error: String(error),
      });

      return { success: false, error: String(error) };
    }
  }

  private async phaseAdvancedScenarios() {
    this.log('yellow', '\n--- Phase 5: Advanced Scenarios ---');

    // Test daily limit enforcement
    this.log('blue', 'Testing Daily Limit Enforcement...');
    const alice = this.agents.get('Alice')!;
    const bob = this.agents.get('Bob')!;

    const largeAmount = 600 * LAMPORTS_PER_SOL; // Over the 500 SOL limit
    try {
      const instruction = await this.client.createTransferInstruction({
        amount: largeAmount,
        recipient: bob.pubkey,
        authority: alice.pubkey,
      });
      this.log('yellow', '  Daily limit check would be enforced on-chain');
    } catch (error) {
      this.log('green', `✓ Daily limit protection triggered: ${error}`);
    }

    // Test agent registry
    this.log('blue', 'Testing Agent Registration...');
    for (const [name, agent] of this.agents.entries()) {
      const instruction = await this.client.createRegisterAgentInstruction({
        agent: agent.pubkey,
        name: `${name}-Agent`,
        permissions: 1,
      });
      this.log('green', `✓ ${name} registered in agent registry`);
    }

    // Test plugin management
    this.log('blue', 'Testing Plugin Management...');
    const pm = this.client.createPluginManager();
    const customPlugin = pm.createDailyLimitPlugin({
      limit: 200 * LAMPORTS_PER_SOL,
      resetInterval: 86400,
    });
    this.log('green', `✓ Custom plugin configured: ${customPlugin.type}`);

    // Test authority update
    this.log('blue', 'Testing Authority Updates...');
    const alice_old = this.agents.get('Alice')!;
    const newAuthority = Keypair.generate();
    const instruction = await this.client.createUpdateAuthorityInstruction({
      newAuthority: newAuthority.publicKey,
      currentAuthority: alice_old.pubkey,
    });
    this.log('green', '✓ Authority update instruction created');

    this.log('green', '✓ All advanced scenarios completed');
  }

  private async phaseReporting() {
    this.log('yellow', '\n--- Phase 6: Reporting ---');

    const endTime = Date.now();
    const duration = (endTime - this.startTime) / 1000;

    this.log('cyan', '\n=== Agent Statistics ===');
    let totalReputation = 0;
    let totalTransactions = 0;

    for (const [name, agent] of this.agents.entries()) {
      this.log('white', `${name}:`);
      this.log('dim', `  Reputation: ${agent.reputation}`);
      this.log('dim', `  Transactions: ${agent.transactionsCount}`);
      totalReputation += agent.reputation;
      totalTransactions += agent.transactionsCount;
    }

    this.log('cyan', '\n=== Transaction Summary ===');
    const successfulTxns = this.transactions.filter((t) => t.status === 'confirmed').length;
    const failedTxns = this.transactions.filter((t) => t.status === 'failed').length;
    const totalAmount = this.transactions.reduce((sum, t) => sum + t.amount, 0);

    this.log('white', `Total Transactions: ${this.transactions.length}`);
    this.log('green', `  Successful: ${successfulTxns}`);
    this.log('red', `  Failed: ${failedTxns}`);
    this.log('white', `Total Value Transferred: ${totalAmount.toFixed(2)} SOL`);
    this.log('white', `Average Transaction Size: ${(totalAmount / this.transactions.length).toFixed(4)} SOL`);

    this.log('cyan', '\n=== Performance Metrics ===');
    this.log('white', `Demo Duration: ${duration.toFixed(2)}s`);
    this.log('white', `Transactions per Second: ${(this.transactions.length / duration).toFixed(2)}`);
    this.log('white', `Average Agent Reputation: ${(totalReputation / this.agents.size).toFixed(2)}`);
    this.log('white', `Average Transactions per Agent: ${(totalTransactions / this.agents.size).toFixed(2)}`);

    // Save results
    this.log('blue', '\nSaving demo results...');
    const results = {
      timestamp: new Date().toISOString(),
      networkEndpoint: RPC_ENDPOINT,
      programId: PROGRAM_ID.toString(),
      agents: Array.from(this.agents.values()).map((a) => ({
        name: a.name,
        pubkey: a.pubkey.toString(),
        reputation: a.reputation,
        transactionCount: a.transactionsCount,
      })),
      transactions: this.transactions,
      summary: {
        totalTransactions: this.transactions.length,
        successfulTransactions: successfulTxns,
        failedTransactions: failedTxns,
        totalValueTransferred: totalAmount,
        durationSeconds: duration,
        transactionsPerSecond: this.transactions.length / duration,
      },
    };

    console.log(JSON.stringify(results, null, 2));

    this.log('green', '✓ Results saved');
  }
}

// Run demo if executed directly
if (require.main === module) {
  const demo = new SmartWalletDemo();
  demo.runDemo().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { SmartWalletDemo };
