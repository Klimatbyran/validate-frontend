import { Info } from 'lucide-react';

export function HelpTip({ text, widthClassName = 'w-64' }: { text: string; widthClassName?: string }) {
  return (
    <span className="relative inline-flex items-center">
      <Info className="w-3.5 h-3.5 text-blue-03 cursor-help" />
      <span
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 ${widthClassName} opacity-0 group-hover:opacity-100 transition-opacity z-50`}
      >
        <span className="block rounded-md bg-blue-03 text-white text-xs px-3 py-2 shadow-lg">
          {text}
        </span>
        <span className="block w-0 h-0 mx-auto border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-03" />
      </span>
    </span>
  );
}

