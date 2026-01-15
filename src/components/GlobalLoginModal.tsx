/**
 * GlobalLoginModal - App-level component that listens for login modal events
 * Allows non-React code (like API interceptors) to trigger the login modal
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LoginModal } from "./LoginModal";

interface PendingAction {
  action: () => void | Promise<void>;
}

export function GlobalLoginModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const { isAuthenticated } = useAuth();

  // Listen for show-login-modal events
  useEffect(() => {
    const handleShowLogin = (event: CustomEvent<PendingAction>) => {
      if (event.detail) {
        // Queue the action instead of replacing
        setPendingActions((prev) => [...prev, event.detail]);
      }
      setIsOpen(true);
    };

    window.addEventListener("show-login-modal", handleShowLogin as EventListener);
    
    return () => {
      window.removeEventListener("show-login-modal", handleShowLogin as EventListener);
    };
  }, []);

  // When user becomes authenticated, execute all pending actions and close modal
  useEffect(() => {
    if (isAuthenticated && isOpen && pendingActions.length > 0) {
      // Small delay to ensure token is fully processed
      const timer = setTimeout(() => {
        // Execute all queued actions
        pendingActions.forEach((action) => {
          try {
            action.action();
          } catch (error) {
            console.error("Error executing pending action after login:", error);
          }
        });
        // Clear all pending actions and close modal
        setPendingActions([]);
        setIsOpen(false);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isOpen, pendingActions]);

  const handleClose = () => {
    setIsOpen(false);
    // Don't clear pending actions on close - user might reopen modal
    // Actions will execute when they successfully log in
  };

  return <LoginModal isOpen={isOpen} onClose={handleClose} />;
}
