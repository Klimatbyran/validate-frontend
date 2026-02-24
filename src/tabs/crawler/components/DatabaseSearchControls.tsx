import { WandIcon } from "lucide-react";
import { Button } from "@/ui/button";

interface DatabaseSearchControlsProps {
  onReportYearChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch: () => void;
  isSearchDisabled: boolean;
}

const DatabaseSearchControls = ({
  onReportYearChange,
  onSearch,
  isSearchDisabled,
}: DatabaseSearchControlsProps) => {
  return (
    <>
      <h3 className="mb-4">List of all companies in the database</h3>
      <input
        required
        onChange={onReportYearChange}
        placeholder="Ex. 2025"
        className="bg-gray-03/20 w-48 border p-2 mb-4 flex items-center justify-center border-gray-03 rounded-lg text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
      />
      <Button size={"sm"} onClick={onSearch} disabled={isSearchDisabled}>
        Search
        <WandIcon className="w-4 h-4 ml-4" />
      </Button>
    </>
  );
};

export default DatabaseSearchControls;
