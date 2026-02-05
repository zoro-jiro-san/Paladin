import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { SmartWalletClient, PluginManager } from "../src/index";

describe("SmartWalletClient", () => {
  let client: SmartWalletClient;
  let connection: Connection;
  const programId = new PublicKey(
    "4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5"
  );

  beforeAll(() => {
    connection = new Connection("https://api.devnet.solana.com");
    client = new SmartWalletClient({
      programId,
      connection,
    });
  });

  test("SmartWalletClient initializes", () => {
    expect(client).toBeDefined();
  });

  describe("PluginManager", () => {
    let pluginManager: PluginManager;
    const walletAddress = PublicKey.default;

    beforeAll(() => {
      pluginManager = new PluginManager(client, walletAddress);
    });

    test("creates daily limit plugin", () => {
      const dailyLimit = 1 * LAMPORTS_PER_SOL;
      const plugin = pluginManager.createDailyLimitPlugin(dailyLimit);

      expect(plugin.type).toBe("daily-limit");
      expect(plugin.config).toBeInstanceOf(Buffer);
      expect(plugin.config.length).toBe(8);
    });

    test("creates whitelist plugin", () => {
      const whitelist = [PublicKey.default, Keypair.generate().publicKey];
      const plugin = pluginManager.createWhitelistPlugin(whitelist);

      expect(plugin.type).toBe("whitelist");
      expect(plugin.config).toBeInstanceOf(Buffer);
      expect(plugin.config.readUInt32LE(0)).toBe(whitelist.length);
    });

    test("creates rate limit plugin", () => {
      const maxTransfersPerHour = 100;
      const plugin = pluginManager.createRateLimitPlugin(maxTransfersPerHour);

      expect(plugin.type).toBe("rate-limit");
      expect(plugin.config).toBeInstanceOf(Buffer);
      expect(plugin.config.readUInt32LE(0)).toBe(maxTransfersPerHour);
    });
  });

  describe("API methods", () => {
    test("getWallet requires program initialization", async () => {
      const walletAddress = PublicKey.default;

      try {
        await client.getWallet(walletAddress);
        fail("Expected error");
      } catch (error: any) {
        expect(error.message).toContain("Program not initialized");
      }
    });

    test("transferSol requires program initialization", async () => {
      const from = PublicKey.default;
      const to = PublicKey.default;
      const signer = Keypair.generate();

      try {
        await client.transferSol(from, to, 1000000, signer);
        fail("Expected error");
      } catch (error: any) {
        expect(error.message).toContain("Program not initialized");
      }
    });
  });
});
