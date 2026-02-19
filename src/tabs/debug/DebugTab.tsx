import { useState, useEffect, useCallback } from "react";
import { from, of, EMPTY } from "rxjs";
import { mergeMap, map, toArray, catchError } from "rxjs/operators";
import { motion } from "framer-motion";
import {
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { useCompanies } from "@/hooks/useCompanies";
import { Button } from "@/ui/button";
import { getWorkflowStages } from "@/lib/workflow-config";
import { fetchQueueJobs } from "@/lib/api";
import { toast } from "sonner";
import type { QueueJob } from "@/lib/types";

type QueueWithJobs = { name: string; jobs: QueueJob[] };

export function DebugTab() {
  const { isLoading, error } = useCompanies();
  const [queues, setQueues] = useState<QueueWithJobs[] | null>(null);
  const [queuesLoading, setQueuesLoading] = useState(true);
  const [allJobs, setAllJobs] = useState<QueueJob[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const fetchQueues = useCallback(async (): Promise<QueueWithJobs[]> => {
    const stages = getWorkflowStages();
    const results = await Promise.all(
      stages.map(async (stage) => {
        try {
          const res = await fetchQueueJobs(stage.id);
          const jobs = (res.queue?.jobs ?? []).map((job) => ({
            ...job,
            queueId: res.queue.name,
          }));
          return { name: res.queue.name, jobs };
        } catch {
          return { name: stage.id, jobs: [] };
        }
      })
    );
    return results;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setQueuesLoading(true);
    fetchQueues()
      .then((data) => {
        if (!cancelled) setQueues(data);
      })
      .finally(() => {
        if (!cancelled) setQueuesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchQueues]);

  // Flatten queue jobs into allJobs, sorted by timestamp (newest first)
  useEffect(() => {
    if (!queues) return;

    const subscription = from(queues)
      .pipe(
        mergeMap((queue) => {
          if (!queue?.jobs?.length) return EMPTY;
          return from(queue.jobs).pipe(
            map((job) => ({ ...job, queueId: queue.name }))
          );
        }),
        toArray(),
        map((jobs: QueueJob[]) => jobs.sort((a, b) => b.timestamp - a.timestamp)),
        catchError(() => of([] as QueueJob[]))
      )
      .subscribe({
        next: setAllJobs,
        error: () => setAllJobs([]),
      });

    return () => subscription.unsubscribe();
  }, [queues]);

  const handleRefresh = () => {
    window.dispatchEvent(new CustomEvent("companies:refresh"));
    toast.promise(
      fetchQueues().then((data) => {
        setQueues(data);
      }),
      {
        loading: "Uppdaterar debugvy...",
        success: "Debugvy uppdaterad",
        error: (err: Error) =>
          `Kunde inte uppdatera debugvy: ${err?.message || "Okänt fel"}`,
      }
    );
  };

  if (isLoading || queuesLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 text-gray-02 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-pink-03">
            <AlertCircle className="w-6 h-6 mr-2" />
            <span>{error || "Ett fel uppstod"}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="ml-4 whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Försök igen
          </Button>
        </div>
      </div>
    );
  }

  // Group jobs by threadId and company
  const threads = allJobs.reduce(
    (acc, job) => {
      const threadId = job.data?.threadId ?? `job-${job.id}`;
      const company = job.data?.company || "Unknown";

      if (!acc[threadId]) {
        acc[threadId] = {
          threadId,
          company,
          jobs: [],
          latestTimestamp: 0,
          status: "pending" as
            | "pending"
            | "processing"
            | "completed"
            | "failed",
        };
      }

      acc[threadId].jobs.push(job);
      acc[threadId].latestTimestamp = Math.max(
        acc[threadId].latestTimestamp,
        job.finishedOn || job.processedOn || job.timestamp
      );

      // Update thread status
      if (job.finishedOn && job.isFailed) {
        acc[threadId].status = "failed";
      } else if (job.processedOn && acc[threadId].status !== "failed") {
        acc[threadId].status = "processing";
      } else if (job.finishedOn && acc[threadId].status !== "failed") {
        acc[threadId].status = "completed";
      }

      return acc;
    },
    {} as Record<
      string,
      {
        threadId: string;
        company: string;
        jobs: QueueJob[];
        latestTimestamp: number;
        status: "pending" | "processing" | "completed" | "failed";
      }
    >
  );

  // Convert to array and sort by latest timestamp
  const threadList = Object.values(threads).sort(
    (a, b) => b.latestTimestamp - a.latestTimestamp
  );

  // Filter jobs based on selected thread
  const selectedJobs = selectedThreadId
    ? allJobs.filter((job) => job.data?.threadId === selectedThreadId)
    : allJobs;

  return (
    <div className="space-y-6">
      {/* Thread Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-3xl text-gray-01">Trådar</h3>
            <p className="text-gray-02 mt-1">
              {threadList.length} aktiva trådar
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-gray-02 hover:text-gray-01"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Uppdatera
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {threadList.map((thread) => {
            let statusColor = "bg-gray-03";
            let textColor = "text-gray-01";
            let icon = <Clock className="w-5 h-5" />;

            switch (thread.status) {
              case "completed":
                statusColor = "bg-green-03";
                textColor = "text-green-01";
                icon = <CheckCircle2 className="w-5 h-5" />;
                break;
              case "failed":
                statusColor = "bg-pink-03";
                textColor = "text-pink-01";
                icon = <XCircle className="w-5 h-5" />;
                break;
              case "processing":
                statusColor = "bg-blue-03";
                textColor = "text-blue-01";
                icon = <Clock className="w-5 h-5 animate-spin" />;
                break;
            }

            return (
              <button
                key={thread.threadId}
                onClick={() =>
                  setSelectedThreadId(
                    selectedThreadId === thread.threadId
                      ? null
                      : thread.threadId
                  )
                }
                className={`
                  p-4 rounded-lg text-left
                  transition-colors duration-200
                  ${
                    selectedThreadId === thread.threadId
                      ? statusColor + "/20"
                      : "hover:bg-gray-03/10"
                  }
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={textColor}>{thread.company}</span>
                  <div className={`${statusColor} p-2 rounded-full`}>
                    {icon}
                  </div>
                </div>
                <div className="font-mono text-sm text-gray-02 truncate">
                  {thread.threadId}
                </div>
                <div className="text-sm text-gray-02 mt-1">
                  {thread.jobs.length} jobb
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Job Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-3xl text-gray-01">
            {selectedThreadId ? "Trådens jobb" : "Alla jobb"}
          </h3>
          <div className="text-sm text-gray-02">{selectedJobs.length} jobb</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-03">
                <th className="text-left p-4 text-gray-02">ID</th>
                <th className="text-left p-4 text-gray-02">Kö</th>
                <th className="text-left p-4 text-gray-02">Företag</th>
                <th className="text-left p-4 text-gray-02">Tråd ID</th>
                <th className="text-left p-4 text-gray-02">Status</th>
                <th className="text-left p-4 text-gray-02">Skapad</th>
                <th className="text-left p-4 text-gray-02">Startad</th>
                <th className="text-left p-4 text-gray-02">Avslutad</th>
              </tr>
            </thead>
            <tbody>
              {selectedJobs.map((job) => {
                let statusIcon;
                let statusColor;

                if (job.finishedOn) {
                  if (job.isFailed) {
                    statusIcon = <XCircle className="w-5 h-5 text-pink-03" />;
                    statusColor = "text-pink-03";
                  } else {
                    statusIcon = (
                      <CheckCircle2 className="w-5 h-5 text-green-03" />
                    );
                    statusColor = "text-green-03";
                  }
                } else if (job.processedOn) {
                  statusIcon = (
                    <Clock className="w-5 h-5 text-blue-03 animate-spin" />
                  );
                  statusColor = "text-blue-03";
                } else {
                  statusIcon = <Clock className="w-5 h-5 text-gray-02" />;
                  statusColor = "text-gray-02";
                }

                return (
                  <tr
                    key={`${job.queueId}-${job.id}`}
                    className="border-b border-gray-03/50"
                  >
                    <td className="p-4 text-gray-01 font-mono text-sm">
                      {job.id}
                    </td>
                    <td className="p-4">
                      <span className="text-orange-03">
                        {getWorkflowStages().find((s) => s.id === job.queueId)
                          ?.name || job.queueId}
                      </span>
                    </td>
                    <td className="p-4 text-gray-01">{job.data?.company ?? ""}</td>
                    <td className="p-4 font-mono text-sm text-gray-02">
                      {job.data?.threadId ?? ""}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {statusIcon}
                        <span className={statusColor}>
                          {job.finishedOn
                            ? job.isFailed
                              ? "Misslyckad"
                              : "Klar"
                            : job.processedOn
                            ? "Bearbetar"
                            : "Väntar"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-02">
                      {new Date(job.timestamp).toLocaleString("sv-SE")}
                    </td>
                    <td className="p-4 text-gray-02">
                      {job.processedOn
                        ? new Date(job.processedOn).toLocaleString("sv-SE")
                        : "-"}
                    </td>
                    <td className="p-4 text-gray-02">
                      {job.finishedOn
                        ? new Date(job.finishedOn).toLocaleString("sv-SE")
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
