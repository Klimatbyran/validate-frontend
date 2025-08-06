import { Button } from "@/components/ui/button";
import { Info, Code } from "lucide-react";

interface JobTabsProps {
  activeTab: "user" | "technical";
  onTabChange: (tab: "user" | "technical") => void;
}

export function JobTabs({ activeTab, onTabChange }: JobTabsProps) {
  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-1 mb-8 inline-flex">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onTabChange("user")}
        className={`rounded-md px-6 py-2 font-medium transition-all duration-200 ${
          activeTab === "user"
            ? "bg-blue-03 text-blue-01 shadow-sm"
            : "text-gray-02 hover:text-gray-01 hover:bg-gray-03/30"
        }`}
      >
        <Info className="w-4 h-4 mr-2" />
        Översikt
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onTabChange("technical")}
        className={`rounded-md px-6 py-2 font-medium transition-all duration-200 ${
          activeTab === "technical"
            ? "bg-blue-03 text-blue-01 shadow-sm"
            : "text-gray-02 hover:text-gray-01 hover:bg-gray-03/30"
        }`}
      >
        <Code className="w-4 h-4 mr-2" />
        Tekniska detaljer
      </Button>
    </div>
  );
}
