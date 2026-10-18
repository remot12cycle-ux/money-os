import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TasksView } from "./tasks-view";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .order("status")
    .order("sort_order")
    .order("due_on", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);
  return <TasksView tasks={data ?? []} />;
}
