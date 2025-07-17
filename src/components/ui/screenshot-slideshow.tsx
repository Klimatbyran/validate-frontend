import React, { useState, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

interface ScreenshotSlideshowProps {
  pdfUrl: string;
  initialIndex?: number;
  fullscreenMode?: boolean;
}

interface ScreenshotsResponse {
  screenshots: string[];
}

export const ScreenshotSlideshow: React.FC<ScreenshotSlideshowProps> = ({ pdfUrl, initialIndex = 0, fullscreenMode = false }) => {
  const [current, setCurrent] = useState(initialIndex);
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keyboard navigation for fullscreen mode
  useEffect(() => {
    if (!fullscreenMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fullscreenMode, images.length]);

  useEffect(() => {
    const fetchScreenshots = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/screenshots/screenshots?url=${encodeURIComponent(pdfUrl)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch screenshots: ${response.status} ${response.statusText}`);
        }
        
        const data: ScreenshotsResponse = await response.json();
        
        if (!data.screenshots || !Array.isArray(data.screenshots)) {
          throw new Error('Invalid response format: screenshots array not found');
        }
        
        setImages(data.screenshots);
        
        // Reset current index if it's out of bounds
        if (initialIndex >= data.screenshots.length) {
          setCurrent(0);
        }
      } catch (err) {
        console.error('Error fetching screenshots:', err);
        setError(err instanceof Error ? err.message : 'Failed to load screenshots');
      } finally {
        setIsLoading(false);
      }
    };

    if (pdfUrl) {
      fetchScreenshots();
    }
  }, [pdfUrl, initialIndex]);

  const handlePrev = () => setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  const handleNext = () => setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Image failed to load:', images[current], e);
  };

  if (isLoading) {
    return (
      <div className={fullscreenMode ? 'mb-4 bg-black min-h-screen flex flex-col justify-center items-center' : 'mb-4'}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <p className={fullscreenMode ? 'text-white' : 'text-gray-02'}>Loading screenshots...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={fullscreenMode ? 'mb-4 bg-black min-h-screen flex flex-col justify-center items-center' : 'mb-4'}>
        <div className="text-center">
          <p className={fullscreenMode ? 'text-red-400' : 'text-red-500'}>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={fullscreenMode ? 'mb-4 bg-black min-h-screen flex flex-col justify-center items-center' : 'mb-4'}>
        <div className="text-center">
          <p className={fullscreenMode ? 'text-white' : 'text-gray-02'}>No screenshots available</p>
        </div>
      </div>
    );
  }

  // Responsive image sizing for main view
  if (fullscreenMode) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col">
        {/* Progress indicator */}
        <div className="w-full flex justify-center py-2" style={{ zIndex: 10, position: 'relative' }}>
          <div
            className="text-lg font-extrabold"
            style={{
              color: '#fff',
              letterSpacing: '0.04em',
              textShadow: '0 1px 8px rgba(0,0,0,0.5)',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: 6,
              display: 'inline-block',
              padding: '2px 14px',
            }}
          >
            {current + 1} <span style={{ opacity: 0.7 }}>/ {images.length}</span>
          </div>
        </div>
        
        {/* Navigation buttons */}
        <div className="absolute top-4 left-4 z-10 flex space-x-2">
          <button
            onClick={handlePrev}
            className="px-3 py-2 rounded font-bold border shadow"
            style={{
              background: '#111',
              color: '#fff',
              borderColor: '#444',
              minWidth: 60,
              transition: 'background 0.2s',
            }}
            aria-label="Previous screenshot"
          >
            Prev
          </button>
          <button
            onClick={handleNext}
            className="px-3 py-2 rounded font-bold border shadow"
            style={{
              background: '#111',
              color: '#fff',
              borderColor: '#444',
              minWidth: 60,
              transition: 'background 0.2s',
            }}
            aria-label="Next screenshot"
          >
            Next
          </button>
        </div>

        {/* Fullscreen PDF viewer */}
        <div className="flex-1 relative overflow-auto" style={{ minHeight: '100vh' }}>
          <div style={{ 
            width: '100%', 
            height: '100%', 
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px'
          }}>
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={5}
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
                  src={images[current]}
                  alt={`Screenshot ${current + 1}`}
                  style={{
                    width: 'auto',
                    height: 'auto',
                    maxWidth: '95vw',
                    maxHeight: '90vh',
                    cursor: 'grab',
                    display: 'block',
                  }}
                  onError={handleImageError}
                />
              </TransformComponent>
            </TransformWrapper>
          </div>
        </div>
      </div>
    );
  }

  // Normal mode
  return (
    <div className="mb-4">
      <h3 className="font-medium mb-2">Screenshots for PDF</h3>
      {/* Progress indicator */}
      <div className="w-full flex justify-center mb-1">
        <div
          className="text-lg font-extrabold"
          style={{
            color: '#111',
            letterSpacing: '0.04em',
            textShadow: '0 1px 4px rgba(0,0,0,0.12)',
            background: 'rgba(255,255,255,0.85)',
            borderRadius: 6,
            display: 'inline-block',
            padding: '2px 14px',
          }}
        >
          {current + 1} <span style={{ opacity: 0.7 }}>/ {images.length}</span>
        </div>
      </div>
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-2 w-full justify-center">
          <button
            onClick={handlePrev}
            className="px-3 py-2 rounded font-bold border shadow"
            style={{
              background: '#222',
              color: '#fff',
              borderColor: '#444',
              minWidth: 60,
              transition: 'background 0.2s',
            }}
            aria-label="Previous screenshot"
          >
            Prev
          </button>
          <div className="flex-1 flex justify-center" style={{ padding: '2vw', boxSizing: 'border-box' }}>
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={4}
            >
              <TransformComponent>
                <img
                  src={images[current]}
                  alt={`Screenshot ${current + 1}`}
                  style={{
                    maxHeight: '70vh',
                    maxWidth: '100vw',
                    width: 'auto',
                    height: 'auto',
                    borderRadius: 12,
                    border: '1px solid #ccc',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
                    cursor: 'zoom-in',
                    background: '#fff',
                    margin: 'auto',
                    display: 'block',
                    objectFit: 'contain',
                  }}
                  onError={handleImageError}
                />
              </TransformComponent>
            </TransformWrapper>
          </div>
          <button
            onClick={handleNext}
            className="px-3 py-2 rounded font-bold border shadow"
            style={{
              background: '#222',
              color: '#fff',
              borderColor: '#444',
              minWidth: 60,
              transition: 'background 0.2s',
            }}
            aria-label="Next screenshot"
          >
            Next
          </button>
        </div>
        <button
          onClick={() => window.open(`/slideshow?pdfUrl=${encodeURIComponent(pdfUrl)}&index=${current}`, '_blank')}
          className="px-4 py-2 rounded font-bold border shadow"
          style={{
            background: '#0066cc',
            color: '#fff',
            borderColor: '#0052a3',
            transition: 'background 0.2s',
          }}
          aria-label="Open fullscreen slideshow"
        >
          Open Fullscreen
        </button>
        <div className="text-center mt-2 text-sm">
          Screenshot {current + 1}
        </div>
      </div>
    </div>
  );
}; 