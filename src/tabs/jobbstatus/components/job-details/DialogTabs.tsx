import { Info, Code, FileText, Globe } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import { Button } from "@/ui/button";
import { QueueJob } from "@/lib/types";
import { getWikidataInfo } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

interface DialogTabsProps {
  activeTab: "user" | "technical";
  setActiveTab: (tab: "user" | "technical") => void;
  job: QueueJob;
}

export function DialogTabs({ activeTab, setActiveTab, job }: DialogTabsProps) {
  const { t } = useI18n();
  const wikidataInfo = getWikidataInfo(job);
  // TODO(i18n/pipeline): once backend guarantees `job.data.url` is always a stable public URL and
  // `JobDataSchema` includes `publicUrl?: string`, simplify this to just use `job.data.url`.
  const reportUrl =
    typeof job.data.publicUrl === "string"
      ? job.data.publicUrl
      : typeof job.data.url === "string"
        ? job.data.url
        : undefined;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "user" | "technical")}>
        <TabsList className="bg-gray-04/50 h-auto p-1">
          <TabsTrigger value="user" className="gap-2 px-4 py-2">
            <Info className="w-4 h-4 shrink-0" />
            {t("jobstatus.jobdetails.tabOverview")}
          </TabsTrigger>
          <TabsTrigger value="technical" className="gap-2 px-4 py-2">
            <Code className="w-4 h-4 shrink-0" />
            {t("jobstatus.jobdetails.tabTechnical")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {reportUrl && (
        <Button variant="ghost" size="sm" asChild className="rounded-full">
          <a
            href={reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <FileText className="w-4 h-4 mr-2" />
            {t("jobstatus.jobdetails.reportLink")}
          </a>
        </Button>
      )}
      {wikidataInfo?.node && (
        <Button variant="ghost" size="sm" asChild className="rounded-full">
          <a
            href={`https://www.wikidata.org/wiki/${wikidataInfo.node}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <Globe className="w-4 h-4 mr-2" />
            {t("jobstatus.jobdetails.wikidataLink")}
          </a>
        </Button>
      )}
    </div>
  );
}
