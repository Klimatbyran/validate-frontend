/**
 * Hook to use AuthContext
 * Extracted to separate file for Fast Refresh compatibility
 */

import { useContext } from "react";
import { AuthContextType } from "@/lib/auth-types";
import { AuthContext } from "@/contexts/AuthContext";

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
