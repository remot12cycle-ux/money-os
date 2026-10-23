"use client";

import { useState } from "react";
import { ListPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionSheet } from "@/components/forms/transaction-sheet";
import { TaskSheet } from "@/components/forms/task-sheet";
import { TaskItem } from "@/components/lists/task-item";
import { Empty, Rows } from "@/components/ui/primitives";
import type { TaskRow } from "@/lib/db/types";

export function AddTxButton({
  entityId,
  projectId,
  primary,
  label = "Add money",
}: {
  entityId: string;
  projectId?: string | null;
  primary?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={primary ? "primary" : "secondary"} size="sm" onClick={() => setOpen(true)}>
        <Plus /> {label}
      </Button>
      <TransactionSheet open={open} onOpenChange={setOpen} defaults={{ entity_id: entityId, project_id: projectId ?? null, type: "income" }} />
    </>
  );
}

/** Open tasks for a business/project, with an inline "+ Task". */
export function TaskList({ tasks, entityId, projectId }: { tasks: TaskRow[]; entityId: string; projectId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<TaskRow | null>(null);
  return (
    <div className="flex flex-col gap-2">
      {tasks.length ? (
        <Rows>
          {tasks.map((t) => (
            <TaskItem key={t.id} task={t} showEntity={false} onEdit={setEdit} />
          ))}
        </Rows>
      ) : (
        <Empty title="Nothing to do here" body="Add the next step so it shows up on your dashboard too." className="py-6" />
      )}
      <Button size="sm" variant="ghost" className="self-start" onClick={() => setOpen(true)}>
        <ListPlus /> Add task
      </Button>
      <TaskSheet open={open} onOpenChange={setOpen} defaultEntityId={entityId} defaultProjectId={projectId ?? null} />
      <TaskSheet open={Boolean(edit)} onOpenChange={(o) => !o && setEdit(null)} initial={edit} />
    </div>
  );
}
