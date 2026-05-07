import { describe, expect, test } from 'bun:test';
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  EXECUTE_CONFIDENTIAL_TRANSFER_AS_SESSION_DISCRIMINATOR,
  TRANSFER_INTENT_AMOUNT_OFFSET,
  TRANSFER_INTENT_DESTINATION_OFFSET,
  TRANSFER_INTENT_INSTRUCTION,
  TRANSFER_INTENT_LENGTH,
  buildExecuteConfidentialTransferAccounts,
  buildExecuteConfidentialTransferPayload,
  buildTransferIntentPayload,
} from '../src/lib/execution-payload.js';
import {
  APPROVE_IKA_MESSAGE_AS_SESSION_DISCRIMINATOR,
  APPROVE_IKA_MESSAGE_WITH_VERIFIED_ENCRYPT_AS_SESSION_DISCRIMINATOR,
  EXECUTE_ENCRYPT_POLICY_GRAPH_AS_SESSION_DISCRIMINATOR,
  SET_OFFICIAL_ENCRYPT_CIPHERTEXT_POLICY_DISCRIMINATOR,
  buildApproveIkaMessageAsSessionAccounts,
  buildApproveIkaMessageAsSessionInstructionData,
  buildApproveIkaMessageSessionTransaction,
  buildApproveIkaMessageWithVerifiedEncryptAsSessionAccounts,
  buildApproveIkaMessageWithVerifiedEncryptAsSessionInstructionData,
  buildApproveIkaMessageWithVerifiedEncryptSessionTransaction,
  buildCreateEncryptDepositTransaction,
  buildExecuteEncryptPolicyGraphAsSessionAccounts,
  buildExecuteEncryptPolicyGraphAsSessionInstructionData,
  buildExecuteEncryptPolicyGraphSessionTransaction,
  buildExecuteConfidentialTransferInstructionData,
  buildExecuteIntentData,
  buildSetOfficialEncryptCiphertextPolicyAccounts,
  buildSetOfficialEncryptCiphertextPolicyInstructionData,
  buildSetOfficialEncryptCiphertextPolicyTransaction,
  deriveEncryptCpiAuthority,
  deriveEncryptDepositPda,
  deriveEncryptConfigPda,
  deriveEncryptEventAuthorityPda,
  setConnection,
  to_LE_Bytes,
  type TransactionRequest,
  type BuiltTransaction,
} from '../src/lib/transaction-builder.js';
import { PROGRAM_ID_STRING } from '../src/lib/program-identity.js';
import { IKA_PREALPHA_PROGRAM_ID_STRING } from '../src/lib/ika-prealpha-signing.js';
import type { Attestation } from '../src/types/intent.js';

