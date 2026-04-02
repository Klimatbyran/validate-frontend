import { useI18n } from "@/contexts/I18nContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import type { GarboCompanyDetail, TagOption } from "../lib/types";
import { CompanyDetailTab } from "./CompanyDetailTab";
import { EconomyDataTab } from "./EconomyDataTab";
import { EmissionsDataTab } from "./EmissionsDataTab";
import { GoalsInitiativesTab } from "./GoalsInitiativesTab";

export function CompanyEditDetail({
  company,
  tagOptions,
  onSaved,
}: {
  company: GarboCompanyDetail;
  tagOptions: TagOption[];
  onSaved?: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <Tabs defaultValue="company-detail" className="w-full">
        <TabsList className="w-full justify-start flex flex-wrap h-auto gap-1 p-1 bg-gray-04/80 border border-gray-03 rounded-lg">
          <TabsTrigger value="company-detail" className="rounded-md px-4 py-2">
            {t("editor.singleCompanyView.tabs.companyDetail")} (WIP)
          </TabsTrigger>
          <TabsTrigger value="economy" className="rounded-md px-4 py-2">
            {t("editor.singleCompanyView.tabs.economyData")} (WIP)
          </TabsTrigger>
          <TabsTrigger value="emissions" className="rounded-md px-4 py-2">
            {t("editor.singleCompanyView.tabs.emissionsData")} (WIP)
          </TabsTrigger>
          <TabsTrigger value="goals-initiatives" className="rounded-md px-4 py-2">
            {t("editor.singleCompanyView.tabs.goalsInitiatives")} (WIP)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company-detail" className="mt-4">
          <CompanyDetailTab company={company} tagOptions={tagOptions} onSaved={onSaved} />
        </TabsContent>

        <TabsContent value="economy" className="mt-4">
          <EconomyDataTab company={company} onSaved={onSaved} />
        </TabsContent>

        <TabsContent value="emissions" className="mt-4">
          <EmissionsDataTab company={company} onSaved={onSaved} />
        </TabsContent>

        <TabsContent value="goals-initiatives" className="mt-4">
          <GoalsInitiativesTab company={company} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
