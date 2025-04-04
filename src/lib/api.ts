import axios, { AxiosError } from 'axios';
import { QueuesResponse, QueuesResponseSchema, QueueJobsResponse, QueueJobsResponseSchema } from './types';
import { toast } from 'sonner';

// Rate limiter for API requests
const rateLimiter = {
  lastRequestTime: 0,
  queue: [] as { resolve: (value: unknown) => void, fn: () => Promise<any> }[],
  
  async throttle(fn: () => Promise<any>): Promise<any> {
    return new Promise((resolve) => {
      this.queue.push({ resolve, fn });
      this.processQueue();
    });
  },
  
  processQueue() {
    if (this.queue.length === 0) return;
    
    const now = Date.now();
    const timeElapsed = now - this.lastRequestTime;
    
    if (timeElapsed >= 1000 || this.lastRequestTime === 0) {
      const { resolve, fn } = this.queue.shift()!;
      this.lastRequestTime = now;
      
      Promise.resolve(fn())
        .then(result => {
          resolve(result);
          // Schedule next request
          setTimeout(() => this.processQueue(), 1000);
        })
        .catch(error => {
          resolve(Promise.reject(error));
          // Schedule next request
          setTimeout(() => this.processQueue(), 1000);
        });
    } else {
      // Wait for the remaining time before processing the next request
      const waitTime = 1000 - timeElapsed;
      setTimeout(() => this.processQueue(), waitTime);
    }
  }
};

// Create a custom axios instance with retries
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Connection': 'keep-alive',
  },
  timeout: 30000,
  validateStatus: (status) => {
    return status >= 200 && status < 300;
  },
});

// Add request interceptor for logging and retry handling
api.interceptors.request.use(
  (config) => {
    // Add retry count to config if not present
    if (config.retryCount === undefined) {
      config.retryCount = 0;
      config.maxRetries = 3;
    }

    // Reduce the batch size for large requests
    if (config.params?.jobsPerPage && config.params.jobsPerPage > 20) {
      config.params.jobsPerPage = 20;
    }

    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging and retry handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Only retry on network errors or 5xx errors
    if (
      (error.code === 'ECONNABORTED' || 
       error.code === 'ETIMEDOUT' ||
       error.code === 'ECONNRESET' ||
       (error.response && error.response.status >= 500)) && 
      config.retryCount < config.maxRetries
    ) {
      config.retryCount++;

      // Exponential backoff with jitter
      const jitter = Math.random() * 1000;
      const backoffDelay = Math.min(1000 * (2 ** config.retryCount) + jitter, 10000);
      
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      return api(config);
    }

    return Promise.reject(error);
  }
);

export async function fetchQueueJobs(
  queueName: string, 
  status = 'latest',
  page = 1,
  jobsPerPage = 20
): Promise<QueueJobsResponse> {
  try {
    console.log(`🔍 Fetching queue jobs for ${queueName}...`);
    
    // Use rate limiter to ensure requests are at most once per second
    const response = await rateLimiter.throttle(() => api.get<QueuesResponse>('/queues', {
      params: {
        activeQueue: queueName,
        status,
        page,
        jobsPerPage,
        includeJobs: true,
        includeDelayed: true,
        includePaused: true,
        includeWaiting: true,
        includeActive: true,
        includeCompleted: true,
        includeFailed: true,
        showEmpty: true
      },
    }));

    console.log(`✅ Received response for ${queueName}:`, response.data);

    // First validate that we got a valid queues response
    const parsed = QueuesResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      console.error(`❌ Invalid response data for ${queueName}:`, parsed.error);
      throw new Error(`Ogiltig data från servern: ${parsed.error.message}`);
    }

    // Find the requested queue
    const queue = parsed.data.queues.find(q => q.name === queueName);
    if (!queue) {
      console.error(`❌ Queue "${queueName}" not found in response`);
      throw new Error(`Kunde inte hitta kön "${queueName}"`);
    }

    return { queue };
  } catch (error) {
    handleApiError(error, queueName);
  }
}

function handleApiError(error: unknown, context?: string): never {
  const errorPrefix = context ? `[${context}] ` : '';
  console.error(`❌ API Error ${errorPrefix}:`, error);

  if (error instanceof AxiosError) {
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new Error(`${errorPrefix}Servern svarar långsamt`);
      }
      if (error.code === 'ECONNRESET') {
        throw new Error(`${errorPrefix}Anslutningen bröts`);
      }
      if (error.code === 'ERR_NETWORK') {
        throw new Error(`${errorPrefix}Kunde inte nå servern. Kontrollera din internetanslutning.`);
      }
      throw new Error(`${errorPrefix}Kunde inte nå servern: ${error.message}`);
    }
    
    const statusCode = error.response.status;
    const responseData = error.response.data;
    
    // Log detailed error information
    console.error('Response status:', statusCode);
    console.error('Response data:', responseData);
    
    switch (statusCode) {
      case 401:
        throw new Error(`${errorPrefix}Du måste logga in`);
      case 403:
        throw new Error(`${errorPrefix}Åtkomst nekad`);
      case 404:
        throw new Error(`${errorPrefix}Kunde inte hitta data`);
      case 429:
        throw new Error(`${errorPrefix}För många förfrågningar`);
      case 500:
      case 502:
      case 503:
      case 504:
        throw new Error(`${errorPrefix}Ett serverfel har inträffat (${statusCode})`);
      default:
        // Include response data in error message if available
        const errorMessage = responseData?.message || responseData?.error || error.message;
        throw new Error(`${errorPrefix}Ett fel uppstod (${statusCode}): ${errorMessage}`);
    }
  }
  
  // For non-Axios errors, try to extract useful information
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('Detailed error:', error);
  throw new Error(`${errorPrefix}Ett oväntat fel uppstod: ${errorMessage}`);
}
