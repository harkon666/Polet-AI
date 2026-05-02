import type { Policy, Intent, IntentEvaluationResult, Attestation } from '../types/intent.js';
import { getActionDestination, getIntentAmount } from './intent-parser.js';

/**
 * Evaluate an intent against a policy
 */
export function evaluateIntent(intent: Intent, policy: Policy): IntentEvaluationResult {
  // Check action type
  if (policy.allowedActions && policy.allowedActions.length > 0) {
    if (!policy.allowedActions.includes(intent.action)) {
      return {
        allowed: false,
        reason: `Action '${intent.action}' is not in the allowed actions list`,
      };
    }
  }

  // Get destination for policy checks
  const destination = getActionDestination(intent);

  // Check blocklist first - block takes precedence
  if (destination) {
    for (const blocked of policy.blocklist) {
      if (blocked === destination) {
        return {
          allowed: false,
          reason: `Destination ${destination.slice(0, 8)}... is on the blocklist`,
        };
      }
    }
  }

  // Check allowlist - if non-empty, destination must be in it
  if (policy.allowlist.length > 0 && destination) {
    let found = false;
    for (const allowed of policy.allowlist) {
      if (allowed === destination) {
        found = true;
        break;
      }
    }
    if (!found) {
      return {
        allowed: false,
        reason: `Destination ${destination.slice(0, 8)}... is not on the allowlist`,
      };
    }
  }

  // Check amount limit
  const amount = getIntentAmount(intent);
  if (policy.maxAmount && amount > policy.maxAmount) {
    return {
      allowed: false,
      reason: `Amount ${amount} exceeds maximum allowed ${policy.maxAmount}`,
    };
  }

  // All checks passed - intent is allowed
  return {
    allowed: true,
    reason: undefined,
  };
}

/**
 * Generate an attestation for an allowed intent
 * This is a mock implementation - in production this would use TEE and ZKP
 */
export function generateAttestation(
  intent: Intent,
  policyHash: string,
  blockHash: string,
  slot: number
): Attestation {
  // Create intent hash for attestation
  const intentData = JSON.stringify({
    id: intent.id,
    owner: intent.owner,
    sessionKey: intent.sessionKey,
    action: intent.action,
    params: intent.params,
    timestamp: intent.timestamp,
  });

  // Simple hash for demo - in production use proper crypto
  const intentHash = hashString(intentData);

  return {
    owner: intent.owner,
    sessionKey: intent.sessionKey,
    policyHash,
    intentHash,
    blockHash,
    slot,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

/**
 * Simple string hash for demo purposes
 * In production, use crypto.subtle.digest or similar
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex string and pad
  const hex = Math.abs(hash).toString(16);
  return hex.padStart(64, '0');
}