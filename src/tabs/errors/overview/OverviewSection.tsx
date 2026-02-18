import { cn } from '@/lib/utils';

interface OverviewSectionProps {
  children: React.ReactNode;
  /** Omit top border and top padding for the first section */
  isFirst?: boolean;
}

const sectionClasses = 'border-t border-gray-03/50 pt-6 pb-6 last:pb-0';

export function OverviewSection({ children, isFirst }: OverviewSectionProps) {
  return (
    <div
      className={cn(
        sectionClasses,
        isFirst && 'first:border-t-0 first:pt-0'
      )}
    >
      {children}
    </div>
  );
}
