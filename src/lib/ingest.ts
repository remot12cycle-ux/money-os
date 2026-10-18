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

export function normalizeBody(raw: unknown): { ok: true; items: IngestItem[] } | { ok: false; errors: unknown } {
  const parsed = ingestBody.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten() };
  return { ok: true, items: Array.isArray(parsed.data) ? parsed.data : [parsed.data] };
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
