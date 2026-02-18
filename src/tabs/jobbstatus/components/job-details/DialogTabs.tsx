import { Info, Code, FileText, Globe } from "lucide-react";
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
    <div className="flex items-center space-x-2 mb-6">
      <Button
        variant={activeTab === "user" ? "primary" : "ghost"}
        size="sm"
        onClick={() => setActiveTab("user")}
        className="rounded-full"
      >
        <Info className="w-4 h-4 mr-2" />
        Översikt
      </Button>
      <Button
        variant={activeTab === "technical" ? "primary" : "ghost"}
        size="sm"
        onClick={() => setActiveTab("technical")}
        className="rounded-full"
      >
        <Code className="w-4 h-4 mr-2" />
        Tekniska detaljer
      </Button>
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
