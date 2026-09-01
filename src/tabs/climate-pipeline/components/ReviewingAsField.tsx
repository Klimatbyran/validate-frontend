import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/contexts/I18nContext";
import {
  getQaReviewerIdentity,
  setQaReviewerIdentity,
} from "../lib/qaReviewerIdentity";

/** Editable reviewer name when not signed in; shows auth name when signed in. */
export function ReviewingAsField() {
  const { t } = useI18n();
  const { user } = useAuth();
  const fromAuth = Boolean(user?.name?.trim() || user?.email?.trim());
  const [name, setName] = useState(() => getQaReviewerIdentity(user) ?? "");

  useEffect(() => {
    setName(getQaReviewerIdentity(user) ?? "");
  }, [user]);

  return (
    <label className="text-xs text-gray-02 flex items-center gap-2">
      {t("climateQaReviews.reviewingAs")}
      {fromAuth ? (
        <span className="text-sm text-gray-01">
          {user?.name?.trim() || user?.email}
        </span>
      ) : (
        <input
          type="text"
          className="h-9 w-44 rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01"
          value={name}
          placeholder={t("climateQaReviews.reviewingAsPlaceholder")}
          onChange={(e) => {
            setName(e.target.value);
            setQaReviewerIdentity(e.target.value);
          }}
        />
      )}
    </label>
  );
}
