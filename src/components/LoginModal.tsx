import { useAuth } from "@/hooks/useAuth";
import { useOptionalI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

const FALLBACK: Record<string, string> = {
  "auth.loginRequired": "Login required",
  "auth.loginRequiredMessage": "You must log in to perform this action.",
  "auth.loginWithGitHub": "Log in with GitHub",
  "auth.redirectToGitHub": "You will be redirected to GitHub for authentication.",
};

function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? ""));
}

function getT(key: string, params?: Record<string, string | number>): string {
  const value = FALLBACK[key] ?? key;
  return interpolate(value, params);
}

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  message?: string;
}

export function LoginModal({ 
  isOpen, 
  onClose,
  message
}: LoginModalProps) {
  const { login } = useAuth();
  const i18n = useOptionalI18n();
  const t = i18n?.t ?? getT;
  const displayMessage = message ?? t("auth.loginRequiredMessage");

  const handleLogin = () => {
    login();
    // Note: onClose won't be called because user will be redirected
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose || (() => {})}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("auth.loginRequired")}</DialogTitle>
          <DialogDescription>
            {displayMessage}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-4">
          <Button onClick={handleLogin} className="w-full">
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
