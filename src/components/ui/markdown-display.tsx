import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownDisplayProps {
  value: string;
  showRaw?: boolean;
}

export function MarkdownDisplay({ value }: MarkdownDisplayProps) {
  // Remove all triple backticks to ensure tables inside code blocks are rendered as tables
  const valueNoBackticks = value.replace(/```+/g, '');
  // Replace <!-- page: xx --> comments with a divider
  const processedValue = valueNoBackticks.replace(/<!--\s*page\s*:\s*(\d+)\s*-->/gi, '\n---\n**PAGE: $1**\n---\n');

  return (
    <div className="space-y-3">
      <div className="prose prose-sm max-w-none bg-white rounded p-3 border markdown-tables">
        <Markdown remarkPlugins={[remarkGfm]}>{processedValue}</Markdown>
      </div>
    </div>
  );
} 