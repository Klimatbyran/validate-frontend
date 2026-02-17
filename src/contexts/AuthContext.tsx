/**
 * AuthContext - Manages authentication state and provides auth functions
 */

import { createContext, useEffect, useState, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { AuthContextType, TokenPayload, User } from "@/lib/auth-types";
import { authenticateWithGithub, getGithubAuthUrl } from "@/lib/auth-api";

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

const TOKEN_STORAGE_KEY = "token";
const POST_LOGIN_REDIRECT_KEY = "postLoginRedirect";

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

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    // Navigate to home (will trigger login modal if ProtectedRoute is active)
    navigate("/", { replace: true });
  }, [navigate]);

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

        // Determine redirect path after authentication
        // Priority: stored redirect (original page) > backend redirect_uri > home
        const storedRedirect = localStorage.getItem(POST_LOGIN_REDIRECT_KEY);
        const isDev = import.meta.env.DEV;

        let redirectPath = "/";

        // Prefer stored redirect if available (user's original page)
        // In dev mode, always prefer stored redirect to stay on localhost
        if (storedRedirect) {
          redirectPath = storedRedirect;
        } else if (response.redirect_uri) {
          // Backend returned a redirect_uri - use it if no stored redirect
          if (response.redirect_uri.startsWith("http")) {
            // Full URL from backend
            // In dev, don't redirect to external URLs (stay on localhost)
            if (isDev) {
              redirectPath = "/"; // Stay on localhost
            } else {
              // In production, use backend's redirect URL
              window.location.href = response.redirect_uri;
              return;
            }
          } else {
            // Relative path from backend
            redirectPath = response.redirect_uri;
          }
        }

        localStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
        navigate(redirectPath, { replace: true });
      } catch (error) {
        console.error("Authentication failed:", error);
        throw error;
      }
    },
    [navigate]
  );

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      if (isTokenExpired(storedToken)) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
      } else {
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
  // GET requests don't validate, so we can't use them for periodic validation, but this may be worth revisiting.
  // Instead, we currently rely on:
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
      if (document.visibilityState === "visible" && token) {
        // Check if token expired while tab was in background
        if (isTokenExpired(token)) {
          logout();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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

    window.addEventListener(
      "token-updated",
      handleTokenUpdate as EventListener
    );
    window.addEventListener("auth-required", handleAuthRequired);

    return () => {
      window.removeEventListener(
        "token-updated",
        handleTokenUpdate as EventListener
      );
      window.removeEventListener("auth-required", handleAuthRequired);
    };
  }, [logout]);

  const authDisabled =
    import.meta.env.VITE_DISABLE_AUTH === "true" || import.meta.env.VITE_DISABLE_AUTH === "1";
  const devUser: User | null = authDisabled
    ? { name: "Dev (auth disabled)", id: "", email: "", githubId: "", githubImageUrl: "" }
    : null;

  const value: AuthContextType = {
    token,
    user: authDisabled ? devUser : user,
    isLoading: authDisabled ? false : isLoading,
    isAuthenticated: authDisabled || (!!token && !!user),
    login,
    authenticate,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
