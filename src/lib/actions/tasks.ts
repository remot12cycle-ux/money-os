"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, fromZod, ok, type ActionResult } from "./result";

const schema = z.object({
  id: z.uuid().optional(),
  title: z.string().min(1, "Write the task").max(200),
  notes: z.string().max(2000).optional().nullable(),
  entity_id: z.uuid().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  due_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(["todo", "doing", "done"]).optional(),
});
export type TaskInput = z.input<typeof schema>;

const revalidate = () => ["/", "/tasks"].forEach((p) => revalidatePath(p));

export async function saveTask(input: TaskInput): Promise<ActionResult<{ id: string }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const row = {
    title: v.title,
    notes: v.notes ?? null,
    entity_id: v.entity_id ?? null,
    priority: v.priority,
    due_on: v.due_on ?? null,
    ...(v.status ? { status: v.status, done_at: v.status === "done" ? new Date().toISOString() : null } : {}),
  };
  if (v.id) {
    const { error } = await supabase.from("tasks").update(row).eq("id", v.id);
    if (error) return fail(error.message);
    revalidate();
    return ok({ id: v.id });
  }
  const { data, error } = await supabase.from("tasks").insert(row).select("id").single();
  if (error) return fail(error.message);
  revalidate();
  return ok({ id: data.id });
}

export async function setTaskStatus(
  id: string,
  status: "todo" | "doing" | "done",
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status, done_at: status === "done" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return fail(error.message);
  revalidate();
  return ok(undefined);
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidate();
  return ok(undefined);
}

export async function reorderTasks(ids: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const results = await Promise.all(
    ids.map((id, i) => supabase.from("tasks").update({ sort_order: i }).eq("id", id)),
  );
  const err = results.find((r) => r.error)?.error;
  if (err) return fail(err.message);
  revalidate();
  return ok(undefined);
}