describe('Transaction Builder', () => {
  describe('to_LE_Bytes', () => {
    test('converts bigint to little-endian bytes', () => {
      const result = to_LE_Bytes(256n);
      expect(result.length).toBe(8);
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(1);
    });

    test('handles maximum u64 value', () => {
      const maxU64 = 18446744073709551615n;
      const result = to_LE_Bytes(maxU64);
      expect(result.length).toBe(8);
      // All bytes should be 255
      expect(result.every(b => b === 255)).toBe(true);
    });

    test('handles zero', () => {
      const result = to_LE_Bytes(0n);
      expect(result.length).toBe(8);
      expect(result.every(b => b === 0)).toBe(true);
    });
  });

  describe('buildExecuteIntentData', () => {
    test('builds correct data for transfer instruction', () => {
      const instruction = 0; // transfer
      const destination = new Uint8Array(32).fill(1);
      const amount = 1000000n;

      const data = buildExecuteIntentData(instruction, destination, amount);

      expect(data.length).toBe(TRANSFER_INTENT_LENGTH); // 1 + 32 + 8
      expect(data[0]).toBe(0); // instruction byte
      expect(data.slice(1, 33)).toEqual(destination); // destination bytes
      // Last 8 bytes should be the little-endian amount
      const extractedAmount = data.slice(33, 41);
      expect(extractedAmount[0]).toBe(0x40); // 1000000 in little-endian
    });

    test('instruction byte is correctly set', () => {
      const instruction = 5;
      const destination = new Uint8Array(32).fill(2);
      const amount = 5000000n;

      const data = buildExecuteIntentData(instruction, destination, amount);

      expect(data[0]).toBe(5);
    });

    test('amount is correctly encoded in little-endian', () => {
      const instruction = 0;
      const destination = new Uint8Array(32).fill(0);
      const amount = 1n; // 1 lamport

      const data = buildExecuteIntentData(instruction, destination, amount);

      // Last 8 bytes should be [1, 0, 0, 0, 0, 0, 0, 0]
      const amountBytes = data.slice(33, 41);
      expect(amountBytes[0]).toBe(1);
      expect(amountBytes.every((b, i) => i === 0 || b === 0)).toBe(true);
    });
  });

  describe('execution payload module', () => {
    test('builds the exact transfer intent payload parsed by the contract', () => {
      const destination = Keypair.generate().publicKey;
      const amount = 5_000_000n;

      const data = buildTransferIntentPayload(destination, amount);

      expect(data.length).toBe(TRANSFER_INTENT_LENGTH);
      expect(data[0]).toBe(TRANSFER_INTENT_INSTRUCTION);
      expect(data.subarray(
        TRANSFER_INTENT_DESTINATION_OFFSET,
        TRANSFER_INTENT_DESTINATION_OFFSET + 32
      )).toEqual(Buffer.from(destination.toBytes()));
      expect(data.readBigUInt64LE(TRANSFER_INTENT_AMOUNT_OFFSET)).toBe(amount);
    });

    test('builds the exact confidential transfer instruction argument layout', () => {
      const destination = Keypair.generate().publicKey;
      const witness = Array.from({ length: 32 }, (_, index) => index + 1);
      const data = buildExecuteConfidentialTransferPayload({
        destination: destination.toString(),
        amount: 5_000_000n,
        attestationSlot: 9n,
        attestationPolicySeq: 3n,
        maskedWitnessDevFixture: witness,
      });

      expect(data.subarray(0, 8)).toEqual(EXECUTE_CONFIDENTIAL_TRANSFER_AS_SESSION_DISCRIMINATOR);
      expect(data.readUInt32LE(8)).toBe(TRANSFER_INTENT_LENGTH);
      expect(data[12]).toBe(TRANSFER_INTENT_INSTRUCTION);
      expect(data.subarray(13, 45)).toEqual(Buffer.from(destination.toBytes()));
      expect(data.readBigUInt64LE(45)).toBe(5_000_000n);
      expect(data.readBigUInt64LE(53)).toBe(9n);
      expect(data.readBigUInt64LE(61)).toBe(3n);
      expect(Array.from(data.subarray(69, 101))).toEqual(witness);
      expect(data.length).toBe(101);
    });

    test('transaction builder delegates confidential instruction data to the payload module', () => {
      const destination = PublicKey.unique();
      const witness = Array.from({ length: 32 }, (_, index) => index + 1);
      const request = {
        wallet: Keypair.generate().publicKey.toString(),
        sessionKey: Keypair.generate().publicKey.toString(),
        destination: destination.toString(),
        amount: 5_000_000n,
        attestationSlot: 9n,
        attestationPolicySeq: 3n,
        maskedWitnessDevFixture: witness,
      };

      expect(buildExecuteConfidentialTransferInstructionData(request)).toEqual(
        buildExecuteConfidentialTransferPayload(request)
      );
    });

    test('defines the confidential transfer account ordering used by the contract', () => {
      const wallet = Keypair.generate().publicKey;
      const sessionKey = Keypair.generate().publicKey;
      const destination = Keypair.generate().publicKey;

      const metas = buildExecuteConfidentialTransferAccounts({
        wallet: wallet.toString(),
        sessionKey: sessionKey.toString(),
        destination: destination.toString(),
      });

      expect(metas).toEqual([
        { pubkey: wallet, isSigner: false, isWritable: true },
        { pubkey: sessionKey, isSigner: true, isWritable: false },
        { pubkey: destination, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ]);
    });

    test('rejects witness and amount values outside the contract layout', () => {
      const destination = Keypair.generate().publicKey.toString();

      expect(() => buildExecuteConfidentialTransferPayload({
        destination,
        amount: 1n,
        attestationSlot: 1n,
        attestationPolicySeq: 1n,
        maskedWitnessDevFixture: [1, 2, 3],
      })).toThrow('maskedWitnessDevFixture must contain exactly 32 bytes');
      expect(() => buildTransferIntentPayload(destination, -1n)).toThrow('u64 value out of range');
    });
  });

  describe('Ika approve_message transaction builder', () => {
    test('encodes the Polet approve_ika_message_as_session instruction args', () => {
      const user = Keypair.generate().publicKey;
      const request = createApproveIkaRequest({ userPubkey: user.toString() });
      const data = buildApproveIkaMessageAsSessionInstructionData(request);

      expect(data.subarray(0, 8)).toEqual(APPROVE_IKA_MESSAGE_AS_SESSION_DISCRIMINATOR);
      expect(data.subarray(8, 40)).toEqual(Buffer.alloc(32, 0x11));
      expect(data.readBigUInt64LE(40)).toBe(5_000_000n);
      expect(data.readBigInt64LE(48)).toBe(1_700_000_600n);
      expect(data.readBigUInt64LE(56)).toBe(9n);
      expect(data.readBigUInt64LE(64)).toBe(7n);
      expect(Array.from(data.subarray(72, 104))).toEqual(request.maskedWitnessDevFixture as number[]);
      expect(data.subarray(104, 136)).toEqual(Buffer.from(user.toBytes()));
      expect(data.readUInt16LE(136)).toBe(5);
      expect(data.readUInt8(138)).toBe(201);
      expect(data.length).toBe(139);
    });

    test('defines the Polet account order used by the contract CPI path', () => {
      const request = createApproveIkaRequest();

      expect(buildApproveIkaMessageAsSessionAccounts(request)).toEqual([
        { pubkey: new PublicKey(request.wallet), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(request.sessionKey), isSigner: true, isWritable: false },
        { pubkey: new PublicKey(request.coordinator), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(request.dwallet), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(request.messageApproval), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(request.cpiAuthority), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(request.callerProgram), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(request.ikaProgram), isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ]);
    });

    test('adds shared Ika co-approvers as remaining signer accounts', () => {
      const approverA = Keypair.generate().publicKey.toString();
      const approverB = Keypair.generate().publicKey.toString();
      const request = createApproveIkaRequest({ sharedApprovers: [approverA, approverB] });

      expect(buildApproveIkaMessageAsSessionAccounts(request).slice(-2)).toEqual([
        { pubkey: new PublicKey(approverA), isSigner: true, isWritable: false },
        { pubkey: new PublicKey(approverB), isSigner: true, isWritable: false },
      ]);
    });

    test('builds an unsigned session-signer transaction for Polet Ika approval', async () => {
      const blockhash = Keypair.generate().publicKey.toString();
      const sharedApprover = Keypair.generate().publicKey.toString();
      setConnection({
        getLatestBlockhash: async () => ({ blockhash, lastValidBlockHeight: 99 }),
        getSlot: async () => 123456,
      } as never);

      const request = createApproveIkaRequest({ sharedApprovers: [sharedApprover] });
      const built = await buildApproveIkaMessageSessionTransaction(request);
      const transaction = Transaction.from(Buffer.from(built.transaction, 'base64'));

      expect(built.blockHash).toBe(blockhash);
      expect(built.slot).toBe(123456);
      expect(built.signers).toEqual([request.sessionKey, sharedApprover]);
      expect(transaction.feePayer?.toString()).toBe(request.sessionKey);
      expect(transaction.recentBlockhash).toBe(blockhash);
      expect(transaction.instructions).toHaveLength(1);
      expect(transaction.instructions[0].programId.toString()).toBe(PROGRAM_ID_STRING);
      expect(transaction.instructions[0].keys.map((meta) => meta.pubkey.toString())).toEqual(
        buildApproveIkaMessageAsSessionAccounts(request).map((meta) => meta.pubkey.toString())
      );
      expect(transaction.instructions[0].keys[0].isWritable).toBe(true);
      expect(transaction.instructions[0].keys[1].isSigner).toBe(true);
      expect(transaction.instructions[0].data).toEqual(buildApproveIkaMessageAsSessionInstructionData(request));
    });
  });

  describe('Official Encrypt transaction builders', () => {
    test('encodes set_official_encrypt_ciphertext_policy args without witness bytes', () => {
      const request = createSetOfficialEncryptRequest();
      const data = buildSetOfficialEncryptCiphertextPolicyInstructionData(request);

      expect(data.subarray(0, 8)).toEqual(SET_OFFICIAL_ENCRYPT_CIPHERTEXT_POLICY_DISCRIMINATOR);
      expect(data.subarray(8, 40)).toEqual(Buffer.alloc(32, 0x22));
      expect(data.length).toBe(40);
    });

    test('defines set official Encrypt policy account order used by the contract', () => {
      const request = createSetOfficialEncryptRequest();
      const [encryptCpiAuthority] = deriveEncryptCpiAuthority();

      expect(buildSetOfficialEncryptCiphertextPolicyAccounts(request)).toEqual([
        { pubkey: new PublicKey(request.wallet), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(request.owner), isSigner: true, isWritable: false },
        { pubkey: new PublicKey(request.maxPerRunCiphertext), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(request.dailyCapCiphertext), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(request.dailySpentCiphertext), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(request.encrypt.encryptProgram!), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(request.encrypt.config), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(request.encrypt.deposit), isSigner: false, isWritable: true },
        { pubkey: encryptCpiAuthority, isSigner: false, isWritable: false },
        { pubkey: new PublicKey(PROGRAM_ID_STRING), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(request.encrypt.networkEncryptionKey), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(request.encrypt.payer), isSigner: true, isWritable: true },
        { pubkey: new PublicKey(request.encrypt.eventAuthority), isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ]);
    });

    test('encodes execute_encrypt_policy_graph_as_session args and derived bump', () => {
      const request = createExecuteEncryptGraphRequest();
      const data = buildExecuteEncryptPolicyGraphAsSessionInstructionData(request);
      const [, bump] = deriveEncryptCpiAuthority();

      expect(data.subarray(0, 8)).toEqual(EXECUTE_ENCRYPT_POLICY_GRAPH_AS_SESSION_DISCRIMINATOR);
      expect(data.readBigUInt64LE(8)).toBe(123n);
      expect(data.readBigUInt64LE(16)).toBe(7n);
      expect(data.readUInt8(24)).toBe(bump);
      expect(data.length).toBe(25);
    });

    test('defines execute graph account order with pending output ciphertexts writable', () => {
      const request = createExecuteEncryptGraphRequest();
      const metas = buildExecuteEncryptPolicyGraphAsSessionAccounts(request);

      expect(metas.map((meta) => meta.pubkey.toString())).toEqual([
        request.wallet,
        request.sessionKey,
        request.sourceAmountCiphertext,
        request.maxPerRunCiphertext,
        request.dailySpentCiphertext,
        request.dailyCapCiphertext,
        request.allowedOutputCiphertext,
        request.dailySpentOutputCiphertext,
        request.encrypt.encryptProgram!,
        request.encrypt.config,
        request.encrypt.deposit,
        deriveEncryptCpiAuthority()[0].toString(),
        PROGRAM_ID_STRING,
        request.encrypt.networkEncryptionKey,
        request.encrypt.payer,
        request.encrypt.eventAuthority,
        SystemProgram.programId.toString(),
      ]);
      expect(metas[1].isSigner).toBe(true);
      expect(metas[2].isWritable).toBe(true);
      expect(metas[6].isWritable).toBe(true);
      expect(metas[14].isSigner).toBe(true);
    });

    test('encodes verified Encrypt Ika consume args without source amount or witness', () => {
      const user = Keypair.generate().publicKey;
      const request = createVerifiedEncryptIkaRequest({ userPubkey: user.toString() });
      const data = buildApproveIkaMessageWithVerifiedEncryptAsSessionInstructionData(request);

      expect(data.subarray(0, 8)).toEqual(APPROVE_IKA_MESSAGE_WITH_VERIFIED_ENCRYPT_AS_SESSION_DISCRIMINATOR);
      expect(data.subarray(8, 40)).toEqual(Buffer.alloc(32, 0x33));
      expect(data.readBigInt64LE(40)).toBe(1_700_000_600n);
      expect(data.readBigUInt64LE(48)).toBe(123n);
      expect(data.readBigUInt64LE(56)).toBe(7n);
      expect(data.subarray(64, 96)).toEqual(Buffer.from(user.toBytes()));
      expect(data.readUInt16LE(96)).toBe(5);
      expect(data.readUInt8(98)).toBe(201);
      expect(data.length).toBe(99);
    });

    test('defines verified Encrypt Ika consume accounts and shared approver signers', () => {
      const approver = Keypair.generate().publicKey.toString();
      const request = createVerifiedEncryptIkaRequest({ sharedApprovers: [approver] });
      const metas = buildApproveIkaMessageWithVerifiedEncryptAsSessionAccounts(request);

      expect(metas.map((meta) => meta.pubkey.toString())).toEqual([
        request.wallet,
        request.sessionKey,
        request.allowedOutputCiphertext,
        request.dailySpentOutputCiphertext,
        request.allowedDecryptionRequest,
        request.coordinator,
        request.dwallet,
        request.messageApproval,
        request.cpiAuthority,
        request.callerProgram,
        request.ikaProgram,
        SystemProgram.programId.toString(),
        approver,
      ]);
      expect(metas[1].isSigner).toBe(true);
      expect(metas[7].isWritable).toBe(true);
      expect(metas[12].isSigner).toBe(true);
    });

    test('builds unsigned official Encrypt setup and execution transactions', async () => {
      const blockhash = Keypair.generate().publicKey.toString();
      setConnection({
        getLatestBlockhash: async () => ({ blockhash, lastValidBlockHeight: 99 }),
        getSlot: async () => 555,
      } as never);

      const setRequest = createSetOfficialEncryptRequest();
      const setBuilt = await buildSetOfficialEncryptCiphertextPolicyTransaction(setRequest);
      const setTx = Transaction.from(Buffer.from(setBuilt.transaction, 'base64'));
      expect(setBuilt.signers).toEqual([setRequest.owner, setRequest.encrypt.payer]);
      expect(setTx.feePayer?.toString()).toBe(setRequest.owner);
      expect(setTx.instructions[0].data).toEqual(buildSetOfficialEncryptCiphertextPolicyInstructionData(setRequest));

      const executeRequest = createExecuteEncryptGraphRequest();
      const executeBuilt = await buildExecuteEncryptPolicyGraphSessionTransaction(executeRequest);
      const executeTx = Transaction.from(Buffer.from(executeBuilt.transaction, 'base64'));
      expect(executeBuilt.signers).toEqual([executeRequest.sessionKey, executeRequest.encrypt.payer]);
      expect(executeTx.feePayer?.toString()).toBe(executeRequest.sessionKey);
      expect(executeTx.instructions[0].data).toEqual(buildExecuteEncryptPolicyGraphAsSessionInstructionData(executeRequest));

      const verifiedRequest = createVerifiedEncryptIkaRequest();
      const verifiedBuilt = await buildApproveIkaMessageWithVerifiedEncryptSessionTransaction(verifiedRequest);
      const verifiedTx = Transaction.from(Buffer.from(verifiedBuilt.transaction, 'base64'));
      expect(verifiedBuilt.signers).toEqual([verifiedRequest.sessionKey]);
      expect(verifiedTx.feePayer?.toString()).toBe(verifiedRequest.sessionKey);
      expect(verifiedTx.instructions[0].data).toEqual(buildApproveIkaMessageWithVerifiedEncryptAsSessionInstructionData(verifiedRequest));
    });

    test('builds create_encrypt_deposit transaction with correct accounts and data', async () => {
      const ENCRYPT_PROGRAM = '4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8';
      const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

      // Create a mock vault pubkey (will be bytes 100-132 of config data)
      const mockVault = Keypair.generate().publicKey;

      // Build mock config account data: 132 bytes with vault at offset 100
      const configData = Buffer.alloc(132);
      mockVault.toBuffer().copy(configData, 100);

      const owner = Keypair.generate().publicKey;
      const blockhash = Keypair.generate().publicKey.toString();

      // Mock connection with getAccountInfo returning the config data
      setConnection({
        getLatestBlockhash: async () => ({ blockhash, lastValidBlockHeight: 99 }),
        getSlot: async () => 777,
        getAccountInfo: async (pubkey: PublicKey) => {
          // Return config data for the config PDA
          const [configPda] = deriveEncryptConfigPda(ENCRYPT_PROGRAM);
          if (pubkey.equals(configPda)) {
            return {
              data: configData,
              owner: new PublicKey(ENCRYPT_PROGRAM),
              lamports: 1000000,
              executable: false,
            } as never;
          }
          return null;
        },
      } as never);

      const result = await buildCreateEncryptDepositTransaction(owner.toString(), ENCRYPT_PROGRAM);

      // Deserialize the transaction
      const tx = Transaction.from(Buffer.from(result.transaction, 'base64'));

      // Verify basic transaction properties
      expect(tx.feePayer?.toString()).toBe(owner.toString());
      expect(tx.recentBlockhash).toBe(blockhash);
      expect(tx.instructions).toHaveLength(1);

      const ix = tx.instructions[0];

      // Verify program ID is the Encrypt program
      expect(ix.programId.toString()).toBe(ENCRYPT_PROGRAM);

      // Verify instruction data: 17 bytes (bump + 2x u64 LE zeros)
      expect(ix.data.length).toBe(17);

      // Verify the bump is at position 0
      const [expectedDepositPda, expectedBump] = deriveEncryptDepositPda(owner.toString(), ENCRYPT_PROGRAM);
      expect(ix.data[0]).toBe(expectedBump);

      // Verify initial_enc_amount (bytes 1-8) is zero
      expect(ix.data.readBigUInt64LE(1)).toBe(0n);
      // Verify initial_gas_amount (bytes 9-16) is zero
      expect(ix.data.readBigUInt64LE(9)).toBe(0n);

      // Verify that the expected account pubkeys appear in the instruction.
      // Note: Solana's compiled message format deduplicates accounts, so duplicate
      // pubkeys (owner at signer+read-only and signer+writable, SystemProgram as
      // writable user_ata and read-only system_program) get merged.
      const keyStrings = ix.keys.map((k) => k.pubkey.toString());
      const [configPda] = deriveEncryptConfigPda(ENCRYPT_PROGRAM);
      const [eventAuthority] = deriveEncryptEventAuthorityPda(ENCRYPT_PROGRAM);

      expect(keyStrings).toContain(expectedDepositPda.toString());
      expect(keyStrings).toContain(configPda.toString());
      expect(keyStrings).toContain(owner.toString());
      expect(keyStrings).toContain(mockVault.toString());
      expect(keyStrings).toContain(TOKEN_PROGRAM);
      expect(keyStrings).toContain(SystemProgram.programId.toString());

      // After deduplication, the merged owner entry should be signer+writable
      const ownerMeta = ix.keys.find((k) => k.pubkey.equals(owner))!;
      expect(ownerMeta.isSigner).toBe(true);
      expect(ownerMeta.isWritable).toBe(true);

      // After deduplication, the merged SystemProgram entry should be writable (from user_ata)
      const sysMeta = ix.keys.find((k) => k.pubkey.equals(SystemProgram.programId))!;
      expect(sysMeta.isWritable).toBe(true);
      expect(sysMeta.isSigner).toBe(false);

      // Deposit PDA should be writable, not signer
      const depositMeta = ix.keys.find((k) => k.pubkey.equals(expectedDepositPda))!;
      expect(depositMeta.isWritable).toBe(true);
      expect(depositMeta.isSigner).toBe(false);

      // Config should be read-only
      const configMeta = ix.keys.find((k) => k.pubkey.equals(configPda))!;
      expect(configMeta.isWritable).toBe(false);
      expect(configMeta.isSigner).toBe(false);

      // Vault should be writable
      const vaultMeta = ix.keys.find((k) => k.pubkey.equals(mockVault))!;
      expect(vaultMeta.isWritable).toBe(true);
      expect(vaultMeta.isSigner).toBe(false);

      // Token program should be read-only
      const tokenMeta = ix.keys.find((k) => k.pubkey.toString() === TOKEN_PROGRAM)!;
      expect(tokenMeta.isWritable).toBe(false);
      expect(tokenMeta.isSigner).toBe(false);

      // Verify returned metadata
      expect(result.deposit).toBe(expectedDepositPda.toString());
      expect(result.config).toBe(configPda.toString());
      expect(result.eventAuthority).toBe(eventAuthority.toString());
      expect(result.signers).toEqual([owner.toString()]);
      expect(result.slot).toBe(777);
    });
  });

  describe('BuiltTransaction interface', () => {
    test('BuiltTransaction has required fields', () => {
      const mockTx: BuiltTransaction = {
        transaction: 'base64-encoded-tx',
        blockHash: 'mock-block-hash',
        slot: 123456,
        signers: ['session-key-1', 'session-key-2'],
      };

      expect(mockTx.transaction).toBe('base64-encoded-tx');
      expect(mockTx.blockHash).toBe('mock-block-hash');
      expect(mockTx.slot).toBe(123456);
      expect(mockTx.signers).toHaveLength(2);
    });
  });

  describe('TransactionRequest interface', () => {
    test('TransactionRequest has required fields', () => {
      const mockAttestation: Attestation = {
        owner: 'owner123',
        sessionKey: 'session456',
        policyHash: 'policy-hash-123',
        intentHash: 'intent-hash-456',
        blockHash: 'block-hash-789',
        slot: 123456,
        timestamp: Math.floor(Date.now() / 1000),
      };

      const request: TransactionRequest = {
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        instruction: 0,
        destination: 'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3',
        amount: 1000000,
        attestation: mockAttestation,
      };

      expect(request.owner).toBeDefined();
      expect(request.sessionKey).toBeDefined();
      expect(request.instruction).toBe(0);
      expect(request.destination).toBeDefined();
      expect(request.amount).toBe(1000000);
      expect(request.attestation).toBeDefined();
    });
  });
});

function createApproveIkaRequest(overrides: Partial<Parameters<typeof buildApproveIkaMessageAsSessionInstructionData>[0]> = {}) {
  return {
    wallet: Keypair.generate().publicKey.toString(),
    sessionKey: Keypair.generate().publicKey.toString(),
    coordinator: Keypair.generate().publicKey.toString(),
    dwallet: Keypair.generate().publicKey.toString(),
    messageApproval: Keypair.generate().publicKey.toString(),
    cpiAuthority: Keypair.generate().publicKey.toString(),
    callerProgram: PROGRAM_ID_STRING,
    ikaProgram: IKA_PREALPHA_PROGRAM_ID_STRING,
    ikaMessageHash: '11'.repeat(32),
    sourceAmount: 5_000_000n,
    orderExpiresAt: 1_700_000_600n,
    attestationSlot: 9n,
    attestationPolicySeq: 7n,
    maskedWitnessDevFixture: Array.from({ length: 32 }, (_, index) => index + 1),
    userPubkey: Keypair.generate().publicKey.toString(),
    signatureScheme: 5,
    messageApprovalBump: 201,
    ...overrides,
  };
}

function createEncryptContext() {
  return {
    encryptProgram: '4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8',
    config: Keypair.generate().publicKey.toString(),
    deposit: Keypair.generate().publicKey.toString(),
    networkEncryptionKey: Keypair.generate().publicKey.toString(),
    eventAuthority: Keypair.generate().publicKey.toString(),
    payer: Keypair.generate().publicKey.toString(),
  };
}

function createSetOfficialEncryptRequest(
  overrides: Partial<Parameters<typeof buildSetOfficialEncryptCiphertextPolicyInstructionData>[0]> = {}
) {
  return {
    wallet: Keypair.generate().publicKey.toString(),
    owner: Keypair.generate().publicKey.toString(),
    maxPerRunCiphertext: Keypair.generate().publicKey.toString(),
    dailyCapCiphertext: Keypair.generate().publicKey.toString(),
    dailySpentCiphertext: Keypair.generate().publicKey.toString(),
    policyCommitment: '22'.repeat(32),
    encrypt: createEncryptContext(),
    ...overrides,
  };
}

function createExecuteEncryptGraphRequest(
  overrides: Partial<Parameters<typeof buildExecuteEncryptPolicyGraphAsSessionInstructionData>[0]> = {}
) {
  return {
    wallet: Keypair.generate().publicKey.toString(),
    sessionKey: Keypair.generate().publicKey.toString(),
    sourceAmountCiphertext: Keypair.generate().publicKey.toString(),
    maxPerRunCiphertext: Keypair.generate().publicKey.toString(),
    dailySpentCiphertext: Keypair.generate().publicKey.toString(),
    dailyCapCiphertext: Keypair.generate().publicKey.toString(),
    allowedOutputCiphertext: Keypair.generate().publicKey.toString(),
    dailySpentOutputCiphertext: Keypair.generate().publicKey.toString(),
    attestationSlot: 123n,
    attestationPolicySeq: 7n,
    encrypt: createEncryptContext(),
    ...overrides,
  };
}

function createVerifiedEncryptIkaRequest(
  overrides: Partial<Parameters<typeof buildApproveIkaMessageWithVerifiedEncryptAsSessionInstructionData>[0]> = {}
) {
  return {
    wallet: Keypair.generate().publicKey.toString(),
    sessionKey: Keypair.generate().publicKey.toString(),
    allowedOutputCiphertext: Keypair.generate().publicKey.toString(),
    dailySpentOutputCiphertext: Keypair.generate().publicKey.toString(),
    allowedDecryptionRequest: Keypair.generate().publicKey.toString(),
    coordinator: Keypair.generate().publicKey.toString(),
    dwallet: Keypair.generate().publicKey.toString(),
    messageApproval: Keypair.generate().publicKey.toString(),
    cpiAuthority: Keypair.generate().publicKey.toString(),
    callerProgram: PROGRAM_ID_STRING,
    ikaProgram: IKA_PREALPHA_PROGRAM_ID_STRING,
    ikaMessageHash: '33'.repeat(32),
    orderExpiresAt: 1_700_000_600n,
    attestationSlot: 123n,
    attestationPolicySeq: 7n,
    userPubkey: Keypair.generate().publicKey.toString(),
    signatureScheme: 5,
    messageApprovalBump: 201,
    ...overrides,
  };
}
