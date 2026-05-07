import { useState, useCallback } from 'react';
import type { ActivityEntry, ActivityStatus } from '../components/activity-log';
import { isBlockedStatus, isAllowedStatus } from '../components/activity-log';

interface UseActivityLogOptions {
  maxEntries?: number;
}

export function useActivityLog({ maxEntries = 8 }: UseActivityLogOptions = {}) {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  const addActivity = useCallback((entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => {
    setActivity((prev) => [
      { ...entry, id: `${entry.status}-${Date.now()}`, timestamp: Date.now() },
      ...prev.slice(0, maxEntries - 1),
    ]);
  }, [maxEntries]);

  const clearActivity = useCallback(() => {
    setActivity([]);
  }, []);

  const hasBlockedRun = activity.some(
    (entry) => isBlockedStatus(entry.status) && entry.amountUsdc === '25'
  );

  const hasAllowedRun = activity.some(
    (entry) => isAllowedStatus(entry.status) && entry.amountUsdc === '5'
  );

  const hasBlockedIkaRun = activity.some(
    (entry) => isBlockedStatus(entry.status) && entry.amountUsdc === '25' && entry.route?.includes('Ika')
  );

  const hasSafeLog = activity.length > 0 && activity.every(
    (entry) => !entry.message.includes('10 USDC') && !entry.message.includes('20 USDC')
  );

  return {
    activity,
    addActivity,
    clearActivity,
    hasBlockedRun,
    hasAllowedRun,
    hasBlockedIkaRun,
    hasSafeLog,
  };
}