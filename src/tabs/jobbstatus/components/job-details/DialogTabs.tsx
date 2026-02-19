import { Info, Code, FileText, Globe } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import { Button } from "@/ui/button";
import { QueueJob } from "@/lib/types";
import { getWikidataInfo } from "@/lib/utils";

interface DialogTabsProps {
  activeTab: "user" | "technical";
  setActiveTab: (tab: "user" | "technical") => void;
  job: QueueJob;
}

export function DialogTabs({ activeTab, setActiveTab, job }: DialogTabsProps) {
  const wikidataInfo = getWikidataInfo(job);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "user" | "technical")}>
        <TabsList className="bg-gray-04/50 h-auto p-1">
          <TabsTrigger value="user" className="gap-2 px-4 py-2">
            <Info className="w-4 h-4 shrink-0" />
            Översikt
          </TabsTrigger>
          <TabsTrigger value="technical" className="gap-2 px-4 py-2">
            <Code className="w-4 h-4 shrink-0" />
            Tekniska detaljer
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {job.data.url && (
        <Button variant="ghost" size="sm" asChild className="rounded-full">
          <a
            href={job.data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <FileText className="w-4 h-4 mr-2" />
            Report
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
            Wikidata
          </a>
        </Button>
      )}
    </div>
  );
}
