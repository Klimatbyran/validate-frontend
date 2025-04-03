import { z } from 'zod';

// Base schemas
export const CountsSchema = z.object({
  active: z.number(),
  completed: z.number(),
  delayed: z.number(),
  failed: z.number(),
  paused: z.number(),
  prioritized: z.number(),
  waiting: z.number(),
  'waiting-children': z.number(),
});

export const PaginationSchema = z.object({
  pageCount: z.number(),
  range: z.object({
    start: z.number(),
    end: z.number(),
  }),
});

export const JobOptionsSchema = z.object({
  attempts: z.number(),
  backoff: z.object({
    delay: z.number(),
    type: z.string()
  }).optional()
}).passthrough();

export const JobParentSchema = z.object({
  id: z.string(),
  queue: z.string()
}).optional();

export const JobDataSchema = z.object({
  url: z.string().optional(),
  threadId: z.string(),
  autoApprove: z.union([z.boolean(), z.string()]).transform(val => {
    if (typeof val === 'string') {
      return val.toLowerCase() === 'true' || val === '1';
    }
    return val;
  }).optional(),
  approved: z.union([z.boolean(), z.string()]).transform(val => {
    if (typeof val === 'string') {
      return val.toLowerCase() === 'true' || val === '1';
    }
    return val;
  }).optional(),
  messageId: z.string().optional(),
  company: z.string().optional(),
  companyName: z.string().optional(),
  description: z.string().optional(),
  year: z.number().optional(),
  status: z.string().optional(),
  needsApproval: z.boolean().optional(),
  comment: z.string().optional(),
}).passthrough();

export const JobSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  timestamp: z.number(),
  processedOn: z.number().optional(),
  finishedOn: z.number().optional(),
  progress: z.number().optional(),
  attempts: z.number().optional(),
  delay: z.union([z.string(), z.number()]).optional(),
  stacktrace: z.array(z.string()),
  opts: JobOptionsSchema,
  data: JobDataSchema,
  parent: JobParentSchema,
  returnValue: z.union([
    z.string(),
    z.number(),
    z.null(),
    z.object({}),
    z.undefined(),
    z.boolean()
  ]).optional(),
  isFailed: z.boolean().optional(),
}).passthrough();

export const QueueSchema = z.object({
  name: z.string(),
  type: z.enum(['bull', 'bullmq']),
  isPaused: z.boolean(),
  statuses: z.array(z.string()),
  counts: CountsSchema,
  jobs: z.array(JobSchema),
  pagination: PaginationSchema,
  readOnlyMode: z.boolean(),
  allowRetries: z.boolean(),
  allowCompletedRetries: z.boolean(),
  delimiter: z.string(),
});

// Response schemas
export const QueuesResponseSchema = z.object({
  queues: z.array(QueueSchema),
});

export const QueueJobsResponseSchema = z.object({
  queue: QueueSchema,
});

// Inferred types
export type Queue = z.infer<typeof QueueSchema>;
export type Job = z.infer<typeof JobSchema>;
export type JobData = z.infer<typeof JobDataSchema>;
export type JobParent = z.infer<typeof JobParentSchema>;
export type QueuesResponse = z.infer<typeof QueuesResponseSchema>;
export type QueueJobsResponse = z.infer<typeof QueueJobsResponseSchema>;

// Queue management types
export interface QueueJob extends Job {
  queueId: string;
}

export interface CompanyStatus {
  company: string;
  companyName?: string;
  description?: string;
  year: number;
  threadId: string;
  jobs?: QueueJob[]; // Add jobs array to store all jobs for this thread
  stages: Record<string, {
    status: 'completed' | 'failed' | 'processing' | 'pending';
    timestamp: number;
  }>;
}

export interface GroupedCompany {
  company: string;
  companyName?: string;
  description?: string;
  attempts: CompanyStatus[];
}

export interface QueueStats {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  isPaused: boolean;
}

export interface QueueStatsState {
  totals: {
    active: number;
    waiting: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  queueStats: Record<string, QueueStats>;
}