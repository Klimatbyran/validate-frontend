import React, { useState, useEffect } from "react";
import { SlideshowControls } from "./ui/slideshow-controls";
import { SlideshowImage } from "./ui/slideshow-image";

interface ScreenshotSlideshowProps {
  pdfUrl: string;
  initialIndex?: number;
  fullscreenMode?: boolean;
}

interface ScreenshotsResponse {
  screenshots: string[];
}

export const ScreenshotSlideshow: React.FC<ScreenshotSlideshowProps> = ({
  pdfUrl,
  initialIndex = 0,
  fullscreenMode = false,
}) => {
  const [current, setCurrent] = useState(initialIndex);
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keyboard navigation for fullscreen mode
  useEffect(() => {
    if (!fullscreenMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreenMode, images.length]);

  useEffect(() => {
    const fetchScreenshots = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/screenshots/screenshots?url=${encodeURIComponent(pdfUrl)}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch screenshots: ${response.status} ${response.statusText}`
          );
        }

        const data: ScreenshotsResponse = await response.json();

        if (!data.screenshots || !Array.isArray(data.screenshots)) {
          throw new Error(
            "Invalid response format: screenshots array not found"
          );
        }

        setImages(data.screenshots);

        // Reset current index if it's out of bounds
        if (initialIndex >= data.screenshots.length) {
          setCurrent(0);
        }
      } catch (err) {
        console.error("Error fetching screenshots:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load screenshots"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (pdfUrl) {
      fetchScreenshots();
    }
  }, [pdfUrl, initialIndex]);

  const handlePrev = () =>
    setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  const handleNext = () =>
    setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  const handleFullscreen = () =>
    window.open(
      `/slideshow?pdfUrl=${encodeURIComponent(pdfUrl)}&index=${current}`,
      "_blank"
    );

  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    console.error("Image failed to load:", images[current], e);
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className={
          fullscreenMode
            ? "mb-4 bg-black min-h-screen flex flex-col justify-center items-center"
            : "mb-4"
        }
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <p className={fullscreenMode ? "text-white" : "text-gray-02"}>
            Loading screenshots...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={
          fullscreenMode
            ? "mb-4 bg-black min-h-screen flex flex-col justify-center items-center"
            : "mb-4"
        }
      >
        <div className="text-center">
          <p className={fullscreenMode ? "text-red-400" : "text-red-500"}>
            Error: {error}
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (images.length === 0) {
    return (
      <div
        className={
          fullscreenMode
            ? "mb-4 bg-black min-h-screen flex flex-col justify-center items-center"
            : "mb-4"
        }
      >
        <div className="text-center">
          <p className={fullscreenMode ? "text-white" : "text-gray-02"}>
            No screenshots available
          </p>
        </div>
      </div>
    );
  }

  // Fullscreen mode
  if (fullscreenMode) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col">
        <SlideshowControls
          current={current}
          total={images.length}
          onPrevious={handlePrev}
          onNext={handleNext}
          fullscreenMode={true}
        />

        <SlideshowImage
          src={images[current]}
          alt={`Screenshot ${current + 1}`}
          fullscreenMode={true}
          onError={handleImageError}
        />
      </div>
    );
  }

  // Normal mode
  return (
    <div>
      <SlideshowControls
        current={current}
        total={images.length}
        onPrevious={handlePrev}
        onNext={handleNext}
        onFullscreen={handleFullscreen}
        showFullscreenButton={true}
      />

      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-2 w-full justify-center">
          <SlideshowImage
            src={images[current]}
            alt={`Screenshot ${current + 1}`}
            onError={handleImageError}
          />
        </div>

        <div className="text-center mt-2 text-sm">Screenshot {current + 1}</div>
      </div>
    </div>
  );
};
