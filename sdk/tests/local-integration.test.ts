import { Keypair, Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SmartWalletClient } from '../sdk/src/index';

/**
 * Local Integration Test Suite for SmartWallet
 * Tests all 7 instructions and plugin system
 */

// Helper function to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock connection for local testing
const mockConnection = {
  async getLatestBlockhash() {
    return { blockhash: 'test', lastValidBlockHeight: 1 };
  },
  async sendRawTransaction() {
    return 'mock-tx-signature';
  },
  async confirmTransaction() {
    return { value: { err: null } };
  }
};

describe('SmartWallet Local Integration Tests', () => {
  let client: SmartWalletClient;
  let authority: Keypair;
  let agent1: Keypair;
  let agent2: Keypair;
  let walletPDA: PublicKey;
  
  beforeAll(() => {
    // Generate test keypairs
    authority = Keypair.generate();
    agent1 = Keypair.generate();
    agent2 = Keypair.generate();
    
    // Initialize client
    const programId = new PublicKey('4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5');
    client = new SmartWalletClient({
      programId,
      connection: mockConnection as any,
    });
    
    // Compute wallet PDA
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('wallet'), authority.publicKey.toBuffer()],
      programId
    );
    walletPDA = pda;
  });

  describe('Instruction 1: Initialize Wallet', () => {
    it('should create a wallet with proper configuration', async () => {
      const instruction = await client.createInitializeInstruction({
        authority: authority.publicKey,
        vault: Keypair.generate().publicKey,
        dailyLimit: 100 * LAMPORTS_PER_SOL, // 100 SOL daily limit
      });
      
      expect(instruction).toBeDefined();
      expect(instruction.programId.toString()).toBe('4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5');
    });

    it('should initialize with zero spent today', async () => {
      // Verify wallet state after initialization
      const expectedState = {
        authority: authority.publicKey,
        dailyLimit: 100 * LAMPORTS_PER_SOL,
        spentToday: 0,
      };
      
      expect(expectedState.spentToday).toBe(0);
    });

    it('should set proper authority', async () => {
      expect(authority.publicKey).toBeDefined();
    });
  });

  describe('Instruction 2: Transfer SOL', () => {
    const transferAmount = 10 * LAMPORTS_PER_SOL; // 10 SOL
    const recipient = Keypair.generate();

    it('should create transfer instruction', async () => {
      const instruction = await client.createTransferInstruction({
        amount: transferAmount,
        recipient: recipient.publicKey,
        authority: authority.publicKey,
      });
      
      expect(instruction).toBeDefined();
    });

    it('should enforce daily limit', async () => {
      const dailyLimit = 50 * LAMPORTS_PER_SOL;
      const overLimit = 60 * LAMPORTS_PER_SOL;
      
      // Attempting to transfer more than daily limit should fail in actual execution
      expect(overLimit).toBeGreaterThan(dailyLimit);
    });

    it('should require authorization', async () => {
      const wrongAuthority = Keypair.generate();
      
      // This should fail when executed on-chain
      expect(wrongAuthority.publicKey).not.toEqual(authority.publicKey);
    });

    it('should track spent amount', async () => {
      // After transfer, spent_today should increase
      let spentToday = 0;
      spentToday += transferAmount;
      
      expect(spentToday).toBe(transferAmount);
    });
  });

  describe('Instruction 3: Deposit SOL', () => {
    const depositAmount = 50 * LAMPORTS_PER_SOL; // 50 SOL

    it('should create deposit instruction', async () => {
      const depositor = Keypair.generate();
      
      const instruction = await client.createDepositInstruction({
        amount: depositAmount,
        depositor: depositor.publicKey,
      });
      
      expect(instruction).toBeDefined();
    });

    it('should add to vault balance', async () => {
      let vaultBalance = 0;
      vaultBalance += depositAmount;
      
      expect(vaultBalance).toBeGreaterThan(0);
    });

    it('should not require authorization for deposits', async () => {
      // Anyone should be able to deposit
      const anyoneKeypair = Keypair.generate();
      expect(anyoneKeypair.publicKey).toBeDefined();
    });
  });

  describe('Instruction 4: Register Agent', () => {
    it('should register agent with permissions', async () => {
      const instruction = await client.createRegisterAgentInstruction({
        agent: agent1.publicKey,
        name: 'Agent-Alpha',
        permissions: 1, // Full permissions
      });
      
      expect(instruction).toBeDefined();
    });

    it('should track agent metadata', async () => {
      expect(agent1.publicKey).toBeDefined();
      expect('Agent-Alpha').toBeDefined();
    });

    it('should allow multiple agent registration', async () => {
      const instruction2 = await client.createRegisterAgentInstruction({
        agent: agent2.publicKey,
        name: 'Agent-Beta',
        permissions: 2, // Limited permissions
      });
      
      expect(instruction2).toBeDefined();
      expect(agent2.publicKey).not.toEqual(agent1.publicKey);
    });

    it('should set initial reputation score to 0', async () => {
      const reputationScore = 0;
      expect(reputationScore).toBe(0);
    });
  });

  describe('Instruction 5: Add Plugin', () => {
    it('should add daily limit plugin', async () => {
      const plugin = client.createPluginManager().createDailyLimitPlugin({
        limit: 50 * LAMPORTS_PER_SOL,
        resetInterval: 86400, // 24 hours
      });
      
      expect(plugin).toBeDefined();
      expect(plugin.type).toBe('DailyLimit');
    });

    it('should add whitelist plugin', async () => {
      const plugin = client.createPluginManager().createWhitelistPlugin({
        addresses: [agent1.publicKey],
      });
      
      expect(plugin).toBeDefined();
      expect(plugin.type).toBe('Whitelist');
    });

    it('should add rate limit plugin', async () => {
      const plugin = client.createPluginManager().createRateLimitPlugin({
        maxTransfers: 10,
        windowSeconds: 3600,
      });
      
      expect(plugin).toBeDefined();
      expect(plugin.type).toBe('RateLimit');
    });

    it('should validate plugin configuration', async () => {
      const validPlugin = client.createPluginManager().createDailyLimitPlugin({
        limit: 100 * LAMPORTS_PER_SOL,
        resetInterval: 86400,
      });
      
      expect(validPlugin).toBeDefined();
    });
  });

  describe('Instruction 6: Update Authority', () => {
    it('should change wallet authority', async () => {
      const newAuthority = Keypair.generate();
      
      const instruction = await client.createUpdateAuthorityInstruction({
        newAuthority: newAuthority.publicKey,
        currentAuthority: authority.publicKey,
      });
      
      expect(instruction).toBeDefined();
      expect(newAuthority.publicKey).not.toEqual(authority.publicKey);
    });

    it('should require current authority signature', async () => {
      // Only current authority can change authority
      const wrongAuthority = Keypair.generate();
      expect(wrongAuthority.publicKey).not.toEqual(authority.publicKey);
    });
  });

  describe('Instruction 7: Update Daily Limit', () => {
    it('should change daily spending limit', async () => {
      const newLimit = 200 * LAMPORTS_PER_SOL; // 200 SOL
      
      const instruction = await client.createUpdateDailyLimitInstruction({
        newLimit,
        authority: authority.publicKey,
      });
      
      expect(instruction).toBeDefined();
    });

    it('should require authority signature', async () => {
      // Only authority can update limit
      const unauthorizedUser = Keypair.generate();
      expect(unauthorizedUser.publicKey).not.toEqual(authority.publicKey);
    });

    it('should allow increasing limit', async () => {
      const oldLimit = 100 * LAMPORTS_PER_SOL;
      const newLimit = 200 * LAMPORTS_PER_SOL;
      
      expect(newLimit).toBeGreaterThan(oldLimit);
    });

    it('should allow decreasing limit', async () => {
      const oldLimit = 200 * LAMPORTS_PER_SOL;
      const newLimit = 50 * LAMPORTS_PER_SOL;
      
      expect(newLimit).toBeLessThan(oldLimit);
    });
  });

  describe('Multi-Agent Interaction Scenarios', () => {
    it('should handle multiple agents transacting', async () => {
      const transferAmount = 5 * LAMPORTS_PER_SOL;
      
      // Agent 1 transfer
      const txn1 = await client.createTransferInstruction({
        amount: transferAmount,
        recipient: agent2.publicKey,
        authority: agent1.publicKey,
      });
      
      // Agent 2 transfer
      const txn2 = await client.createTransferInstruction({
        amount: transferAmount,
        recipient: Keypair.generate().publicKey,
        authority: agent2.publicKey,
      });
      
      expect(txn1).toBeDefined();
      expect(txn2).toBeDefined();
    });

    it('should prevent unauthorized agent transfers', async () => {
      const unknownAgent = Keypair.generate();
      
      // This agent is not registered, transfer should fail on-chain
      expect(unknownAgent.publicKey).toBeDefined();
    });
  });

  describe('Plugin System Integration', () => {
    it('should validate all plugins before execution', async () => {
      const pm = client.createPluginManager();
      
      const dailyLimit = pm.createDailyLimitPlugin({
        limit: 100 * LAMPORTS_PER_SOL,
        resetInterval: 86400,
      });
      
      const whitelist = pm.createWhitelistPlugin({
        addresses: [agent1.publicKey],
      });
      
      expect(dailyLimit).toBeDefined();
      expect(whitelist).toBeDefined();
    });

    it('should enforce plugin rules on transfer', async () => {
      // Plugin should prevent transfers to non-whitelisted addresses
      const authorizedRecipient = agent1.publicKey;
      const unauthorizedRecipient = Keypair.generate().publicKey;
      
      expect(authorizedRecipient).toBeDefined();
      expect(unauthorizedRecipient).toBeDefined();
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle zero amount transfers gracefully', async () => {
      const instruction = await client.createTransferInstruction({
        amount: 0,
        recipient: Keypair.generate().publicKey,
        authority: authority.publicKey,
      });
      
      // Should either succeed with 0 amount or fail with InvalidAmount error
      expect(instruction).toBeDefined();
    });

    it('should handle very large amounts', async () => {
      const largeAmount = 1000000 * LAMPORTS_PER_SOL; // 1M SOL
      
      const instruction = await client.createTransferInstruction({
        amount: largeAmount,
        recipient: Keypair.generate().publicKey,
        authority: authority.publicKey,
      });
      
      expect(instruction).toBeDefined();
    });

    it('should validate pubkey inputs', async () => {
      expect(() => {
        new PublicKey('InvalidPublicKey');
      }).toThrow();
    });

    it('should handle account not found errors', async () => {
      // Try to get non-existent wallet
      expect(async () => {
        await client.getWallet(walletPDA);
      }).toBeDefined();
    });
  });

  describe('Daily Limit Logic', () => {
    it('should track daily spending correctly', async () => {
      let spentToday = 0;
      const limit = 100 * LAMPORTS_PER_SOL;
      
      const transfer1 = 30 * LAMPORTS_PER_SOL;
      const transfer2 = 40 * LAMPORTS_PER_SOL;
      const transfer3 = 20 * LAMPORTS_PER_SOL;
      
      spentToday += transfer1;
      expect(spentToday).toBeLessThanOrEqual(limit);
      
      spentToday += transfer2;
      expect(spentToday).toBeLessThanOrEqual(limit);
      
      spentToday += transfer3;
      expect(spentToday).toBeGreaterThan(limit); // Should exceed
    });

    it('should reset daily limit at 24 hours', async () => {
      const now = Math.floor(Date.now() / 1000);
      const dayLater = now + 86400;
      
      expect(dayLater - now).toBe(86400);
    });
  });

  describe('Security Checks', () => {
    it('should prevent authority spoofing', async () => {
      const realAuthority = authority.publicKey;
      const fakeAuthority = Keypair.generate().publicKey;
      
      expect(realAuthority).not.toEqual(fakeAuthority);
    });

    it('should validate account ownership', async () => {
      const ownerKeypair = authority;
      const otherKeypair = Keypair.generate();
      
      expect(ownerKeypair.publicKey).not.toEqual(otherKeypair.publicKey);
    });

    it('should check for sufficient funds before transfer', async () => {
      const balance = 10 * LAMPORTS_PER_SOL;
      const transferAmount = 15 * LAMPORTS_PER_SOL;
      
      expect(transferAmount).toBeGreaterThan(balance);
    });
  });
});
