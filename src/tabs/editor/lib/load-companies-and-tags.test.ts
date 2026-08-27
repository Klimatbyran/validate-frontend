import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadCompaniesAndTagOptions } from "./load-companies-and-tags";

const listCompanies = vi.fn();
const fetchTagOptions = vi.fn();

vi.mock("./companies-api", () => ({
  listCompanies: (...args: unknown[]) => listCompanies(...args),
}));

vi.mock("./tag-options-api", () => ({
  fetchTagOptions: (...args: unknown[]) => fetchTagOptions(...args),
}));

describe("loadCompaniesAndTagOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns companies even when tag options fail", async () => {
    const companies = [
      {
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        name: "Acme",
        wikidataId: "Q1",
      },
    ];
    listCompanies.mockResolvedValue(companies);
    fetchTagOptions.mockRejectedValue(
      new Error("Please log in to view tag options."),
    );

    const result = await loadCompaniesAndTagOptions();

    expect(result.companies).toEqual(companies);
    expect(result.tagOptions).toEqual([]);
  });

  it("throws when the company list fails", async () => {
    listCompanies.mockRejectedValue(
      new Error("Please log in to list companies."),
    );
    fetchTagOptions.mockResolvedValue([]);

    await expect(loadCompaniesAndTagOptions()).rejects.toThrow(
      "Please log in to list companies.",
    );
  });
});
