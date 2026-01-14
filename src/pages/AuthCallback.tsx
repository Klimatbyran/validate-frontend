/**
 * AuthCallback - Handles OAuth callback from GitHub
 * Extracts code from URL, exchanges it for token, and redirects
 */

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { jwtDecode } from "jwt-decode";
import { TokenPayload, User } from "@/lib/auth-types";

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authenticate } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const tokenFromUrl = searchParams.get("token");
    const errorParam = searchParams.get("error");

    // Handle OAuth error from GitHub
    if (errorParam) {
      setError(
        errorParam === "access_denied"
          ? "Inloggning avbruten. Du måste godkänna åtkomst för att fortsätta."
          : `Inloggningsfel: ${errorParam}`
      );
      return;
    }

    // If token is in URL (backend redirected with token), use it directly
    if (tokenFromUrl) {
      try {
        // Validate and decode token
        const decoded = jwtDecode<TokenPayload>(tokenFromUrl);
        const now = Math.floor(Date.now() / 1000);
        
        // Check if expired
        if (decoded.exp < now) {
          setError("Token har gått ut. Försök logga in igen.");
          return;
        }

        // Decode user info
        const user: User = {
          name: decoded.name,
          id: decoded.id,
          email: decoded.email,
          githubId: decoded.githubId,
          githubImageUrl: decoded.githubImageUrl,
        };

        // Store token and user info
        localStorage.setItem("token", tokenFromUrl);
        
        // Clear URL params by navigating to clean URL
        const redirectPath = localStorage.getItem("postLoginRedirect") || "/";
        localStorage.removeItem("postLoginRedirect");
        
        // Reload page to trigger AuthContext to pick up the token
        // This ensures all components get the updated auth state
        window.location.href = redirectPath;
        return;
      } catch (error) {
        console.error("Failed to process token from URL:", error);
        setError("Ogiltig token. Försök logga in igen.");
        return;
      }
    }

    // Check if we have a code
    if (!code) {
      setError("Ingen autentiseringskod mottagen. Försök logga in igen.");
      return;
    }

    // Exchange code for token (state parameter is handled by backend)
    authenticate(code, state)
      .then(() => {
        // Success - redirect will happen in authenticate function
        // This component will unmount
      })
      .catch((err) => {
        console.error("Authentication error:", err);
        setError(
          err?.message ||
            "Kunde inte autentisera. Kontrollera din internetanslutning och försök igen."
        );
      });
  }, [searchParams, authenticate, navigate]);

  // Show loading state
  if (!error) {
    return (
      <div className="min-h-screen bg-gray-05 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-gray-01">Autentiserar...</div>
          <div className="text-sm text-gray-02">
            Vänta medan vi loggar in dig.
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  return (
    <div className="min-h-screen bg-gray-05 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 space-y-4">
        <h2 className="text-xl text-gray-01">Inloggningsfel</h2>
        <p className="text-gray-02">{error}</p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-gray-03 hover:bg-gray-02 text-gray-01 rounded transition-colors"
          >
            Tillbaka
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Försök igen
          </button>
        </div>
      </div>
    </div>
  );
}
