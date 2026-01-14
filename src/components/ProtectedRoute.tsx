/**
 * ProtectedRoute - Route guard that blocks unauthenticated access
 * Shows login modal if user is not authenticated
 */

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, login } = useAuth();

  // Show loading state during initial auth check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-05 flex items-center justify-center">
        <div className="text-gray-02">Laddar...</div>
      </div>
    );
  }

  // If not authenticated, show login modal
  if (!isAuthenticated) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inloggning krävs</DialogTitle>
            <DialogDescription>
              Du måste logga in för att använda denna applikation.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-4">
            <Button onClick={login} className="w-full">
              Logga in med GitHub
            </Button>
            <p className="text-sm text-gray-02 text-center">
              Du kommer att omdirigeras till GitHub för autentisering.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // User is authenticated, render protected content
  return <>{children}</>;
}
