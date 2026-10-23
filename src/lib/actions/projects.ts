"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidateApp } from "@/lib/revalidate";
import { slugify } from "@/lib/utils";
import { fail, fromZod, ok, type ActionResult } from "./result";

const schema = z.object({
  id: z.uuid().optional(),
  entity_id: z.uuid(),
  name: z.string().trim().min(1, "Give it a name").max(80),
  status: z.enum(["idea", "active", "paused", "archived"]).default("active"),
  url: z
    .string()
    .trim()
    .max(300)
    .optional()
    .nullable()
    .transform((v) => (v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : null)),
  description: z.string().trim().max(1000).optional().nullable(),
});
export type ProjectInput = z.input<typeof schema>;

/** Unique slug inside the business: "notion-clone", "notion-clone-2", … */
async function freeSlug(entityId: string, name: string, selfId?: string) {
  const supabase = await createClient();
  const base = slugify(name) || "project";
  const { data } = await supabase.from("projects").select("id, slug").eq("entity_id", entityId).like("slug", `${base}%`);
  const taken = new Set((data ?? []).filter((r) => r.id !== selfId).map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 500; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now()}`;
}

export async function saveProject(input: ProjectInput): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const slug = await freeSlug(v.entity_id, v.name, v.id);
  const row = {
    entity_id: v.entity_id,
    name: v.name,
    slug,
    status: v.status,
    url: v.url ?? null,
    description: v.description || null,
  };
  if (v.id) {
    const { error } = await supabase.from("projects").update(row).eq("id", v.id);
    if (error) return fail(error.message);
    revalidateApp();
    return ok({ id: v.id, slug });
  }
  const { count } = await supabase.from("projects").select("id", { count: "exact", head: true }).eq("entity_id", v.entity_id);
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...row, sort_order: count ?? 0 })
    .select("id, slug")
    .single();
  if (error) return fail(error.message);
  revalidateApp();
  return ok(data);
}

/** Deleting keeps the money: its transactions stay in the business, just untagged. Notes go with it. */
export async function deleteProject(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return fail("Invalid project");
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidateApp();
  return ok(undefined);
}
