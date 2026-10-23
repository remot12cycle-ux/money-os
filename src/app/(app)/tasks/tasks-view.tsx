"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { AnimatePresence, Reorder, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Segmented } from "@/components/ui/field";
import { Empty, EntityDot, PageHeader, Rows } from "@/components/ui/primitives";
import { TaskSheet } from "@/components/forms/task-sheet";
import { TaskItem } from "@/components/lists/task-item";
import { useRef_ } from "@/components/ref-provider";
import { reorderTasks, saveTask } from "@/lib/actions/tasks";
import type { TaskRow } from "@/lib/db/types";
import { todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Filter = "open" | "today" | "overdue" | "week" | "done";

export function TasksView({ tasks }: { tasks: TaskRow[] }) {
  const { entities } = useRef_();
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("open");
  const [project, setProject] = useState<string | "all" | "general">("all");
  const [sheet, setSheet] = useState<{ open: boolean; task: TaskRow | null }>({ open: false, task: null });
  const [quick, setQuick] = useState("");
  const [pending, start] = useTransition();

  const [{ today, weekEnd }] = useState(() => ({
    today: todayISO(),
    weekEnd: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
  }));

  const filtered = useMemo(() => {
    let list = tasks;
    if (project === "general") list = list.filter((t) => !t.entity_id);
    else if (project !== "all") list = list.filter((t) => t.entity_id === project);
    switch (filter) {
      case "open":
        return list.filter((t) => t.status !== "done");
      case "today":
        return list.filter((t) => t.status !== "done" && t.due_on === today);
      case "overdue":
        return list.filter((t) => t.status !== "done" && t.due_on && t.due_on < today);
      case "week":
        return list.filter((t) => t.status !== "done" && t.due_on && t.due_on >= today && t.due_on <= weekEnd);
      case "done":
        return list.filter((t) => t.status === "done");
    }
  }, [tasks, filter, project, today, weekEnd]);

  const counts = {
    open: tasks.filter((t) => t.status !== "done").length,
    today: tasks.filter((t) => t.status !== "done" && t.due_on === today).length,
    overdue: tasks.filter((t) => t.status !== "done" && t.due_on && t.due_on < today).length,
    week: tasks.filter((t) => t.status !== "done" && t.due_on && t.due_on >= today && t.due_on <= weekEnd).length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  // local order for drag-reorder (only meaningful on "open" with a project selected or all)
  const [order, setOrder] = useState<string[] | null>(null);
  const ordered = useMemo(() => {
    if (!order) return filtered;
    const map = new Map(filtered.map((t) => [t.id, t]));
    const out = order.map((id) => map.get(id)).filter(Boolean) as TaskRow[];
    for (const t of filtered) if (!order.includes(t.id)) out.push(t);
    return out;
  }, [filtered, order]);

  function quickAdd() {
    const title = quick.trim();
    if (!title) return;
    setQuick("");
    start(async () => {
      const r = await saveTask({
        title,
        entity_id: project !== "all" && project !== "general" ? project : null,
        priority: "medium",
        due_on: filter === "today" ? today : null,
      });
      if (!r.ok) return void toast.error(r.error);
    });
  }

  const groups = useMemo(() => {
    if (project !== "all") return null;
    const map = new Map<string | null, TaskRow[]>();
    for (const t of ordered) {
      const k = t.entity_id;
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    const keys = [null, ...entities.map((e) => e.id)].filter((k) => map.has(k));
    return keys.map((k) => ({ key: k, entity: entities.find((e) => e.id === k) ?? null, items: map.get(k)! }));
  }, [ordered, project, entities]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Tasks" actions={<Button variant="primary" onClick={() => setSheet({ open: true, task: null })}><Plus /> New task</Button>} />

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={filter}
          onChange={(v) => { setFilter(v); setOrder(null); }}
          options={[
            { value: "open", label: `Open · ${counts.open}` },
            { value: "today", label: `Today · ${counts.today}`, tone: "mint" },
            { value: "overdue", label: `Overdue · ${counts.overdue}`, tone: counts.overdue ? "coral" : "neutral" },
            { value: "week", label: `This week · ${counts.week}` },
            { value: "done", label: `Done · ${counts.done}` },
          ]}
        />
        <div className="flex flex-wrap items-center gap-1">
          <ProjectChip active={project === "all"} onClick={() => { setProject("all"); setOrder(null); }}>All</ProjectChip>
          <ProjectChip active={project === "general"} onClick={() => { setProject("general"); setOrder(null); }}>General</ProjectChip>
          {entities.filter((e) => !e.is_archived).map((e) => (
            <ProjectChip key={e.id} active={project === e.id} onClick={() => { setProject(e.id); setOrder(null); }}>
              <EntityDot color={e.color} /> {e.name}
            </ProjectChip>
          ))}
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); quickAdd(); }} className="flex items-center gap-2">
        <Input
          placeholder={`Quick add${project !== "all" && project !== "general" ? ` to ${entities.find((e) => e.id === project)?.name}` : ""}… press Enter`}
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          aria-label="Quick add task"
        />
        <Button type="submit" variant="secondary" disabled={!quick.trim() || pending}>Add</Button>
      </form>

      {ordered.length === 0 ? (
        <Empty title={filter === "done" ? "Nothing done yet" : filter === "overdue" ? "Nothing overdue — nice" : "No tasks here"} body={filter === "open" ? "Type above and press Enter to add one." : undefined} />
      ) : groups ? (
        <div className="flex flex-col gap-8">
          <AnimatePresence initial={false}>
            {groups.map((g) => (
              <motion.section key={g.key ?? "general"} layout={!reduce} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="label mb-1 flex items-center gap-2">
                  {g.entity ? <EntityDot color={g.entity.color} /> : null}
                  {g.entity?.name ?? "General"}
                  <span className="num text-ink-3">{g.items.length}</span>
                </h2>
                <Rows>
                  <AnimatePresence initial={false}>
                    {g.items.map((t) => (
                      <TaskItem key={t.id} task={t} onEdit={(x) => setSheet({ open: true, task: x })} showEntity={false} />
                    ))}
                  </AnimatePresence>
                </Rows>
              </motion.section>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={ordered.map((t) => t.id)}
          onReorder={(ids: string[]) => setOrder(ids)}
          className="divide-y divide-hairline"
          as="div"
        >
          {ordered.map((t) => (
            <Reorder.Item
              key={t.id}
              value={t.id}
              as="div"
              onDragEnd={() => {
                if (order) start(async () => { const r = await reorderTasks(order); if (!r.ok) toast.error(r.error); });
              }}
              className="cursor-grab active:cursor-grabbing"
            >
              <TaskItem task={t} onEdit={(x) => setSheet({ open: true, task: x })} showEntity={false} />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      <TaskSheet open={sheet.open} onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))} initial={sheet.task} defaultEntityId={project !== "all" && project !== "general" ? project : null} />
    </div>
  );
}

function ProjectChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors",
        active ? "bg-mint-soft text-mint" : "bg-raised text-ink-2 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
