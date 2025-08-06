import React, { useState } from "react";
import { ArrowUp } from "lucide-react";

interface BackToTopButtonProps {
  containerRef?: React.RefObject<HTMLElement>;
  threshold?: number;
  className?: string;
}

export function BackToTopButton({
  containerRef,
  threshold = 100,
  className = "",
}: BackToTopButtonProps) {
  const [showButton, setShowButton] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setShowButton(target.scrollTop > threshold);
  };

  const scrollToTop = () => {
    if (containerRef?.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Fallback to finding the scrollable container
      const scrollableElement = document.querySelector(
        '[role="dialog"]'
      ) as HTMLElement;
      if (scrollableElement) {
        scrollableElement.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  if (!showButton) return null;

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 z-50 p-3 bg-blue-03 text-blue-01 rounded-full shadow-lg hover:bg-blue-04 transition-all duration-200 hover:scale-110 ${className}`}
      title="Tillbaka till toppen"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}

// Hook version for more control
export function useBackToTop(threshold = 100) {
  const [showBackToTop, setShowBackToTop] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setShowBackToTop(target.scrollTop > threshold);
  };

  const scrollToTop = (containerRef?: React.RefObject<HTMLElement>) => {
    if (containerRef?.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const scrollableElement = document.querySelector(
        '[role="dialog"]'
      ) as HTMLElement;
      if (scrollableElement) {
        scrollableElement.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  return {
    showBackToTop,
    handleScroll,
    scrollToTop,
  };
}
