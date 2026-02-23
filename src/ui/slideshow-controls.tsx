import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from './button';

interface SlideshowControlsProps {
  current: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  onFullscreen?: () => void;
  showFullscreenButton?: boolean;
  fullscreenMode?: boolean;
}

export const SlideshowControls: React.FC<SlideshowControlsProps> = ({
  current,
  total,
  onPrevious,
  onNext,
  onFullscreen,
  showFullscreenButton = false,
  fullscreenMode = false
}) => {
  const { t } = useI18n();
  const progressClasses = fullscreenMode 
    ? "text-lg font-extrabold text-white tracking-wider drop-shadow-lg bg-black/50 rounded-full inline-block px-4 py-1"
    : "text-lg font-extrabold text-gray-01 tracking-wider drop-shadow-sm bg-gray-04/80 backdrop-blur-sm rounded-full inline-block px-4 py-1";

  return (
    <>
      {/* Progress indicator */}
      <div className="w-full flex justify-center mb-1">
        <div className={progressClasses}>
          {current + 1} <span className="opacity-70">/ {total}</span>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className={fullscreenMode ? "absolute top-4 left-4 z-10 flex space-x-2" : "flex items-center space-x-2 w-full justify-center"}>
        <Button
          variant="secondary"
          size="sm"
          onClick={onPrevious}
          aria-label={t("ui.previousScreenshot")}
        >
          {t("ui.prev")}
        </Button>
        
        {showFullscreenButton && onFullscreen && (
          <Button
            variant="primary"
            size="default"
            onClick={onFullscreen}
            aria-label={t("ui.openFullscreenSlideshow")}
          >
            {t("ui.openFullscreenSlideshow")}
          </Button>
        )}
        
        <Button
          variant="secondary"
          size="sm"
          onClick={onNext}
          aria-label={t("ui.nextScreenshot")}
        >
          {t("ui.next")}
        </Button>
      </div>
    </>
  );
};
