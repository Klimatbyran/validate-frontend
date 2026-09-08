/**
 * ProtectedRoute - Route guard that blocks unauthenticated access
 * Shows login modal if user is not authenticated
 */

import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Override the prompt when guarding a single tab rather than the whole app. */
  descriptionKey?: "auth.loginRequiredApp" | "auth.loginRequiredTab";
}

export function ProtectedRoute({
  children,
  descriptionKey = "auth.loginRequiredApp",
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, login } = useAuth();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-05 flex items-center justify-center">
        <div className="text-gray-02">{t("common.loading")}</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("auth.loginRequired")}</DialogTitle>
            <DialogDescription>{t(descriptionKey)}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-4">
            <Button onClick={login} className="w-full">
              {t("auth.loginWithGitHub")}
            </Button>
            <p className="text-sm text-gray-02 text-center">
              {t("auth.redirectToGitHub")}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return <>{children}</>;
}
