import type { Policy, Intent, IntentEvaluationResult, Attestation } from '../types/intent';
import { getActionDestination, getIntentAmount } from './intent-parser';
import * as crypto from 'crypto';

/**
 * Legacy plaintext policy evaluator retained as prior foundation.
 *
 * Current Polet DCA execution uses confidential numeric policy evaluation in
 * `confidential-numeric-policy.ts`; this module is only for legacy transfer
 * demos and compatibility routes under `/legacy/intent/*`.
 */
export function evaluateLegacyPublicIntent(intent: Intent, policy: Policy): IntentEvaluationResult {
  if (policy.allowedActions && policy.allowedActions.length > 0) {
    if (!policy.allowedActions.includes(intent.action)) {
      return {
        allowed: false,
        reason: `Action '${intent.action}' is not in the allowed actions list`,
      };
    }
  }

  const destination = getActionDestination(intent);

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

  const amount = getIntentAmount(intent);
  if (policy.maxAmount && amount > policy.maxAmount) {
    return {
      allowed: false,
      reason: `Amount ${amount} exceeds maximum allowed ${policy.maxAmount}`,
    };
  }

  return {
    allowed: true,
    reason: undefined,
  };
}

export function generateLegacyPublicAttestation(
  intent: Intent,
  policyHash: string,
  blockHash: string,
  slot: number
): Attestation {
  const intentData = JSON.stringify({
    id: intent.id,
    owner: intent.owner,
    sessionKey: intent.sessionKey,
    action: intent.action,
    params: intent.params,
    timestamp: intent.timestamp,
  });

  return {
    owner: intent.owner,
    sessionKey: intent.sessionKey,
    policyHash,
    intentHash: hashString(intentData),
    blockHash,
    slot,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

function hashString(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}
