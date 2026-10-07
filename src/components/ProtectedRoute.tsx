/**
 * Route guard that blocks unauthenticated access with an inline login prompt
 * (does not trap navigation in a non-dismissible dialog).
 */

import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { Callout } from "@/ui/callout";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, login } = useAuth();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-02">{t("common.loading")}</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Callout variant="info">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-blue-03/90">
            {t("auth.loginRequiredTab")}
          </p>
          <Button size="sm" onClick={login} className="shrink-0">
            {t("auth.loginWithGitHub")}
          </Button>
        </div>
      </Callout>
    );
  }

  return <>{children}</>;
}
