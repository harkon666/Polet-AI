import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import {
  Chain,
  DEVNET_PRE_ALPHA_GRPC_URL,
  createEncryptClient,
} from '@encrypt.xyz/pre-alpha-solana-client/grpc';
import { encryptValue } from '@encrypt.xyz/pre-alpha-solana-client/grpc-web';
import { Connection, PublicKey } from '@solana/web3.js';

type RuntimeEnv = Record<string, string | undefined>;

const env = (((globalThis as unknown as { Bun?: { env: RuntimeEnv }; process?: { env: RuntimeEnv } }).Bun?.env)
  ?? ((globalThis as unknown as { process?: { env: RuntimeEnv } }).process?.env)
  ?? {}) as RuntimeEnv;

const ENCRYPT_PROGRAM_ID = new PublicKey('4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8');
const POLET_PROGRAM_ID = new PublicKey(env.POLET_PROGRAM_ID ?? '9CN8mR6Hf3vmyX1HnSzP5TKW8HicAFhLsWv7vVqpf3Hc');
const SOLANA_RPC_URL = env.POLET_RPC_URL ?? 'https://api.devnet.solana.com';
const NETWORK_ENCRYPTION_PUBLIC_KEY = parseNetworkKey(env.POLET_ENCRYPT_NETWORK_KEY_HEX);
const FHE_UINT64 = 4;
const FHE_BOOL = 0;

const ciphertextInputs = [
  ['maxPerRun', parseUsdcBaseUnits(env.POLET_ENCRYPT_MAX_PER_RUN_USDC ?? '10'), FHE_UINT64],
  ['dailyCap', parseUsdcBaseUnits(env.POLET_ENCRYPT_DAILY_CAP_USDC ?? '20'), FHE_UINT64],
  ['dailySpent', parseUsdcBaseUnits(env.POLET_ENCRYPT_DAILY_SPENT_USDC ?? '0'), FHE_UINT64],
  ['sourceAmount', parseUsdcBaseUnits(env.POLET_ENCRYPT_SOURCE_AMOUNT_USDC ?? '5'), FHE_UINT64],
  ['allowedOutput', 0n, FHE_BOOL],
  ['dailySpentOutput', 0n, FHE_UINT64],
] as const;

