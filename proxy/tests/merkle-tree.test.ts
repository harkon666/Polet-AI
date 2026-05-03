import { describe, expect, test } from 'bun:test';
import { buildPolicyTree, getProof, verifyProof } from '../src/lib/merkle-tree.js';
import type { Policy } from '../src/types/intent.js';
import { Keypair } from '@solana/web3.js';

describe('Merkle Tree Builder', () => {
  test('returns empty root for empty policy', () => {
    const policy: Policy = { allowlist: [], blocklist: [] };
    const tree = buildPolicyTree(policy);
    
    expect(tree.root.length).toBe(32);
    expect(tree.root.every(b => b === 0)).toBe(true);
    expect(tree.leaves.length).toBe(0);
  });

  test('builds tree and generates valid proofs', () => {
    // Generate 3 random pubkeys for testing
    const kp1 = Keypair.generate().publicKey.toString();
    const kp2 = Keypair.generate().publicKey.toString();
    const kp3 = Keypair.generate().publicKey.toString();

    const policy: Policy = {
      allowlist: [kp1, kp2],
      blocklist: [kp3]
    };

    const tree = buildPolicyTree(policy);
    
    // There should be 3 leaves
    expect(tree.leaves.length).toBe(3);
    
    // Generate proof for the first leaf
    const proof0 = getProof(tree, 0);
    expect(proof0.index).toBe(0);
    expect(verifyProof(proof0, tree.root)).toBe(true);
    
    // Generate proof for the second leaf
    const proof1 = getProof(tree, 1);
    expect(proof1.index).toBe(1);
    expect(verifyProof(proof1, tree.root)).toBe(true);

    // Generate proof for the third leaf
    const proof2 = getProof(tree, 2);
    expect(proof2.index).toBe(2);
    expect(verifyProof(proof2, tree.root)).toBe(true);
  });

  test('verification fails for invalid proofs', () => {
    const kp1 = Keypair.generate().publicKey.toString();
    const kp2 = Keypair.generate().publicKey.toString();
    
    const policy: Policy = {
      allowlist: [kp1],
      blocklist: [kp2]
    };

    const tree = buildPolicyTree(policy);
    const proof0 = getProof(tree, 0);
    
    // Tamper with the proof index
    const tamperedProof1 = { ...proof0, index: 1 };
    expect(verifyProof(tamperedProof1, tree.root)).toBe(false);
    
    // Tamper with the leaf
    const tamperedProof2 = { ...proof0, leaf: Array(32).fill(1) };
    expect(verifyProof(tamperedProof2, tree.root)).toBe(false);
  });
});
