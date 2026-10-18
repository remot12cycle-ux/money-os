import { describe, expect, it } from "vitest";
import { findByNameOrSlug, normalizeBody } from "./ingest";

describe("ingest payload", () => {
  it("accepts a single item with defaults", () => {
    const r = normalizeBody({ type: "expense", amount: "12.5" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.items).toHaveLength(1);
      expect(r.items[0]!.currency).toBe("USD");
      expect(r.items[0]!.amount).toBe(12.5);
    }
  });

  it("accepts an array and rejects empty / oversized ones", () => {
    expect(normalizeBody([{ type: "income", amount: 1 }, { type: "expense", amount: 2 }]).ok).toBe(true);
    expect(normalizeBody([]).ok).toBe(false);
    expect(normalizeBody(Array.from({ length: 501 }, () => ({ type: "income", amount: 1 }))).ok).toBe(false);
  });

  it("rejects transfers, bad dates and negative amounts", () => {
    expect(normalizeBody({ type: "transfer", amount: 1 }).ok).toBe(false);
    expect(normalizeBody({ type: "income", amount: 1, occurred_on: "18/10/2026" }).ok).toBe(false);
    expect(normalizeBody({ type: "income", amount: -1 }).ok).toBe(false);
  });

  it("matches entities by slug or name, case-insensitively", () => {
    const rows = [
      { id: "1", name: "COD Africa", slug: "cod-africa" },
      { id: "2", name: "SaaS", slug: "saas" },
    ];
    expect(findByNameOrSlug(rows, "cod-africa")?.id).toBe("1");
    expect(findByNameOrSlug(rows, "cod africa")?.id).toBe("1");
    expect(findByNameOrSlug(rows, "SAAS")?.id).toBe("2");
    expect(findByNameOrSlug(rows, "nope")).toBeUndefined();
  });
});
