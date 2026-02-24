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
  const { t } = useI18n();
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
