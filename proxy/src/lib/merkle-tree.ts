import { PublicKey } from '@solana/web3.js';
import * as crypto from 'crypto';
import type { Policy } from '../types/intent';

export interface MerkleTree {
  root: number[];
  leaves: Buffer[];
  layers: Buffer[][];
}

export interface MerkleProof {
  leaf: number[];
  proof: number[][];
  index: number;
}

/**
 * Hash two nodes together
 */
function hashNodes(left: Uint8Array, right: Uint8Array): Buffer {
  const hasher = crypto.createHash('sha256');
  hasher.update(left);
  hasher.update(right);
  return hasher.digest();
}

/**
 * Builds a Merkle Tree from a given Policy
 * Leaves format: 
 * - Allowlist: sha256(0x00 || pubkey_bytes)
 * - Blocklist: sha256(0x01 || pubkey_bytes)
 */
export function buildPolicyTree(policy: Policy): MerkleTree {
  const leaves: Buffer[] = [];

  // Generate leaves for allowlist
  for (const addr of policy.allowlist) {
    try {
      const pubkey = new PublicKey(addr);
      const data = Buffer.concat([Buffer.from([0x00]), pubkey.toBuffer()]);
      const leaf = crypto.createHash('sha256').update(data).digest();
      leaves.push(leaf);
    } catch (e) {
      console.warn(`Invalid address in allowlist: ${addr}`);
    }
  }

  // Generate leaves for blocklist
  for (const addr of policy.blocklist) {
    try {
      const pubkey = new PublicKey(addr);
      const data = Buffer.concat([Buffer.from([0x01]), pubkey.toBuffer()]);
      const leaf = crypto.createHash('sha256').update(data).digest();
      leaves.push(leaf);
    } catch (e) {
      console.warn(`Invalid address in blocklist: ${addr}`);
    }
  }

  // If no rules, return an empty tree (root of all zeros)
  if (leaves.length === 0) {
    return {
      root: Array(32).fill(0),
      leaves: [],
      layers: [],
    };
  }

  // Ensure even number of leaves by duplicating the last one if necessary
  let currentLayer = [...leaves];
  const layers: Buffer[][] = [currentLayer];

  while (currentLayer.length > 1) {
    const nextLayer: Buffer[] = [];
    
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : currentLayer[i]; // Duplicate last if odd
      nextLayer.push(hashNodes(left, right));
    }
    
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  return {
    root: Array.from(currentLayer[0]),
    leaves,
    layers,
  };
}

/**
 * Generates a Merkle Proof for a specific leaf index
 */
export function getProof(tree: MerkleTree, index: number): MerkleProof {
  if (tree.leaves.length === 0 || index < 0 || index >= tree.leaves.length) {
    throw new Error('Invalid index or empty tree');
  }

  const proof: number[][] = [];
  let currentIndex = index;

  for (let i = 0; i < tree.layers.length - 1; i++) {
    const layer = tree.layers[i];
    const isRightNode = currentIndex % 2 !== 0;
    
    let siblingIndex;
    if (isRightNode) {
      siblingIndex = currentIndex - 1;
    } else {
      siblingIndex = Math.min(currentIndex + 1, layer.length - 1);
    }

    proof.push(Array.from(layer[siblingIndex]));
    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    leaf: Array.from(tree.leaves[index]),
    proof,
    index,
  };
}

/**
 * Verifies a Merkle Proof (matches the Rust contract implementation)
 */
export function verifyProof(proof: MerkleProof, root: number[]): boolean {
  let computed: Uint8Array = Uint8Array.from(proof.leaf);
  const rootBuf = Buffer.from(root);
  
  for (let i = 0; i < proof.proof.length; i++) {
    const sibling = Buffer.from(proof.proof[i]);
    const isRightNode = (proof.index >> i) & 1;
    
    if (isRightNode === 0) {
      computed = hashNodes(computed, sibling);
    } else {
      computed = hashNodes(sibling, computed);
    }
  }
  
  return Buffer.from(computed).equals(rootBuf);
}
