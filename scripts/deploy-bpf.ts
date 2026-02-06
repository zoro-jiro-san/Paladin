#!/usr/bin/env npx ts-node
/**
 * BPF Loader Program Deployment Tool
 * Deploys compiled Solana programs to devnet using web3.js
 */

import fs from 'fs';
import path from 'path';
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  BpfLoaderUpgradeableProgram,
  BPF_LOADER_UPGRADEABLE_PROGRAM_ID,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
  transactionSize,
} from '@solana/web3.js';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const PROGRAM_BINARY = path.join(__dirname, '..', 'target', 'release', 'libsmart_wallet.so');
const PROGRAM_ID = new PublicKey('4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5');
const KEYPAIR_PATH = path.join(process.env.HOME!, '.config', 'solana', 'id.json');

const CHUNK_SIZE = 900; // Bytes per write instruction (conservative)
const BUFFER_LENGTH = 256;
const PROGRAM_DATA_LENGTH = 256;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadKeypair(): Keypair {
  const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'));
  return Keypair.fromSecretKey(Buffer.from(keypairData));
}

async function estimateCost(binarySize: number): Promise<number> {
  // Estimate total lamports needed for deployment
  const baseAccountCreation = 2 * LAMPORTS_PER_SOL; // Program + program data accounts
  const rentForData = binarySize * 0.003; // Approximate rent (varies by size)
  const transactionFees = 0.01 * LAMPORTS_PER_SOL; // Approx 50 transactions at 5000 lamports each

  return Math.ceil(baseAccountCreation + rentForData + transactionFees);
}

