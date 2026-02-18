import { CopyJsonButton } from "./CopyJsonButton";

interface JsonRawDataBlockProps {
  data: unknown;
}

/**
 * Shared "Visa rådata (JSON)" collapsible block used by scope sections.
 */
export function JsonRawDataBlock({ data }: JsonRawDataBlockProps) {
  return (
    <details className="mt-6 bg-gray-100 rounded p-4 border border-gray-200">
      <summary className="cursor-pointer font-medium text-gray-700 mb-2">
        Visa rådata (JSON)
      </summary>
      <div className="flex justify-end">
        <CopyJsonButton getText={() => JSON.stringify(data, null, 2)} />
      </div>
      <pre className="text-xs text-gray-800 overflow-x-auto mt-2">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}
