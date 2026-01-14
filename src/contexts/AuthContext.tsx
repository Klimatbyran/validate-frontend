/**
 * AuthContext - Manages authentication state and provides auth functions
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { AuthContextType, TokenPayload, User } from "@/lib/auth-types";
import { authenticateWithGithub, getGithubAuthUrl } from "@/lib/auth-api";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = "token";
const POST_LOGIN_REDIRECT_KEY = "postLoginRedirect";

/**
 * Decode JWT token and extract user info
 */
function decodeToken(token: string): User | null {
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    return {
      name: decoded.name,
      id: decoded.id,
      email: decoded.email,
      githubId: decoded.githubId,
      githubImageUrl: decoded.githubImageUrl,
    };
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
}

/**
 * Check if token is expired
 */
function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    return decoded.exp < now;
  } catch (error) {
    console.error("Failed to check token expiration:", error);
    return true; // Treat invalid tokens as expired
  }
}

/**
 * Calculate milliseconds until token expires
 */
function getTimeUntilExpiration(token: string): number {
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    const now = Math.floor(Date.now() / 1000);
    const secondsUntilExpiry = decoded.exp - now;
    return Math.max(0, secondsUntilExpiry * 1000); // Convert to milliseconds
  } catch (error) {
    return 0;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * Logout - clear token and user info
   */
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    // Navigate to home (will trigger login modal if ProtectedRoute is active)
    navigate("/", { replace: true });
  }, [navigate]);

  /**
   * Initiate GitHub OAuth login
   * Saves current URL and redirects to GitHub
   */
  const login = useCallback(() => {
    // Save current location for post-login redirect
    const currentPath = window.location.pathname + window.location.search;
    localStorage.setItem(POST_LOGIN_REDIRECT_KEY, currentPath);

    // Redirect to GitHub OAuth
    const authUrl = getGithubAuthUrl();
    window.location.href = authUrl;
  }, []);

  /**
   * Exchange OAuth code for JWT token
   * @param code OAuth code from GitHub callback
   * @param state Optional state parameter from GitHub callback
   */
  const authenticate = useCallback(
    async (code: string, state?: string | null) => {
      try {
        const response = await authenticateWithGithub(code, state);
        const newToken = response.token;

        if (!newToken) {
          console.error("No token in response:", response);
          throw new Error("No token received from server");
        }

        // Validate token before saving
        if (isTokenExpired(newToken)) {
          throw new Error("Received expired token");
        }

        // Save token
        setToken(newToken);
        localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
        console.log("Token saved to localStorage and state");

        // Decode and save user info
        const decodedUser = decodeToken(newToken);
        if (!decodedUser) {
          console.error("Failed to decode token, but token was saved");
        }
        setUser(decodedUser);
        console.log("User info decoded and saved:", decodedUser);

        // Use redirect_uri from backend if provided, otherwise use stored redirect or home
        let redirectPath = "/";
        if (response.redirect_uri) {
          // Backend returned a redirect_uri - use it
          // If it's a full URL, navigate to it; if it's a path, use it as-is
          if (response.redirect_uri.startsWith("http")) {
            window.location.href = response.redirect_uri;
            return; // Don't use navigate for external URLs
          } else {
            redirectPath = response.redirect_uri;
          }
        } else {
          // Fall back to stored redirect or home
          redirectPath =
            localStorage.getItem(POST_LOGIN_REDIRECT_KEY) || "/";
        }

        localStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
        navigate(redirectPath, { replace: true });
      } catch (error) {
        console.error("Authentication failed:", error);
        throw error; // Re-throw so AuthCallback can handle it
      }
    },
    [navigate]
  );

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      if (isTokenExpired(storedToken)) {
        // Token expired, clear it
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
      } else {
        // Valid token
        setToken(storedToken);
        const decodedUser = decodeToken(storedToken);
        setUser(decodedUser);
      }
    }
    setIsLoading(false);
  }, []);

  // Set up auto-logout timer when token changes
  useEffect(() => {
    if (!token) {
      return;
    }

    const timeUntilExpiry = getTimeUntilExpiration(token);
    if (timeUntilExpiry <= 0) {
      // Token already expired
      logout();
      return;
    }

    // Set timer to logout when token expires
    const timer = setTimeout(() => {
      logout();
    }, timeUntilExpiry);

    return () => clearTimeout(timer);
  }, [token, logout]);

  // Note: Backend only validates tokens on write operations (POST/PUT/PATCH/DELETE)
  // GET requests don't validate, so we can't use them for periodic validation
  // Instead, we rely on:
  // 1. Client-side timer (based on JWT exp claim) - handles expiration
  // 2. 401 responses from write operations - handles revocation and clock skew
  // 3. Visibility change - re-check token expiration when user returns to tab
  useEffect(() => {
    if (!token) {
      return;
    }

    // Re-validate token expiration when tab becomes visible
    // This catches cases where token expired while user was away
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && token) {
        // Check if token expired while tab was in background
        if (isTokenExpired(token)) {
          logout();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, logout]);

  // Listen for token updates from API responses
  useEffect(() => {
    const handleTokenUpdate = (event: CustomEvent<string>) => {
      const newToken = event.detail;
      if (newToken && !isTokenExpired(newToken)) {
        setToken(newToken);
        const decodedUser = decodeToken(newToken);
        setUser(decodedUser);
        localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      }
    };

    const handleAuthRequired = () => {
      logout();
    };

    window.addEventListener("token-updated", handleTokenUpdate as EventListener);
    window.addEventListener("auth-required", handleAuthRequired);

    return () => {
      window.removeEventListener("token-updated", handleTokenUpdate as EventListener);
      window.removeEventListener("auth-required", handleAuthRequired);
    };
  }, [logout]);

  const value: AuthContextType = {
    token,
    user,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    authenticate,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
