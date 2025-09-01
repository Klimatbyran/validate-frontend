import React from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

interface SlideshowImageProps {
  src: string;
  alt: string;
  fullscreenMode?: boolean;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export const SlideshowImage: React.FC<SlideshowImageProps> = ({
  src,
  alt,
  fullscreenMode = false,
  onError
}) => {
  const imageClasses = fullscreenMode
    ? "w-auto h-auto max-w-[95vw] max-h-[90vh] cursor-grab block"
    : "max-h-[70vh] max-w-full w-auto h-auto rounded-lg border border-gray-03 shadow-lg cursor-zoom-in bg-white mx-auto block object-contain";

  const wrapperClasses = fullscreenMode
    ? "flex-1 relative overflow-auto min-h-screen"
    : "flex-1 flex justify-center";

  const contentClasses = fullscreenMode
    ? "w-full h-full min-h-screen flex items-center justify-center p-2"
    : "p-[2vw] box-border";

  return (
    <div className={wrapperClasses}>
      <div className={contentClasses}>
        <TransformWrapper
          initialScale={1}
          minScale={fullscreenMode ? 0.5 : 0.5}
          maxScale={fullscreenMode ? 5 : 4}
          centerOnInit
          limitToBounds={true}
          wheel={{ step: 0.1 }}
          panning={{ disabled: false, velocityDisabled: true }}
          doubleClick={{ disabled: true }}
        >
          <TransformComponent
            wrapperStyle={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            contentStyle={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={src}
              alt={alt}
              className={imageClasses}
              onError={onError}
            />
          </TransformComponent>
        </TransformWrapper>
      </div>
    </div>
  );
};
