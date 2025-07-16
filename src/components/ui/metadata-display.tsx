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
      bgColor: 'bg-blue-100/40',
      borderColor: 'border-blue-300',
      textColor: 'text-blue-900',
      iconColor: 'text-blue-700',
      render: (value: string) => (
        <div className="text-gray-900 whitespace-pre-line">{value}</div>
      )
    },
    {
      key: 'context',
      title: 'Markdown',
      icon: <Info />,
      bgColor: 'bg-yellow-100/40',
      borderColor: 'border-yellow-300',
      textColor: 'text-yellow-900',
      iconColor: 'text-yellow-700',
      render: (value: string) => (
        <div className="prose max-w-full text-gray-900">
          <MarkdownVectorPagesDisplay value={value} />
        </div>
      )
    },
    {
      key: 'context',
      title: 'Raw Markdown',
      icon: <Code />,
      bgColor: 'bg-orange-100/40',
      borderColor: 'border-orange-300',
      textColor: 'text-orange-900',
      iconColor: 'text-orange-700',
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
              className="text-orange-700 hover:bg-orange-100/50"
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
          </div>
          <div className="text-xs text-orange-900 overflow-x-auto">
            {value}
          </div>
        </div>
      )
    },
    {
      key: 'schema',
      title: 'Schema',
      icon: <Info />,
      bgColor: 'bg-green-100/40',
      borderColor: 'border-green-300',
      textColor: 'text-green-900',
      iconColor: 'text-green-700',
      render: (value: any) => (
        <pre className="text-xs text-green-900 overflow-x-auto mt-2">
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
            bgColor={section.bgColor}
            borderColor={section.borderColor}
            textColor={section.textColor}
            iconColor={section.iconColor}
          >
            {section.render(value)}
          </CollapsibleSection>
        );
      })}


      {/* Fallback: pretty print JSON if no sections found */}
      {!hasAnySection && (
        <div className="bg-yellow-100/40 border border-yellow-300 rounded-lg p-4 mb-4 max-w-full overflow-x-auto">
          <h3 className="text-lg font-medium text-yellow-900 mb-2 flex items-center">
            <Info className="w-5 h-5 mr-2 text-yellow-700" /> Metadata
          </h3>
          <pre className="text-xs text-yellow-900 overflow-x-auto mt-2">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 