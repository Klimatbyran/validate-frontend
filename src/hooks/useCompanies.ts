import { useState, useEffect } from 'react';
import { fetchProcessesByCompany } from '@/lib/api';
import type { CustomAPICompany } from '@/lib/types';

// Function to fetch detailed job data including returnValue
async function fetchDetailedJobData(queueName: string, jobId: string) {
  try {
    const response = await fetch(`http://localhost:3001/api/queues/${queueName}/${jobId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch job ${jobId}: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`Failed to fetch detailed data for job ${jobId}:`, error);
    return null;
  }
}

// Function to enhance jobs with detailed data
async function enhanceJobsWithDetailedData(companies: CustomAPICompany[]): Promise<CustomAPICompany[]> {
  const enhancedCompanies = await Promise.all(
    companies.map(async (company) => {
      const enhancedProcesses = await Promise.all(
        company.processes.map(async (process) => {
          const enhancedJobs = await Promise.all(
            process.jobs.map(async (job) => {
              // Fetch detailed job data
              const detailedJob = await fetchDetailedJobData(job.queue, job.id);
              if (detailedJob) {
                return {
                  ...job,
                  returnvalue: detailedJob.returnvalue,
                  data: detailedJob.data || job.data,
                  // Keep other fields from detailed job
                  progress: detailedJob.progress,
                  failedReason: detailedJob.failedReason,
                  stacktrace: detailedJob.stacktrace || job.stacktrace
                };
              }
              return job;
            })
          );
          return {
            ...process,
            jobs: enhancedJobs
          };
        })
      );
      return {
        ...company,
        processes: enhancedProcesses
      };
    })
  );
  return enhancedCompanies;
}

export function useCompanies() {
  const [companies, setCompanies] = useState<CustomAPICompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Polling interval (ms)
    const POLL_MS = 10000;
    let intervalId: number | undefined;

    const fetchAndEnhance = async () => {
      try {
        // Only show loading spinner on first load
        setError(null);

        console.log('useCompanies - fetching basic company data...');
        const data = await fetchProcessesByCompany();

        if (!isMounted) return;

        console.log('useCompanies - fetched companies:', data.length);
        if (data.length > 0) {
          console.log('useCompanies - first company:', data[0]);
        }

        console.log('useCompanies - enhancing jobs with detailed data...');
        const enhancedData = await enhanceJobsWithDetailedData(data);

        if (!isMounted) return;
        console.log('useCompanies - enhanced companies:', enhancedData.length);
        setCompanies(enhancedData);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch companies');
          console.error('useCompanies - error:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Initial load
    setIsLoading(true);
    fetchAndEnhance();

    // Start polling
    intervalId = window.setInterval(fetchAndEnhance, POLL_MS);

    // Pause polling when tab is hidden; resume when visible
    const onVisibility = () => {
      if (document.hidden) {
        if (intervalId) window.clearInterval(intervalId);
        intervalId = undefined;
      } else {
        // Trigger an immediate refresh when returning
        fetchAndEnhance();
        intervalId = window.setInterval(fetchAndEnhance, POLL_MS);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      isMounted = false;
      if (intervalId) window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return { companies, isLoading, error };
}
