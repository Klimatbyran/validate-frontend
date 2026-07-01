import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/contexts/I18nContext";
import type { GarboCompanyDetail } from "../../lib/types";
import { CompanyDetailTab } from "./CompanyDetailTab";

const updateCompany = vi.fn();
const fetchIndustryGics = vi.fn();

vi.mock("../../lib/companies-api", () => ({
  updateCompany: (...args: unknown[]) => updateCompany(...args),
  fetchIndustryGics: () => fetchIndustryGics(),
  updateCompanyIndustry: vi.fn(),
  updateCompanyBaseYear: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockCompany: GarboCompanyDetail = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  name: "Test Company",
  wikidataId: "Q12345",
  tags: ["listed"],
  descriptions: [
    { language: "EN", text: "English description" },
    { language: "SV", text: "Swedish description" },
  ],
};

async function renderTab(company: GarboCompanyDetail = mockCompany) {
  const view = render(
    <I18nProvider>
      <CompanyDetailTab company={company} tagOptions={[]} />
    </I18nProvider>,
  );
  await waitFor(() => {
    expect(fetchIndustryGics).toHaveBeenCalled();
  });
  return view;
}

function getWikidataInput() {
  return screen.getByPlaceholderText("Q123456");
}

async function saveCoreSection(user: ReturnType<typeof userEvent.setup>) {
  const saveButtons = screen.getAllByRole("button", { name: "Save" });
  await user.click(saveButtons[0]);

  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "Save" }));
}

describe("CompanyDetailTab wikidataId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchIndustryGics.mockResolvedValue([]);
    updateCompany.mockResolvedValue(undefined);
  });

  it("renders an editable Wikidata ID field", async () => {
    await renderTab();

    const input = getWikidataInput();
    expect(input).toHaveValue("Q12345");
    expect(input).not.toHaveAttribute("readonly");
  });

  it("sends wikidataId to updateCompany on core save", async () => {
    const user = userEvent.setup();
    await renderTab();

    const input = getWikidataInput();
    await user.clear(input);
    await user.type(input, "Q99999");

    await saveCoreSection(user);

    await waitFor(() => {
      expect(updateCompany).toHaveBeenCalledTimes(1);
    });

    expect(updateCompany).toHaveBeenCalledWith(
      mockCompany.id,
      expect.objectContaining({
        wikidataId: "Q99999",
        name: "Test Company",
      }),
    );
  });

  it("rejects invalid wikidataId and does not call updateCompany", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    await renderTab();

    const input = getWikidataInput();
    await user.clear(input);
    await user.type(input, "not-a-wikidata-id");

    await saveCoreSection(user);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });

    expect(updateCompany).not.toHaveBeenCalled();
  });

  it("omits wikidataId when cleared", async () => {
    const user = userEvent.setup();
    await renderTab();

    const input = getWikidataInput();
    await user.clear(input);

    await saveCoreSection(user);

    await waitFor(() => {
      expect(updateCompany).toHaveBeenCalledTimes(1);
    });

    expect(updateCompany).toHaveBeenCalledWith(
      mockCompany.id,
      expect.objectContaining({
        wikidataId: undefined,
      }),
    );
  });
});
