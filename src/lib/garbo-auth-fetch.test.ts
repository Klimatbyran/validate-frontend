import { beforeEach, describe, expect, it, vi } from "vitest";
import { TOKEN_STORAGE_KEY } from "@/lib/auth-constants";
import {
  garboAuthFetch,
  resetGarboAuthFetchStateForTests,
} from "./garbo-auth-fetch";

describe("garboAuthFetch", () => {
  beforeEach(() => {
    localStorage.clear();
    resetGarboAuthFetchStateForTests();
    vi.restoreAllMocks();
  });

  it("includes Authorization when a token exists", async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, "staff-jwt");
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    await garboAuthFetch("/api/queues/stats");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer staff-jwt");
  });

  it("clears token and dispatches auth-required on 401", async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, "stale-jwt");
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const res = await garboAuthFetch("/api/queues/stats");
    expect(res.status).toBe(401);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(
      dispatchSpy.mock.calls.some(
        ([event]) =>
          event instanceof CustomEvent && event.type === "auth-required",
      ),
    ).toBe(true);
  });

  it("dispatches auth-required only once for concurrent 401 responses", async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, "stale-jwt");
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await Promise.all([garboAuthFetch("/api/a"), garboAuthFetch("/api/b")]);

    const authRequiredEvents = dispatchSpy.mock.calls.filter(
      ([event]) =>
        event instanceof CustomEvent && event.type === "auth-required",
    );
    expect(authRequiredEvents).toHaveLength(1);
  });

  it("refreshes token from x-auth-token on success", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: { "x-auth-token": "fresh-jwt" },
        }),
      ),
    );

    await garboAuthFetch("/api/queues/stats");
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("fresh-jwt");
    expect(
      dispatchSpy.mock.calls.some(
        ([event]) =>
          event instanceof CustomEvent && event.type === "token-updated",
      ),
    ).toBe(true);
  });
});
