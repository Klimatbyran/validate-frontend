import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  /** Size of the spinner icon. Default 8 = w-8 h-8. */
  size?: 6 | 8;
  /** Optional label shown next to the spinner. */
  label?: string;
  className?: string;
}

/**
 * Shared loading spinner using theme blue (blue-03). Use for loading states
 * across views (swimlane, error-browser, etc.).
 */
export function LoadingSpinner({ size = 8, label, className }: LoadingSpinnerProps) {
  const sizeClass = size === 6 ? 'w-6 h-6' : 'w-8 h-8';

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2 className={cn(sizeClass, 'text-blue-03 animate-spin')} />
      {label && <span className="ml-3 text-gray-02">{label}</span>}
    </div>
  );
}
