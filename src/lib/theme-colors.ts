/**
 * Centralized color theme constants
 * Provides consistent color classes throughout the application
 */

export const COLORS = {
  // Background colors
  background: {
    primary: "bg-gray-04/80",
    secondary: "bg-gray-03/50",
    tertiary: "bg-gray-03/30",
    card: "bg-gray-05",
    overlay: "bg-gray-04/80 backdrop-blur-sm",
  },

  // Text colors
  text: {
    primary: "text-gray-01",
    secondary: "text-gray-02",
    tertiary: "text-gray-03",
    muted: "text-gray-02",
  },

  // Border colors
  border: {
    primary: "border-gray-03",
    secondary: "border-gray-02",
    subtle: "border-gray-03/50",
  },

  // Status colors
  status: {
    completed: {
      text: "text-green-03",
      background: "bg-green-03/60",
      border: "border-transparent",
    },
    processing: {
      text: "text-blue-03",
      background: "bg-blue-03/60",
      border: "border-blue-03",
    },
    failed: {
      text: "text-pink-03",
      background: "bg-pink-03/60",
      border: "border-transparent",
    },
    needsApproval: {
      text: "text-orange-03",
      background: "bg-orange-03/60",
      border: "border-transparent",
    },
    waiting: {
      text: "text-gray-02",
      background: "bg-gray-03/60",
      border: "border-gray-03",
    },
  },

  // Interactive states
  interactive: {
    hover: "hover:bg-gray-03 hover:text-gray-01",
    active: "bg-gray-03 text-gray-01",
    disabled: "opacity-50 cursor-not-allowed",
  },

  // Layout spacing
  spacing: {
    section: "space-y-6",
    card: "space-y-4",
    item: "space-y-2",
  },
} as const;

/**
 * Get color classes for a specific status
 */
export function getStatusColors(status: keyof typeof COLORS.status) {
  return COLORS.status[status];
}

/**
 * Get background color for a specific context
 */
export function getBackgroundColor(context: keyof typeof COLORS.background) {
  return COLORS.background[context];
}

/**
 * Get text color for a specific context
 */
export function getTextColor(context: keyof typeof COLORS.text) {
  return COLORS.text[context];
}
