/**
 * Company name override UI for precheck jobs.
 * Lets the user enter a new company name and re-run the job with it.
 */

import { useState } from "react";
import { RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "@/ui/button";
import { Callout } from "@/ui/callout";
import { cn } from "@/lib/utils";

interface CompanyNameOverrideDisplayProps {
  currentCompanyName?: string;
  onOverride?: (overrideCompanyName: string) => void;
}

export function CompanyNameOverrideDisplay({
  currentCompanyName,
  onOverride,
}: CompanyNameOverrideDisplayProps) {
  const [overrideName, setOverrideName] = useState("");
  const [overrideError, setOverrideError] = useState("");

  const handleOverrideChange = (value: string) => {
    setOverrideName(value);
    setOverrideError("");
    if (value && !value.trim()) {
      setOverrideError("Företagsnamn kan inte vara tomt");
    }
  };

  const handleOverrideSubmit = () => {
    if (!overrideName.trim()) {
      setOverrideError("Ange ett företagsnamn");
      return;
    }
    const trimmedName = overrideName.trim();
    if (!trimmedName) {
      setOverrideError("Företagsnamn kan inte vara tomt");
      return;
    }
    if (onOverride) {
      onOverride(trimmedName);
      setOverrideName("");
    }
  };

  return (
    <div className="mb-4 space-y-4">
      <Callout
        variant="info"
        title="Ändra företagsnamn"
        description="Om det företagsnamn som hittades i förkontrollen inte är korrekt, kan du ange ett nytt namn här. Jobbet kommer att köras om med det nya namnet."
      >
        {currentCompanyName && (
          <div className="bg-gray-03/20 rounded-lg p-3">
            <div className="text-xs text-gray-02 mb-1">Nuvarande företagsnamn</div>
            <div className="text-sm text-gray-01 font-medium">{currentCompanyName}</div>
          </div>
        )}

        <div className="space-y-2">
          <div>
            <label
              htmlFor="override-company-name"
              className="block text-xs text-gray-02 mb-1"
            >
              Nytt företagsnamn
            </label>
            <div className="flex items-center space-x-2">
              <input
                id="override-company-name"
                type="text"
                value={overrideName}
                onChange={(e) => handleOverrideChange(e.target.value)}
                placeholder="Ange nytt företagsnamn"
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg border text-sm",
                  "bg-gray-04 text-gray-01",
                  "focus:outline-none focus:ring-2 focus:ring-blue-03 focus:border-transparent",
                  overrideError
                    ? "border-pink-03 focus:ring-pink-03"
                    : "border-gray-03"
                )}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleOverrideSubmit}
                disabled={!!overrideError || !overrideName.trim()}
                className="h-9 px-4"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Spara och kör om
              </Button>
            </div>
            {overrideError && (
              <div className="text-xs text-pink-03 mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>{overrideError}</span>
              </div>
            )}
          </div>
        </div>
      </Callout>
    </div>
  );
}
