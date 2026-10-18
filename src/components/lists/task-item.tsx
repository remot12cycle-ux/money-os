"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { useRef_ } from "@/components/ref-provider";
import { EntityDot } from "@/components/ui/primitives";
import { deleteTask, setTaskStatus } from "@/lib/actions/tasks";
import type { TaskRow } from "@/lib/db/types";
import { humanDate, isOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function TaskItem({
  task,
  onEdit,
  showEntity = true,
  dragHandle,
}: {
  task: TaskRow;
  onEdit?: (t: TaskRow) => void;
  showEntity?: boolean;
  dragHandle?: React.ReactNode;
}) {
  const { entities } = useRef_();
  const router = useRouter();
  const [, start] = useTransition();
  const reduce = useReducedMotion();
  const [done, setDone] = useOptimistic(task.status === "done");
  const entity = entities.find((e) => e.id === task.entity_id);
  const overdue = !done && isOverdue(task.due_on);

  function toggle() {
    const next = !done;
    start(async () => {
      setDone(next);
      const res = await setTaskStatus(task.id, next ? "done" : "todo");
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });
  }

  function remove() {
    start(async () => {
      const res = await deleteTask(task.id);
      if (!res.ok) toast.error(res.error);
      else toast.success("Task deleted");
      router.refresh();
    });
  }

  return (
    <motion.div
      layout={!reduce}
      className={cn("group flex min-h-11 items-center gap-3 py-2", done && "opacity-60")}
    >
      {dragHandle}
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? "Mark as not done" : "Mark as done"}
        onClick={toggle}
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-[6px] border transition-colors duration-150",
          done ? "border-mint bg-mint text-on-mint" : "border-hairline-strong hover:border-mint",
        )}
      >
        <motion.span
          initial={false}
          animate={{ scale: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 600, damping: 30 }}
        >
          <Check className="size-3.5" strokeWidth={3} />
        </motion.span>
      </button>
      <div
        className={cn("min-w-0 flex-1", onEdit && "cursor-pointer")}
        onClick={onEdit ? () => onEdit(task) : undefined}
      >
        <div className={cn("truncate text-sm", done && "line-through text-ink-2")}>{task.title}</div>
        <div className="flex items-center gap-2 text-[11px] text-ink-3">
          {task.priority === "high" ? <span className="text-coral">High</span> : null}
          {task.priority === "low" ? <span>Low</span> : null}
          {task.due_on ? (
            <span className={cn("num", overdue && "text-amber")}>
              {overdue ? "Overdue · " : ""}
              {humanDate(task.due_on)}
            </span>
          ) : null}
          {showEntity && entity ? (
            <span className="inline-flex items-center gap-1">
              <EntityDot color={entity.color} />
              {entity.name}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {onEdit ? (
          <button
            type="button"
            className="grid size-8 place-items-center rounded-md text-ink-3 hover:bg-raised hover:text-ink"
            aria-label="Edit task"
            onClick={() => onEdit(task)}
          >
            <Pencil className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          className="grid size-8 place-items-center rounded-md text-ink-3 hover:bg-coral-soft hover:text-coral"
          aria-label="Delete task"
          onClick={remove}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </motion.div>
  );
}
