import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  Signer,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { SmartWalletIDL } from "./idl";

export interface SmartWalletConfig {
  programId: PublicKey;
  connection: Connection;
  wallet?: any;
}

export interface TransferOptions {
  from: PublicKey;
  to: PublicKey;
  amount: number;
  signer: Signer;
}

export interface PluginConfig {
  type: "daily-limit" | "whitelist" | "rate-limit" | "multi-sig" | "custom";
  config: Buffer;
}

/**
 * SmartWalletClient - High-level API for interacting with SmartWallet program
 */
export class SmartWalletClient {
  private connection: Connection;
  private programId: PublicKey;
  private program?: Program;
  private provider?: AnchorProvider;

  constructor(config: SmartWalletConfig) {
    this.connection = config.connection;
    this.programId = config.programId;

    if (config.wallet) {
      this.provider = new AnchorProvider(
        this.connection,
        config.wallet,
        AnchorProvider.defaultOptions()
      );
      this.program = new Program(SmartWalletIDL as any, this.programId, this.provider);
    }
  }

  /**
   * Initialize a new SmartWallet
   */
  async initialize(
    authority: PublicKey,
    dailyLimit: number,
    vault: PublicKey,
    payer: Signer
  ): Promise<string> {
    if (!this.program) {
      throw new Error("Program not initialized. Provide wallet in config.");
    }

    const walletPda = this.derivePda(
      ["wallet", authority.toBuffer()],
      this.programId
    );

    const tx = await this.program.methods
      .initialize(authority, new anchor.BN(dailyLimit))
      .accounts({
        smartWallet: walletPda[0],
        vault: vault,
        payer: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    return tx;
  }

  /**
   * Transfer SOL from wallet to recipient
   */
  async transferSol(
    wallet: PublicKey,
    recipient: PublicKey,
    amount: number,
    authority: Signer
  ): Promise<string> {
    if (!this.program) {
      throw new Error("Program not initialized. Provide wallet in config.");
    }

    const tx = await this.program.methods
      .transferSol(new anchor.BN(amount))
      .accounts({
        smartWallet: wallet,
        vault: wallet, // In production, vault would be separate
        recipient: recipient,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    return tx;
  }

  /**
   * Deposit SOL to wallet
   */
  async depositSol(
    vault: PublicKey,
    amount: number,
    depositor: Signer
  ): Promise<string> {
    if (!this.program) {
      throw new Error("Program not initialized. Provide wallet in config.");
    }

    const tx = await this.program.methods
      .depositSol(new anchor.BN(amount))
      .accounts({
        vault: vault,
        depositor: depositor.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([depositor])
      .rpc();

    return tx;
  }

  /**
   * Register an agent in the registry
   */
  async registerAgent(
    agentRegistry: PublicKey,
    agent: PublicKey,
    agentName: string,
    permissions: bigint,
    authority: Signer
  ): Promise<string> {
    if (!this.program) {
      throw new Error("Program not initialized. Provide wallet in config.");
    }

    const tx = await this.program.methods
      .registerAgent(agentName, new anchor.BN(permissions.toString()))
      .accounts({
        agentRegistry: agentRegistry,
        agent: agent,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    return tx;
  }

  /**
   * Add a plugin to the wallet
   */
  async addPlugin(
    wallet: PublicKey,
    plugin: PluginConfig,
    authority: Signer
  ): Promise<string> {
    if (!this.program) {
      throw new Error("Program not initialized. Provide wallet in config.");
    }

    const pluginTypeMap: { [key: string]: number } = {
      "daily-limit": 0,
      whitelist: 1,
      "rate-limit": 2,
      "multi-sig": 3,
      custom: 4,
    };

    const tx = await this.program.methods
      .addPlugin(pluginTypeMap[plugin.type], Array.from(plugin.config))
      .accounts({
        smartWallet: wallet,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    return tx;
  }

  /**
   * Update wallet authority
   */
  async updateAuthority(
    wallet: PublicKey,
    newAuthority: PublicKey,
    currentAuthority: Signer
  ): Promise<string> {
    if (!this.program) {
      throw new Error("Program not initialized. Provide wallet in config.");
    }

    const tx = await this.program.methods
      .updateAuthority(newAuthority)
      .accounts({
        smartWallet: wallet,
        authority: currentAuthority.publicKey,
      })
      .signers([currentAuthority])
      .rpc();

    return tx;
  }

  /**
   * Update daily spending limit
   */
  async updateDailyLimit(
    wallet: PublicKey,
    newLimit: number,
    authority: Signer
  ): Promise<string> {
    if (!this.program) {
      throw new Error("Program not initialized. Provide wallet in config.");
    }

    const tx = await this.program.methods
      .updateDailyLimit(new anchor.BN(newLimit))
      .accounts({
        smartWallet: wallet,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    return tx;
  }

  /**
   * Get wallet account data
   */
  async getWallet(wallet: PublicKey): Promise<any> {
    if (!this.program) {
      throw new Error("Program not initialized. Provide wallet in config.");
    }

    return await this.program.account.smartWallet.fetch(wallet);
  }

  /**
   * Get agent registry data
   */
  async getAgentRegistry(registry: PublicKey): Promise<any> {
    if (!this.program) {
      throw new Error("Program not initialized. Provide wallet in config.");
    }

    return await this.program.account.agentRegistry.fetch(registry);
  }

  /**
   * Derive a PDA
   */
  private derivePda(seeds: Buffer[], programId: PublicKey): [PublicKey, number] {
    const [pda, bump] = PublicKey.findProgramAddressSync(seeds, programId);
    return [pda, bump];
  }
}

/**
 * PluginManager - Manage wallet plugins
 */
export class PluginManager {
  private client: SmartWalletClient;
  private wallet: PublicKey;

  constructor(client: SmartWalletClient, wallet: PublicKey) {
    this.client = client;
    this.wallet = wallet;
  }

  /**
   * Create a daily limit plugin
   */
  createDailyLimitPlugin(limitLamports: number): PluginConfig {
    const config = Buffer.alloc(8);
    config.writeBigUInt64LE(BigInt(limitLamports), 0);

    return {
      type: "daily-limit",
      config,
    };
  }

  /**
   * Create a whitelist plugin
   */
  createWhitelistPlugin(allowedAddresses: PublicKey[]): PluginConfig {
    let config = Buffer.alloc(4 + allowedAddresses.length * 32);
    config.writeUInt32LE(allowedAddresses.length, 0);

    allowedAddresses.forEach((addr, idx) => {
      addr.toBuffer().copy(config, 4 + idx * 32);
    });

    return {
      type: "whitelist",
      config,
    };
  }

  /**
   * Create a rate limit plugin
   */
  createRateLimitPlugin(maxTransfersPerHour: number): PluginConfig {
    const config = Buffer.alloc(4);
    config.writeUInt32LE(maxTransfersPerHour, 0);

    return {
      type: "rate-limit",
      config,
    };
  }

  /**
   * Add plugin to wallet
   */
  async addPlugin(plugin: PluginConfig, authority: Signer): Promise<string> {
    return await this.client.addPlugin(this.wallet, plugin, authority);
  }
}

/**
 * AgentRegistry - Client for agent registry
 */
export class AgentRegistry {
  private client: SmartWalletClient;
  private registryPda: PublicKey;

  constructor(client: SmartWalletClient, registryPda: PublicKey) {
    this.client = client;
    this.registryPda = registryPda;
  }

  /**
   * Register a new agent
   */
  async registerAgent(
    agent: PublicKey,
    agentName: string,
    permissions: bigint,
    authority: Signer
  ): Promise<string> {
    return await this.client.registerAgent(
      this.registryPda,
      agent,
      agentName,
      permissions,
      authority
    );
  }

  /**
   * Get registry data
   */
  async getRegistry(): Promise<any> {
    return await this.client.getAgentRegistry(this.registryPda);
  }
}

// Export types
export type { SmartWalletConfig, TransferOptions, PluginConfig };
