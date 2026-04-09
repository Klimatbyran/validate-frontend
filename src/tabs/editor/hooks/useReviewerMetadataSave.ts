import { useCallback, useState } from "react";

export type ReviewerMeta = { comment?: string; source?: string };

export function useReviewerMetadataSave({
  onSave,
  onSaved,
  reset,
}: {
  onSave: (meta?: ReviewerMeta) => Promise<void>;
  onSaved?: () => void;
  reset: () => void;
}) {
  const [comment, setComment] = useState("");
  const [source, setSource] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const resetAll = useCallback(() => {
    reset();
    setComment("");
    setSource("");
    setDialogOpen(false);
  }, [reset]);

  const requestSave = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const confirmSave = useCallback(
    async (meta?: ReviewerMeta) => {
      await onSave(meta);
      onSaved?.();
      setDialogOpen(false);
    },
    [onSave, onSaved]
  );

  return {
    comment,
    setComment,
    source,
    setSource,
    dialogOpen,
    setDialogOpen,
    resetAll,
    requestSave,
    confirmSave,
  };
}

