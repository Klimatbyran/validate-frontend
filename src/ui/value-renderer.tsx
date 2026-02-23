import { JsonViewer } from "./json-viewer";
import { isJsonString } from "@/lib/utils";

interface ValueRendererProps {
  value: unknown;
}

/**
 * Renders a value, automatically using JsonViewer for JSON strings or objects.
 * Falls back to string representation for other types.
 *
 * This is a generic utility component
 */
export function ValueRenderer({ value }: ValueRendererProps) {
  if (typeof value === "string" && isJsonString(value)) {
    return <JsonViewer data={value} />;
  }
  if (typeof value === "object" && value !== null) {
    return <JsonViewer data={value} />;
  }
  return <>{String(value)}</>;
}
