import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface JsonViewerProps {
  data: any;
}



export function JsonViewer({ data }: JsonViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="font-mono text-sm">
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-03 hover:bg-blue-03/10"
        >
          {isExpanded ? 'Komprimera' : 'Expandera'}
        </Button>
      </div>
      <pre className={`
        bg-gray-03/20 rounded-lg p-3 overflow-x-auto
        ${isExpanded ? 'max-h-none' : 'max-h-32'}
      `}>
        {JSON.stringify(
          typeof data === 'string' ? JSON.parse(data) : data,
          null,
          2
        )}
      </pre>
    </div>
  );
} 