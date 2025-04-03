import { useEffect, useState } from 'react';
import { queueStore } from '@/lib/queue-store';
import type { QueueStatsState } from '@/lib/types';

const initialState: QueueStatsState = {
  totals: {
    active: 0,
    waiting: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0,
  },
  queueStats: {}
};

export function useQueueStats() {
  const [stats, setStats] = useState<QueueStatsState>(initialState);

  useEffect(() => {
    const subscription = queueStore.getQueueStats().subscribe(
      newStats => setStats(newStats)
    );

    return () => subscription.unsubscribe();
  }, []);

  return stats;
}