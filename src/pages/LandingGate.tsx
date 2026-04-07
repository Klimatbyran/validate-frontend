import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { DEFAULT_TOP_LEVEL_PATH } from "@/lib/top-level-routes";

/**
 * Root `/`: show a full-page login when unauthenticated; redirect to the app when logged in.
 */
export function LandingGate() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-05 flex items-center justify-center p-8">
        <LoadingSpinner label={t("auth.authenticating")} />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={DEFAULT_TOP_LEVEL_PATH} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-05 flex items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg border border-gray-03 bg-gray-04/80 backdrop-blur-sm p-8 shadow-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold text-gray-01">
            {t("auth.loginRequired")}
          </h1>
          <p className="text-sm text-gray-02">{t("auth.loginRequiredApp")}</p>
        </div>
        <div className="flex flex-col gap-4">
          <Button type="button" onClick={() => login()} className="w-full">
            {t("auth.loginWithGitHub")}
          </Button>
          <p className="text-sm text-gray-02 text-center">
            {t("auth.redirectToGitHub")}
          </p>
        </div>
      </div>
    </div>
  );
}