async function main() {
  const startedAt = new Date().toISOString();
  const encryptClient = createEncryptClient(DEVNET_PRE_ALPHA_GRPC_URL);
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  try {
    const created = await encryptClient.createInput({
      chain: Chain.Solana,
      inputs: ciphertextInputs.map(([, value, fheType]) => ({
        ciphertextBytes: Buffer.from(encryptValue(value, fheType)),
        fheType,
      })),
      proof: Buffer.alloc(0),
      authorized: Buffer.from(POLET_PROGRAM_ID.toBytes()),
      networkEncryptionPublicKey: NETWORK_ENCRYPTION_PUBLIC_KEY,
    });

    const ciphertexts = Object.fromEntries(
      ciphertextInputs.map(([label], index) => [
        label,
        new PublicKey(created.ciphertextIdentifiers[index]!).toString(),
      ])
    ) as Record<typeof ciphertextInputs[number][0], string>;

    const accountChecks = await Promise.all(
      Object.entries(ciphertexts).map(async ([label, address]) => {
        const info = await connection.getAccountInfo(new PublicKey(address), 'confirmed');
        return [
          label,
          info
            ? {
                address,
                exists: true,
                owner: info.owner.toString(),
                dataLength: info.data.length,
                lamports: info.lamports,
                executable: info.executable,
                ownedByOfficialEncrypt: info.owner.equals(ENCRYPT_PROGRAM_ID),
              }
            : {
                address,
                exists: false,
                ownedByOfficialEncrypt: false,
              },
        ];
      })
    );

    const pdas = deriveEncryptPdas(env.POLET_ENCRYPT_PAYER);
    const evidence = {
      issue: '059-official-encrypt-devnet-ciphertext-graph-e2e',
      status: 'ciphertext-inputs-created',
      startedAt,
      completedAt: new Date().toISOString(),
      cluster: 'devnet',
      solanaRpc: SOLANA_RPC_URL,
      encryptGrpc: `https://${DEVNET_PRE_ALPHA_GRPC_URL}`,
      encryptProgramId: ENCRYPT_PROGRAM_ID.toString(),
      poletProgramId: POLET_PROGRAM_ID.toString(),
      graph: 'polet_policy_guardrail_graph',
      fheType: 'EUint64',
      ciphertextTypes: {
        maxPerRun: 'EUint64',
        dailyCap: 'EUint64',
        dailySpent: 'EUint64',
        sourceAmount: 'EUint64',
        allowedOutput: 'EBool',
        dailySpentOutput: 'EUint64',
      },
      policyPlaintextsRedacted: true,
      proofMode: 'pre-alpha-empty-proof-dev-mode',
      networkEncryptionKey: {
        publicKeyHex: NETWORK_ENCRYPTION_PUBLIC_KEY.toString('hex'),
        pda: pdas.networkEncryptionKey,
      },
      encryptPdas: pdas,
      ciphertexts,
      accountChecks: Object.fromEntries(accountChecks),
      pendingOutputsToUseForGraph: {
        allowedOutput: ciphertexts.allowedOutput,
        dailySpentOutput: ciphertexts.dailySpentOutput,
      },
      proxyRoutes: {
        registerPolicy: 'POST /wallet/set-official-encrypt-ciphertext-policy',
        executeGraph: 'POST /wallet/execute-encrypt-policy-graph',
        consumeVerifiedAllowedIka: 'POST /wallet/approve-ika-with-verified-encrypt',
      },
      safety: {
        noPrivateKeysIncluded: true,
        noSeedPhrasesIncluded: true,
        noWitnessBytesIncluded: true,
        noPlaintextThresholdsIncluded: true,
        noTransactionsSignedOrSentByThisRunner: true,
      },
      retryAction: 'Use these ciphertext ids with the unsigned proxy routes, simulate, then sign/send only with operator approval.',
    };

    const output = JSON.stringify(evidence, null, 2);
    console.log(output);
    if (env.POLET_ENCRYPT_EVIDENCE_OUT) {
      mkdirSync(dirname(env.POLET_ENCRYPT_EVIDENCE_OUT), { recursive: true });
      writeFileSync(env.POLET_ENCRYPT_EVIDENCE_OUT, `${output}\n`);
    }
  } finally {
    encryptClient.close();
  }
}

function parseUsdcBaseUnits(value: string): bigint {
  if (!/^\d+(\.\d{1,6})?$/.test(value)) {
    throw new Error('USDC values must be non-negative decimals with at most 6 fractional digits');
  }
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole!) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
}

function parseNetworkKey(value: string | undefined): Buffer {
  if (!value) return Buffer.alloc(32, 0x55);
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error('POLET_ENCRYPT_NETWORK_KEY_HEX must be a 32-byte hex string');
  }
  return Buffer.from(value, 'hex');
}

function deriveEncryptPdas(payer: string | undefined) {
  const [config] = PublicKey.findProgramAddressSync([Buffer.from('encrypt_config')], ENCRYPT_PROGRAM_ID);
  const [eventAuthority] = PublicKey.findProgramAddressSync([Buffer.from('__event_authority')], ENCRYPT_PROGRAM_ID);
  const [networkEncryptionKey] = PublicKey.findProgramAddressSync(
    [Buffer.from('network_encryption_key'), NETWORK_ENCRYPTION_PUBLIC_KEY],
    ENCRYPT_PROGRAM_ID
  );
  const [poletEncryptCpiAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from('__encrypt_cpi_authority')],
    POLET_PROGRAM_ID
  );
  const deposit = payer
    ? PublicKey.findProgramAddressSync(
        [Buffer.from('encrypt_deposit'), new PublicKey(payer).toBuffer()],
        ENCRYPT_PROGRAM_ID
      )[0].toString()
    : 'set POLET_ENCRYPT_PAYER to derive deposit PDA';

  return {
    config: config.toString(),
    eventAuthority: eventAuthority.toString(),
    deposit,
    networkEncryptionKey: networkEncryptionKey.toString(),
    poletEncryptCpiAuthority: poletEncryptCpiAuthority.toString(),
    pdaDerivationHash: createHash('sha256')
      .update(config.toBytes())
      .update(eventAuthority.toBytes())
      .update(networkEncryptionKey.toBytes())
      .update(poletEncryptCpiAuthority.toBytes())
      .digest('hex'),
  };
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
