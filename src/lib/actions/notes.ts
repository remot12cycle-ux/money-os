"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidateApp } from "@/lib/revalidate";
import { fail, fromZod, ok, type ActionResult } from "./result";

const schema = z
  .object({
    id: z.uuid().optional(),
    entity_id: z.uuid().optional().nullable(),
    project_id: z.uuid().optional().nullable(),
    title: z.string().trim().max(200).optional().nullable(),
    body: z.string().max(20000).default(""),
    is_pinned: z.boolean().optional(),
  })
  .refine((v) => v.id || v.entity_id || v.project_id, { message: "A note needs a business or a project" })
  .refine((v) => (v.title ?? "").trim() || v.body.trim(), { message: "Write something first", path: ["body"] });
export type NoteInput = z.input<typeof schema>;

export async function saveNote(input: NoteInput): Promise<ActionResult<{ id: string }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const row = {
    title: v.title || null,
    body: v.body,
    ...(v.is_pinned === undefined ? {} : { is_pinned: v.is_pinned }),
  };
  if (v.id) {
    const { error } = await supabase.from("notes").update(row).eq("id", v.id);
    if (error) return fail(error.message);
    revalidateApp();
    return ok({ id: v.id });
  }
  const { data, error } = await supabase
    .from("notes")
    .insert({ ...row, entity_id: v.entity_id ?? null, project_id: v.project_id ?? null })
    .select("id")
    .single();
  if (error) return fail(error.message);
  revalidateApp();
  return ok({ id: data.id });
}

export async function setNotePinned(id: string, is_pinned: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return fail("Invalid note");
  const supabase = await createClient();
  const { error } = await supabase.from("notes").update({ is_pinned }).eq("id", id);
  if (error) return fail(error.message);
  revalidateApp();
  return ok(undefined);
}

export async function deleteNote(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return fail("Invalid note");
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidateApp();
  return ok(undefined);
}
