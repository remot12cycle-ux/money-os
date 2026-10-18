import { z } from "zod";

const money = z.coerce.number().min(0, "Amount must be positive");
const uuid = z.uuid();
const dateISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const txSchema = z
  .object({
    id: uuid.optional(),
    type: z.enum(["income", "expense", "transfer"]),
    amount: money,
    currency: z.enum(["USD", "MAD"]),
    account_id: uuid,
    to_account_id: uuid.optional().nullable(),
    category_id: uuid.optional().nullable(),
    entity_id: uuid.optional().nullable(),
    occurred_on: dateISO,
    note: z.string().max(500).optional().nullable(),
    meta: z
      .object({
        ad_spend: z.coerce.number().optional(),
        product_cost: z.coerce.number().optional(),
        units: z.coerce.number().int().optional(),
        delivered: z.coerce.number().int().optional(),
        returned: z.coerce.number().int().optional(),
        country: z.string().max(60).optional(),
      })
      .partial()
      .passthrough()
      .optional(),
  })
  .refine((v) => v.type !== "transfer" || (v.to_account_id && v.to_account_id !== v.account_id), {
    message: "Pick a different destination account",
    path: ["to_account_id"],
  });

export type TxInput = z.input<typeof txSchema>;
