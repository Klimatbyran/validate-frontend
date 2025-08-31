import React from 'react';
import { cn } from '@/lib/utils';

interface SlideshowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'default';
  children: React.ReactNode;
}

export const SlideshowButton: React.FC<SlideshowButtonProps> = ({ 
  variant = 'secondary', 
  size = 'sm',
  className, 
  children, 
  ...props 
}) => {
  const baseClasses = "inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 font-medium";
  
  const sizeClasses = {
    sm: "h-9 px-4",
    default: "h-12 px-6 py-3"
  };
  
  const variantClasses = {
    primary: "bg-gray-01 text-gray-05 hover:opacity-80 active:bg-gray-02",
    secondary: "bg-gray-03 text-gray-01 hover:opacity-80 active:bg-gray-04",
    ghost: "bg-transparent text-gray-01 hover:bg-gray-04/50 active:bg-gray-04"
  };

  return (
    <button
      className={cn(baseClasses, sizeClasses[size], variantClasses[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
};
