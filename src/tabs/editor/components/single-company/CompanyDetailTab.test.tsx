import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/contexts/I18nContext";
import type { GarboCompanyDetail } from "../../lib/types";
import { CompanyDetailTab } from "./CompanyDetailTab";

const updateCompany = vi.fn();
const upsertCompanyIdentifier = vi.fn();
const fetchIndustryGics = vi.fn();

vi.mock("../../lib/companies-api", () => ({
  updateCompany: (...args: unknown[]) => updateCompany(...args),
  upsertCompanyIdentifier: (...args: unknown[]) =>
    upsertCompanyIdentifier(...args),
  fetchIndustryGics: () => fetchIndustryGics(),
  updateCompanyIndustry: vi.fn(),
  updateCompanyBaseYear: vi.fn(),
  deleteCompany: vi.fn(),
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
  identifiers: [
    {
      id: "id-w",
      type: "WIKIDATA",
      value: "Q12345",
      metadata: { verifiedBy: null },
    },
    {
      id: "id-l",
      type: "LEI",
      value: "5493001KJTIIGC8Y1R12",
      metadata: { verifiedBy: { name: "Staff User" } },
    },
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

async function saveCoreSection(user: ReturnType<typeof userEvent.setup>) {
  const coreSection = screen
    .getByRole("heading", { name: /Core Info/i })
    .closest("section");
  expect(coreSection).toBeTruthy();

  const saveButtons = within(coreSection as HTMLElement).getAllByRole(
    "button",
    { name: "Save" },
  );
  const coreSave = saveButtons[saveButtons.length - 1];
  expect(coreSave).toBeTruthy();
  await user.click(coreSave!);

  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "Save" }));
}

describe("CompanyDetailTab identifiers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchIndustryGics.mockResolvedValue([]);
    updateCompany.mockResolvedValue(undefined);
    upsertCompanyIdentifier.mockResolvedValue(undefined);
  });

  it("renders editable identifier values with verification badges", async () => {
    await renderTab();

    expect(screen.getByDisplayValue("Q12345")).toBeInTheDocument();
    expect(screen.getByDisplayValue("5493001KJTIIGC8Y1R12")).toBeInTheDocument();
    expect(screen.getByText("Unverified")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("saves an edited identifier via upsertCompanyIdentifier", async () => {
    const user = userEvent.setup();
    await renderTab();

    const wikidataInput = screen.getByDisplayValue("Q12345");
    await user.clear(wikidataInput);
    await user.type(wikidataInput, "Q99999");

    const row = wikidataInput.closest("li");
    expect(row).toBeTruthy();
    await user.click(within(row as HTMLElement).getByRole("button", { name: "Save" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(upsertCompanyIdentifier).toHaveBeenCalledTimes(1);
    });

    expect(upsertCompanyIdentifier).toHaveBeenCalledWith(
      mockCompany.id,
      expect.objectContaining({
        type: "WIKIDATA",
        value: "Q99999",
      }),
    );
  });

  it("rejects invalid wikidata identifier values", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    await renderTab();

    const wikidataInput = screen.getByDisplayValue("Q12345");
    await user.clear(wikidataInput);
    await user.type(wikidataInput, "not-a-wikidata-id");

    const row = wikidataInput.closest("li");
    expect(row).toBeTruthy();
    await user.click(within(row as HTMLElement).getByRole("button", { name: "Save" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });

    expect(upsertCompanyIdentifier).not.toHaveBeenCalled();
  });

  it("adds a new org number identifier", async () => {
    const user = userEvent.setup();
    await renderTab();

    await user.type(
      screen.getByPlaceholderText("Enter identifier value"),
      "556012-1234",
    );
    await user.click(screen.getByRole("button", { name: "Add identifier" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(upsertCompanyIdentifier).toHaveBeenCalledWith(
        mockCompany.id,
        expect.objectContaining({
          type: "ORG_NUMBER",
          value: "556012-1234",
          verified: true,
        }),
      );
    });
  });

  it("core save no longer sends wikidataId or lei", async () => {
    const user = userEvent.setup();
    await renderTab();

    await saveCoreSection(user);

    await waitFor(() => {
      expect(updateCompany).toHaveBeenCalledTimes(1);
    });

    expect(updateCompany).toHaveBeenCalledWith(
      mockCompany.id,
      expect.objectContaining({
        name: "Test Company",
      }),
    );
    expect(updateCompany.mock.calls[0][1]).not.toHaveProperty("wikidataId");
    expect(updateCompany.mock.calls[0][1]).not.toHaveProperty("lei");
  });
});
