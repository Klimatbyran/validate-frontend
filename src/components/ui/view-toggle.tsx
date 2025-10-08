import React from "react";
import { Eye, List, Grid3X3 } from "lucide-react";

export type ViewLevel = "collapsed" | "compact" | "full";

interface ViewToggleProps {
  currentView: ViewLevel;
  onViewChange: (view: ViewLevel) => void;
  className?: string;
}

interface ViewToggleButtonProps {
  view: ViewLevel;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

const viewConfig = {
  collapsed: {
    icon: Eye,
    label: "Collapsed View",
    activeStyles: "bg-gray-03 text-gray-01 border-gray-02",
    inactiveStyles:
      "bg-transparent text-gray-02 border-gray-02 hover:bg-gray-03 hover:text-gray-01",
  },
  compact: {
    icon: List,
    label: "Compact View",
    activeStyles: "bg-blue-03/20 text-blue-03 border-blue-03",
    inactiveStyles:
      "bg-transparent text-gray-02 border-gray-02 hover:bg-gray-03 hover:text-gray-01",
  },
  full: {
    icon: Grid3X3,
    label: "Full Detail View",
    activeStyles: "bg-green-03/20 text-green-03 border-green-03",
    inactiveStyles:
      "bg-transparent text-gray-02 border-gray-02 hover:bg-gray-03 hover:text-gray-01",
  },
} as const;

function ViewToggleButton({
  view,
  isActive,
  onClick,
  className = "",
}: ViewToggleButtonProps) {
  const config = viewConfig[view];
  const IconComponent = config.icon;

  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg border transition-colors ${
        isActive ? config.activeStyles : config.inactiveStyles
      } ${className}`}
      title={config.label}
    >
      <IconComponent className="w-4 h-4" />
    </button>
  );
}

export function ViewToggle({
  currentView,
  onViewChange,
  className = "",
}: ViewToggleProps) {
  return (
    <div className={`flex gap-2 ${className}`}>
      <ViewToggleButton
        view="collapsed"
        isActive={currentView === "collapsed"}
        onClick={() => onViewChange("collapsed")}
      />
      <ViewToggleButton
        view="compact"
        isActive={currentView === "compact"}
        onClick={() => onViewChange("compact")}
      />
      <ViewToggleButton
        view="full"
        isActive={currentView === "full"}
        onClick={() => onViewChange("full")}
      />
    </div>
  );
}

/**
 * Hook for managing view state with cycling functionality
 */
export function useViewToggle(initialView: ViewLevel = "collapsed") {
  const [currentView, setCurrentView] = React.useState<ViewLevel>(initialView);

  const cycleView = () => {
    if (currentView === "collapsed") setCurrentView("compact");
    else if (currentView === "compact") setCurrentView("full");
    else setCurrentView("collapsed");
  };

  return {
    currentView,
    setCurrentView,
    cycleView,
  };
}
