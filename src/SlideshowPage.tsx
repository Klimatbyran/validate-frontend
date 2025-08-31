import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { ScreenshotSlideshow } from './components/ui/screenshot-slideshow';

const SlideshowPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const pdfUrl = searchParams.get('pdfUrl') || '';
  const index = parseInt(searchParams.get('index') || '0', 10);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <ScreenshotSlideshow pdfUrl={pdfUrl} initialIndex={index} fullscreenMode />
      </div>
    </div>
  );
};

export default SlideshowPage; 