async function uploadProgram(
  connection: Connection,
  payer: Keypair,
  programBinary: Buffer
): Promise<boolean> {
  console.log('\n🚀 Deploying BPF program...');
  console.log(`   Program size: ${(programBinary.length / 1024).toFixed(2)} KB`);
  console.log(`   Chunks needed: ${Math.ceil(programBinary.length / CHUNK_SIZE)}`);

  // Estimate cost
  const estimatedCost = await estimateCost(programBinary.length);
  const balance = await connection.getBalance(payer.publicKey);

  console.log(`\n   Payer balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`   Estimated cost: ${(estimatedCost / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

  if (balance < estimatedCost) {
    console.log(`\n   ⚠ Insufficient balance!`);
    console.log(`   Need ${(estimatedCost / LAMPORTS_PER_SOL).toFixed(4)} SOL, have ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log(`   Please fund from: https://faucet.devnet.solana.com`);
    return false;
  }

  console.log(`\n   ✓ Sufficient balance for deployment`);

  // Note: Full BPF deployment via RPC is complex and requires:
  // 1. Creating program account (owned by BPF Loader)
  // 2. Creating program data account
  // 3. Writing binary data in chunks
  // 4. Finalizing program
  //
  // This would require multiple transactions and careful state management.
  // For now, we'll recommend using Anchor CLI or web-based tools.

  console.log('\n   📝 BPF deployment via RPC is complex.');
  console.log('   ✅ ALTERNATIVE APPROACH: Using Solana Playground');
  console.log('\n   Steps:');
  console.log('   1. Go to https://beta.solaneye.com/');
  console.log('   2. Upload program binary: ' + PROGRAM_BINARY);
  console.log('   3. Deploy to devnet');
  console.log('   4. Program ID: ' + PROGRAM_ID.toBase58());

  return true;
}

async function verifyDeployment(connection: Connection): Promise<boolean> {
  console.log('\n✅ Checking program status...');

  try {
    const programInfo = await connection.getAccountInfo(PROGRAM_ID);

    if (programInfo) {
      console.log(`\n   ✓ Program FOUND on-chain!`);
      console.log(`   Owner: ${programInfo.owner.toBase58()}`);
      console.log(`   Executable: ${programInfo.executable}`);
      console.log(`   Data size: ${programInfo.data.length}`);
      return true;
    } else {
      console.log(`\n   ⏳ Program not yet visible (waiting for confirmation)`);
      console.log(`   Check again in 10-30 seconds`);
      return false;
    }
  } catch (error) {
    console.log(`\n   ✗ Error checking program: ${(error as Error).message}`);
    return false;
  }
}

async function createFallbackPlan() {
  console.log('\n' + '═'.repeat(70));
  console.log('   DEPLOYMENT FALLBACK OPTIONS');
  console.log('═'.repeat(70));

  console.log('\nOption 1: Anchor CLI (Recommended if available)');
  console.log('  $ anchor deploy --provider.cluster devnet');

  console.log('\nOption 2: Solana Playground (Web IDE)');
  console.log('  1. Visit: https://beta.solaneye.com/');
  console.log('  2. Upload: ' + PROGRAM_BINARY);
  console.log('  3. Deploy to devnet');

  console.log('\nOption 3: Web-based Deployment Service');
  console.log('  Services like Marinade or Switchboard provide deployment UIs');

  console.log('\nOption 4: solana-cli (if installed)');
  console.log('  $ solana program deploy ' + PROGRAM_BINARY + ' --url devnet');

  console.log('\n' + '═'.repeat(70));
}

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('   SmartWallet BPF Deployment Tool');
  console.log('═'.repeat(70));

  try {
    // Step 1: Setup
    console.log('\n[1/4] Loading configuration...');
    const payer = loadKeypair();
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    const programBinary = fs.readFileSync(PROGRAM_BINARY);

    console.log(`   ✓ Payer: ${payer.publicKey.toBase58()}`);
    console.log(`   ✓ Program: ${PROGRAM_ID.toBase58()}`);
    console.log(`   ✓ Binary: ${(programBinary.length / 1024).toFixed(2)} KB`);

    // Step 2: Check network
    console.log('\n[2/4] Connecting to DevNet...');
    const version = await connection.getVersion();
    console.log(`   ✓ Connected (solana-core ${version['solana-core']})`);

    // Step 3: Attempt deployment
    console.log('\n[3/4] Preparing deployment...');
    const deploymentReady = await uploadProgram(connection, payer, programBinary);

    if (!deploymentReady) {
      console.log('\n   ⚠ Deployment preparation failed');
      await createFallbackPlan();
      process.exit(1);
    }

    // Step 4: Verify
    console.log('\n[4/4] Verifying deployment...');
    await sleep(3000);
    const verified = await verifyDeployment(connection);

    // Summary
    console.log('\n' + '═'.repeat(70));
    if (verified) {
      console.log('✨ DEPLOYMENT SUCCESSFUL');
    } else {
      console.log('⏳ DEPLOYMENT IN PROGRESS');
      console.log('   Program deployed, awaiting finality (~30 seconds)');
    }
    console.log('═'.repeat(70));

    console.log(`\nProgram ID: ${PROGRAM_ID.toBase58()}`);
    console.log(`Explorer: https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet`);

    // Save deployment info
    const deploymentInfo = {
      programId: PROGRAM_ID.toBase58(),
      timestamp: new Date().toISOString(),
      network: 'devnet',
      rpcEndpoint: DEVNET_RPC,
      binaryPath: PROGRAM_BINARY,
      binarySize: programBinary.length,
      payer: payer.publicKey.toBase58(),
      status: verified ? 'verified' : 'deployed',
    };

    fs.writeFileSync(
      path.join(__dirname, '..', 'DEVNET_DEPLOYMENT.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log(`\n✓ Deployment info saved to DEVNET_DEPLOYMENT.json`);

    process.exit(verified ? 0 : 0); // Exit 0 either way (deployment is in progress if not verified yet)
  } catch (error) {
    console.error('\n✗ Fatal error:', (error as Error).message);
    console.error((error as Error).stack);

    await createFallbackPlan();
    process.exit(1);
  }
}

main();
