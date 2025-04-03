import { BehaviorSubject, Observable, combineLatest, map, shareReplay, distinctUntilChanged, debounceTime } from 'rxjs';
import type { Queue, QueueJob, CompanyStatus, GroupedCompany, QueueStats, QueueStatsState } from './types';
import { WORKFLOW_STAGES } from './constants';
import { groupQueues, groupByCompany } from './operators';

export class QueueStore {
  private queues: Record<string, BehaviorSubject<Queue | null>> = {};
  private groupedCompanies$ = new BehaviorSubject<GroupedCompany[]>([]);
  private queueStats$ = new BehaviorSubject<QueueStatsState>({
    totals: {
      active: 0,
      waiting: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    },
    queueStats: {}
  });

  constructor() {
    console.log('🏗️ Initializing QueueStore');
    WORKFLOW_STAGES.forEach(stage => {
      this.queues[stage.id] = new BehaviorSubject<Queue | null>(null);
    });

    // Create a shared stream of all queues that can be reused
    const sharedQueues$ = this.getAllQueues().pipe(
      shareReplay(1)
    );

    // Use the shared stream for both pipelines
    this.setupDataPipeline(sharedQueues$);
    this.setupStatsPipeline(sharedQueues$);
  }

  private setupStatsPipeline(queues$: Observable<{ queueId: string; queue: Queue | null }[]>) {
    queues$.pipe(
      debounceTime(100), // Debounce rapid updates
      map(queues => {
        const stats: QueueStatsState = {
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

        queues.forEach(({ queueId, queue }) => {
          if (!queue) {
            stats.queueStats[queueId] = this.getEmptyQueueStats();
            return;
          }

          const queueStats = {
            active: queue.counts.active,
            waiting: queue.counts.waiting + queue.counts['waiting-children'],
            completed: queue.counts.completed,
            failed: queue.counts.failed,
            isPaused: queue.isPaused
          };

          stats.totals.active += queue.counts.active;
          stats.totals.waiting += queue.counts.waiting + queue.counts['waiting-children'];
          stats.totals.completed += queue.counts.completed;
          stats.totals.failed += queue.counts.failed;
          stats.totals.delayed += queue.counts.delayed;
          stats.totals.paused += queue.isPaused ? 1 : 0;

          stats.queueStats[queueId] = queueStats;
        });

        return stats;
      }),
      distinctUntilChanged((prev, curr) => 
        prev.totals.active === curr.totals.active &&
        prev.totals.waiting === curr.totals.waiting &&
        prev.totals.completed === curr.totals.completed &&
        prev.totals.failed === curr.totals.failed
      ),
      shareReplay(1)
    ).subscribe(stats => {
      this.queueStats$.next(stats);
    });
  }

  private setupDataPipeline(queues$: Observable<{ queueId: string; queue: Queue | null }[]>) {
    queues$.pipe(
      debounceTime(100), // Debounce rapid updates
      groupQueues(),
      groupByCompany(),
      shareReplay(1)
    ).subscribe(
      companies => {
        this.groupedCompanies$.next(companies);
      },
      error => {
        console.error('❌ Pipeline error:', error);
        this.groupedCompanies$.next([]);
      }
    );
  }

  private getAllQueues(): Observable<{ queueId: string; queue: Queue | null }[]> {
    return combineLatest(
      Object.entries(this.queues).map(([id, subject]) =>
        subject.pipe(
          distinctUntilChanged((prev, curr) => 
            prev?.counts.active === curr?.counts.active &&
            prev?.counts.waiting === curr?.counts.waiting &&
            prev?.counts.completed === curr?.counts.completed &&
            prev?.counts.failed === curr?.counts.failed
          ),
          map(queue => ({
            queueId: id,
            queue
          }))
        )
      )
    );
  }

  private getEmptyQueueStats(): QueueStats {
    return {
      active: 0,
      waiting: 0,
      completed: 0,
      failed: 0,
      isPaused: false
    };
  }

  updateQueue(queueId: string, queue: Queue | null) {
    const subject = this.queues[queueId];
    if (subject) {
      subject.next(queue);
    }
  }

  getGroupedCompanies(): Observable<GroupedCompany[]> {
    return this.groupedCompanies$.asObservable();
  }

  getQueueStats(): Observable<QueueStatsState> {
    return this.queueStats$.asObservable();
  }
}

export const queueStore = new QueueStore();