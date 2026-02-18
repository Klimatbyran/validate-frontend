import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Info, Code, Copy } from 'lucide-react';
import { MarkdownVectorPagesDisplay } from './markdown-display';
import { CollapsibleSection } from './collapsible-section';

interface MetadataDisplayProps {
  metadata: any;
}

export function MetadataDisplay({ metadata }: MetadataDisplayProps) {
  if (!metadata) return null;

  const sections = [
    {
      key: 'prompt',
      title: 'Prompt',
      icon: <Info />,
      accentIconBg: 'bg-blue-03/20',
      accentTextColor: 'text-blue-03',
      render: (value: string) => (
        <div className="text-gray-01 whitespace-pre-line">{value}</div>
      )
    },
    {
      key: 'context',
      title: 'Markdown',
      icon: <Info />,
      accentIconBg: 'bg-orange-03/20',
      accentTextColor: 'text-orange-03',
      render: (value: string) => (
        <div className="prose max-w-full text-gray-01 prose-invert">
          <MarkdownVectorPagesDisplay value={value} />
        </div>
      )
    },
    {
      key: 'context',
      title: 'Raw Markdown',
      icon: <Code />,
      accentIconBg: 'bg-pink-03/20',
      accentTextColor: 'text-pink-03',
      render: (value: string) => (
        <div>
          <div className="flex justify-end mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const rawText = String(value);
                navigator.clipboard.writeText(rawText);
                toast.success('Raw markdown copied to clipboard');
              }}
              className="text-gray-02 hover:bg-gray-03/40"
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
          </div>
          <div className="text-xs text-gray-02 overflow-x-auto">
            {value}
          </div>
        </div>
      )
    },
    {
      key: 'schema',
      title: 'Schema',
      icon: <Info />,
      accentIconBg: 'bg-green-03/20',
      accentTextColor: 'text-green-03',
      render: (value: any) => (
        <pre className="text-xs text-gray-02 overflow-x-auto mt-2">
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }
  ];

  const hasAnySection = sections.some(section => 
    metadata[section.key] && 
    (typeof metadata[section.key] === 'string' || typeof metadata[section.key] === 'object')
  );

  return (
    <div className="mb-4 max-w-full">
      {sections.map(section => {
        const value = metadata[section.key];
        if (!value || (typeof value !== 'string' && typeof value !== 'object')) return null;

        return (
          <CollapsibleSection
            key={section.key}
            title={section.title}
            icon={section.icon}
            accentIconBg={section.accentIconBg}
            accentTextColor={section.accentTextColor}
          >
            {section.render(value)}
          </CollapsibleSection>
        );
      })}


      {/* Fallback: pretty print JSON if no sections found */}
      {!hasAnySection && (
        <div className="bg-gray-04/50 border border-gray-03 rounded-lg p-4 mb-4 max-w-full overflow-x-auto">
          <h3 className="text-lg font-medium text-gray-01 mb-2 flex items-center">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-03/20 mr-2">
              <Info className="w-4 h-4 text-orange-03" />
            </span>
            Metadata
          </h3>
          <pre className="text-xs text-gray-02 overflow-x-auto mt-2">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 