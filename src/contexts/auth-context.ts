import { createContext } from "react";
import { AuthContextType } from "@/lib/auth-types";

/**
 * Non-component exports live here for React Fast Refresh compatibility.
 * See eslint rule: react-refresh/only-export-components
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

