import { z } from "zod";

/** Payload accepted by POST /api/ingest (one item or an array). Pure, testable. */
export const ingestItem = z.object({
  external_id: z.string().min(1).max(200).optional(),
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().min(0),
  currency: z.enum(["USD", "MAD"]).default("USD"),
  occurred_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "occurred_on must be yyyy-mm-dd")
    .optional(),
  entity: z.string().min(1).max(80).optional(),
  category: z.string().min(1).max(80).optional(),
  account: z.string().min(1).max(80).optional(),
  note: z.string().max(500).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type IngestItem = z.infer<typeof ingestItem>;

export const ingestBody = z.union([ingestItem, z.array(ingestItem).min(1).max(500)]);

export type IngestError = { index: number; issues: { path: string; message: string }[] };

export function normalizeBody(
  raw: unknown,
): { ok: true; items: IngestItem[] } | { ok: false; errors: IngestError[] | string } {
  if (Array.isArray(raw)) {
    if (raw.length === 0) return { ok: false, errors: "Array must contain at least one item" };
    if (raw.length > 500) return { ok: false, errors: "At most 500 items per call" };
    const items: IngestItem[] = [];
    const errors: IngestError[] = [];
    raw.forEach((r, index) => {
      const p = ingestItem.safeParse(r);
      if (p.success) items.push(p.data);
      else errors.push({ index, issues: p.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
    });
    return errors.length ? { ok: false, errors } : { ok: true, items };
  }
  const p = ingestItem.safeParse(raw);
  if (!p.success) {
    return { ok: false, errors: [{ index: 0, issues: p.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }] };
  }
  return { ok: true, items: [p.data] };
}

/** Case-insensitive match by slug or name. */
export function findByNameOrSlug<T extends { id: string; name: string; slug?: string }>(
  rows: T[],
  needle: string | undefined,
): T | undefined {
  if (!needle) return undefined;
  const n = needle.trim().toLowerCase();
  return rows.find((r) => r.name.toLowerCase() === n || (r.slug && r.slug.toLowerCase() === n));
}
