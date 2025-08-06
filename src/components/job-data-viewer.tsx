import React from "react";
import { WikidataPreview } from "./wikidata-preview";
import { FiscalYearDisplay } from "./fiscal-year-display";

export function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

// Renders a user-friendly view of JSON data
export function UserFriendlyDataView({ data }: { data: any }) {
  const processedData =
    typeof data === "string" && isJsonString(data) ? JSON.parse(data) : data;

  // List of technical fields to hide from the user-friendly view
  const technicalFields = ["autoApprove", "threadId", "messageId", "url"];

  // Extract special fields
  const wikidataField = processedData.wikidata;
  const hasWikidata = wikidataField && typeof wikidataField === "object";

  // Check if we have fiscal year data
  const hasFiscalYear =
    processedData.fiscalYear ||
    (processedData.startMonth && processedData.endMonth);

  const renderValue = (value: any): React.ReactNode => {
    if (value === null)
      return <span className="text-gray-02">Inget värde</span>;
    if (typeof value === "boolean") return value ? "Ja" : "Nej";
    if (typeof value === "string" || typeof value === "number")
      return String(value);
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc pl-5 space-y-1">
          {value.map((item, i) => (
            <li key={i}>{renderValue(item)}</li>
          ))}
        </ul>
      );
    }
    if (typeof value === "object") {
      return (
        <div className="pl-4 border-l-2 border-gray-03/50 mt-2 space-y-2">
          {Object.entries(value).map(([k, v]) => {
            // Skip technical fields in nested objects too
            if (technicalFields.includes(k)) return null;

            return (
              <div key={k}>
                <span className="font-medium text-gray-01">{k}:</span>{" "}
                {renderValue(v)}
              </div>
            );
          })}
        </div>
      );
    }
    return String(value);
  };

  return (
    <div className="space-y-6">
      {hasWikidata && (
        <div className="bg-gradient-to-r from-green-03/10 to-green-04/10 rounded-xl p-6 border border-green-03/20">
          <WikidataPreview data={wikidataField} />
        </div>
      )}

      {hasFiscalYear && (
        <div className="bg-gradient-to-r from-purple-03/10 to-purple-04/10 rounded-xl p-6 border border-purple-03/20">
          <FiscalYearDisplay data={processedData} />
        </div>
      )}

      <div className="bg-gray-04/80 backdrop-blur-sm rounded-xl p-6 border border-gray-03/30 shadow-sm">
        <div className="space-y-4">
          {Object.entries(processedData).map(([key, value]) => {
            // Skip technical fields and special fields that are handled above
            if (
              technicalFields.includes(key) ||
              key === "wikidata" ||
              key === "fiscalYear" ||
              key === "startMonth" ||
              key === "endMonth"
            ) {
              return null;
            }

            return (
              <div
                key={key}
                className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-4 bg-gray-03/20 rounded-lg border border-gray-03/30"
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-01 mb-2 capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </div>
                  <div className="text-gray-02">{renderValue(value)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function JsonViewer({ data }: { data: any }) {
  const processedData =
    typeof data === "string" && isJsonString(data) ? JSON.parse(data) : data;

  return (
    <div className="space-y-6">
      <pre className="bg-gray-05 rounded-lg p-4 overflow-x-auto text-sm text-gray-01 font-mono whitespace-pre-wrap">
        {JSON.stringify(processedData, null, 2)}
      </pre>
    </div>
  );
}
