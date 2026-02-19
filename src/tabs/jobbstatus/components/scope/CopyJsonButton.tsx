import React from 'react';

interface CopyJsonButtonProps {
  getText: () => string;
  className?: string;
}

export function CopyJsonButton({ getText, className = '' }: CopyJsonButtonProps) {
  const [copied, setCopied] = React.useState(false);
  
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50 text-gray-700 border-gray-300 ${className}`}
    >
      {copied ? 'Kopierad' : 'Kopiera'}
    </button>
  );
}
