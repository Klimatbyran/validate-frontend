import { beforeEach, describe, expect, it, vi } from "vitest";
import { TOKEN_STORAGE_KEY } from "@/lib/auth-constants";
import { authenticatedFetch } from "./api-helpers";

describe("authenticatedFetch", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("includes Authorization on write requests when a token exists", async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, "test-token");
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    await authenticatedFetch("/test", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/test",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });

  it("includes Authorization on GET requests when a token exists", async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, "test-token");
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    await authenticatedFetch("/test");

    expect(fetchMock).toHaveBeenCalledWith(
      "/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });

  it("does not require login for GET without a token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    await authenticatedFetch("/test");

    expect(fetchMock).toHaveBeenCalledWith("/test", expect.any(Object));
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "show-login-modal" }),
    );
  });

  it("opens login modal for write without a token", async () => {
    let onAction: (() => Promise<void>) | undefined;
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ action?: () => Promise<void> }>)
        .detail;
      onAction = detail?.action;
    };
    window.addEventListener("show-login-modal", listener);

    const promise = authenticatedFetch("/test", { method: "POST" });
    expect(onAction).toBeTypeOf("function");

    localStorage.setItem(TOKEN_STORAGE_KEY, "after-login");
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    await onAction?.();
    await expect(promise).resolves.toBeInstanceOf(Response);

    window.removeEventListener("show-login-modal", listener);
  });
});
