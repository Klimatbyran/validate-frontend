import React from 'react';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({ 
  title, 
  icon, 
  bgColor, 
  borderColor, 
  textColor, 
  iconColor, 
  children,
  className = ""
}: CollapsibleSectionProps) {
  return (
    <details className={`${bgColor} border ${borderColor} rounded-lg p-4 mb-4 max-w-full overflow-x-auto ${className}`} style={{padding:0}}>
      <summary className={`text-lg font-medium ${textColor} flex items-center cursor-pointer px-4 py-2 select-none`}>
        <span className={`w-5 h-5 mr-2 ${iconColor}`}>{icon}</span>
        {title}
      </summary>
      <div className="px-4 pb-4 pt-2">
        {children}
      </div>
    </details>
  );
} 