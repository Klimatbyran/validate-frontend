import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  message?: string;
}

export function LoginModal({ 
  isOpen, 
  onClose,
  message = "Du måste logga in för att utföra denna åtgärd."
}: LoginModalProps) {
  const { login } = useAuth();

  const handleLogin = () => {
    login();
    // Note: onClose won't be called because user will be redirected
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose || (() => {})}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inloggning krävs</DialogTitle>
          <DialogDescription>
            {message}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-4">
          <Button onClick={handleLogin} className="w-full">
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
