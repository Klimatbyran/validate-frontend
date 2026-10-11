import { describe, expect, it } from "vitest";
import {
  pageNumberFromSourcePageUrl,
  trustedSourcePageUrl,
} from "./trusted-source-page-url";

describe("trustedSourcePageUrl", () => {
  it("accepts https GCS storage URLs", () => {
    expect(
      trustedSourcePageUrl(
        "https://storage.googleapis.com/bucket/report.pdf#page=12",
      ),
    ).toBe("https://storage.googleapis.com/bucket/report.pdf#page=12");
  });

  it("rejects non-GCS or non-https URLs", () => {
    expect(trustedSourcePageUrl("https://evil.example/x.pdf")).toBeNull();
    expect(
      trustedSourcePageUrl("http://storage.googleapis.com/bucket/x.pdf"),
    ).toBeNull();
  });
});

describe("pageNumberFromSourcePageUrl", () => {
  it("reads the page fragment", () => {
    expect(
      pageNumberFromSourcePageUrl(
        "https://storage.googleapis.com/b/r.pdf#page=7",
      ),
    ).toBe(7);
  });

  it("returns null without a page fragment", () => {
    expect(
      pageNumberFromSourcePageUrl("https://storage.googleapis.com/b/r.pdf"),
    ).toBeNull();
  });
});
