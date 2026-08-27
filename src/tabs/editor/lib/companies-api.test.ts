import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCompanies } from "./companies-api";

const garboAuthFetch = vi.hoisted(() => vi.fn());
const allowUnauthenticatedReads = vi.hoisted(() => vi.fn(() => true));

vi.mock("@/lib/garbo-auth-fetch", () => ({ garboAuthFetch }));
vi.mock("@/lib/auth-constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-constants")>();
  return { ...actual, allowUnauthenticatedReads };
});

const COMPANY = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  name: "Acme",
  wikidataId: "Q12345",
};

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  };
}

describe("listCompanies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    allowUnauthenticatedReads.mockReturnValue(true);
    garboAuthFetch.mockResolvedValue(jsonResponse(200, [COMPANY]));
  });

  it("uses the X-API-Key company list in Vite dev so search works without login", async () => {
    const list = await listCompanies();

    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("Acme");
    const url = String(garboAuthFetch.mock.calls[0]?.[0]);
    expect(url).toContain("/internal-pipeline/companies");
    expect(url).not.toMatch(/\/api\/pipeline\/companies/);
  });

  it("uses the staff JWT company list when unauthenticated reads are off", async () => {
    allowUnauthenticatedReads.mockReturnValue(false);
    await listCompanies();

    const url = String(garboAuthFetch.mock.calls[0]?.[0]);
    expect(url).toContain("/api/pipeline/companies");
    expect(url).not.toContain("/internal-pipeline/companies");
  });

  it("does not ask the user to log in on 401 in Vite dev", async () => {
    garboAuthFetch.mockResolvedValue(jsonResponse(401, "unauthorized"));
    await expect(listCompanies()).rejects.toThrow(
      /Failed to list companies: 401/,
    );
  });
});
