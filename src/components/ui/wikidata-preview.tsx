import React from "react";
import { ExternalLink } from "lucide-react";

interface WikidataProps {
  data: {
    node?: string;
    logo?: string;
    label?: string;
    description?: string;
    [key: string]: any;
  };
}

export function WikidataPreview({ data }: WikidataProps) {
  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  // Extract logo URL from Wikimedia Commons URL if present
  const getLogoUrl = (logoUrl?: string) => {
    if (!logoUrl) return null;

    // If it's a Wikimedia Commons URL, try to extract the filename
    if (logoUrl.includes("commons.wikimedia.org")) {
      const filename = logoUrl.split("/").pop();
      if (filename) {
        // Use the Wikimedia thumbnail API to get a direct image URL
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}?width=200`;
      }
    }

    return logoUrl;
  };

  const logoUrl = getLogoUrl(data.logo);
  const entityUrl = data.node
    ? `https://www.wikidata.org/wiki/${data.node}`
    : null;

  return (
    <div className="bg-gray-04 rounded-lg shadow-sm overflow-hidden border border-gray-03/20">
      <div className="flex items-center p-4">
        {logoUrl && (
          <div className="flex-shrink-0 mr-4">
            <img
              src={logoUrl}
              alt={`${data.label || "Company"} logo`}
              className="w-16 h-16 object-contain"
              onError={e => {
                // Hide the image if it fails to load
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h3 className="text-lg font-medium text-gray-01 truncate">
              {data.label || "Okänt företag"}
            </h3>
            {entityUrl && (
              <a
                href={entityUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-03 hover:text-blue-03/80"
                title="Visa på Wikidata"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          {data.description && (
            <p className="text-sm text-gray-02 mt-1">{data.description}</p>
          )}
          {data.node && (
            <div className="text-xs text-gray-02 mt-2 bg-gray-03/10 px-2 py-1 rounded inline-block">
              {data.node}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
