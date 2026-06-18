import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { getCompany } from "../../lib/companies-api";
import type { GarboCompanyDetail } from "../../lib/types";
import { CompanyEditDetail } from "./CompanyEditDetail";
import { EDITOR_INDEX_PATH } from "../../lib/editor-routes";
import { useSingleCompanyOverviewList } from "../../hooks/useSingleCompanyOverviewList";
import {
  SingleCompanyOverviewFilters,
  SingleCompanyOverviewListAfterSlot,
} from "./SingleCompanyOverviewFilters";
import { SingleCompanyOverviewTable } from "./SingleCompanyOverviewTable";

export function SingleCompanyView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { companyId: companyIdParam } = useParams<{ companyId?: string }>();
  const routeCompanyId = companyIdParam
    ? decodeURIComponent(companyIdParam)
    : null;

  const overviewList = useSingleCompanyOverviewList();

  const [detail, setDetail] = useState<GarboCompanyDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [quickEdit, setQuickEdit] = useState<{
    companyId: string;
    year: string;
  } | null>(null);

  const activeCompanyIdRef = useRef<string | null>(routeCompanyId);
  const detailRefreshTokenRef = useRef(0);

  useEffect(() => {
    activeCompanyIdRef.current = routeCompanyId;
  }, [routeCompanyId]);

  useEffect(() => {
    if (!routeCompanyId) {
      setDetail(null);
      setDetailError(null);
      setLoadingDetail(false);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    setDetailError(null);
    getCompany(routeCompanyId)
      .then((company) => {
        if (!cancelled) setDetail(company);
      })
      .catch((e) => {
        if (!cancelled) {
          setDetailError(e instanceof Error ? e.message : String(e));
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [routeCompanyId]);

  const goBack = useCallback(() => {
    navigate(EDITOR_INDEX_PATH);
  }, [navigate]);

  const detailPending =
    Boolean(routeCompanyId) && (loadingDetail || (!detail && !detailError));

  if (detailPending) {
    return (
      <div className="flex justify-center py-12 bg-gray-04/80 backdrop-blur-sm rounded-lg">
        <LoadingSpinner label={t("editor.singleCompanyView.loadingDetail")} />
      </div>
    );
  }

  if (routeCompanyId && detailError && !loadingDetail) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("editor.singleCompanyView.backToResults")}
          </Button>
        </div>
        <div className="rounded-lg border border-gray-03 bg-gray-05/80 p-4">
          <p className="text-gray-01 font-medium">
            {t("editor.singleCompanyView.loadError")}
          </p>
          <p className="text-sm text-gray-02 mt-1">{detailError}</p>
        </div>
      </div>
    );
  }

  if (routeCompanyId && detail && !loadingDetail) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("editor.singleCompanyView.backToResults")}
          </Button>
        </div>
        <CompanyEditDetail
          company={detail}
          tagOptions={overviewList.tagOptions}
          onSaved={() => {
            const companyIdAtSave = routeCompanyId;

            void overviewList.refreshCompanyList();

            if (!companyIdAtSave) return;

            const token = ++detailRefreshTokenRef.current;
            getCompany(companyIdAtSave)
              .then((company) => {
                if (activeCompanyIdRef.current !== companyIdAtSave) return;
                if (detailRefreshTokenRef.current !== token) return;
                setDetail(company);
              })
              .catch(() => {});
          }}
          onDeleted={() => {
            void overviewList.refreshCompanyList();
            navigate(EDITOR_INDEX_PATH);
          }}
        />
      </div>
    );
  }

  const dash = t("common.placeholderDash");

  return (
    <div className="space-y-4">
      <SingleCompanyOverviewFilters
        list={overviewList}
        afterSlot={<SingleCompanyOverviewListAfterSlot list={overviewList} />}
      />

      <SingleCompanyOverviewTable
        list={overviewList}
        dash={dash}
        quickEdit={quickEdit}
        onQuickEditChange={setQuickEdit}
      />
    </div>
  );
}
