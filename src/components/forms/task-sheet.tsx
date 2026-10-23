"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented, Select, Textarea } from "@/components/ui/field";
import { Sheet, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { useRef_ } from "@/components/ref-provider";
import { saveTask } from "@/lib/actions/tasks";
import type { TaskPriority, TaskRow } from "@/lib/db/types";

export function TaskSheet({
  open,
  onOpenChange,
  initial,
  defaultEntityId,
  defaultProjectId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: TaskRow | null;
  defaultEntityId?: string | null;
  defaultProjectId?: string | null;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={initial ? "Edit task" : "New task"}>
      <TaskForm key={initial?.id ?? "new"} initial={initial ?? null} defaultEntityId={defaultEntityId} defaultProjectId={defaultProjectId} close={() => onOpenChange(false)} />
    </Sheet>
  );
}

function TaskForm({
  initial,
  defaultEntityId,
  defaultProjectId,
  close,
}: {
  initial: TaskRow | null;
  defaultEntityId?: string | null;
  defaultProjectId?: string | null;
  close: () => void;
}) {
  const { entities, projects } = useRef_();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState(initial?.title ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [entityId, setEntityId] = useState(initial?.entity_id ?? defaultEntityId ?? "");
  const [projectId, setProjectId] = useState(initial?.project_id ?? defaultProjectId ?? "");
  const entityProjects = projects.filter((p) => p.entity_id === entityId && (p.status !== "archived" || p.id === projectId));
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? "medium");
  const [due, setDue] = useState(initial?.due_on ?? "");

  function submit() {
    start(async () => {
      const res = await saveTask({
        id: initial?.id,
        title,
        notes: notes || null,
        entity_id: entityId || null,
        project_id: entityProjects.some((p) => p.id === projectId) ? projectId : null,
        priority,
        due_on: due || null,
      });
      if (!res.ok) {
        setErrors(res.fields ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(initial ? "Task updated" : "Task added");
      close();
    });
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <SheetBody className="flex flex-col gap-4">
        <Field label="Task" htmlFor="t_title" error={errors.title}>
          <Input id="t_title" placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Area" htmlFor="t_entity">
            <Select
              id="t_entity"
              value={entityId}
              onChange={(e) => {
                setEntityId(e.target.value);
                setProjectId("");
              }}
            >
              <option value="">General</option>
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due" htmlFor="t_due">
            <Input id="t_due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
        </div>
        {entityProjects.length ? (
          <Field label="Project" htmlFor="t_project">
            <Select id="t_project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Whole {entities.find((e) => e.id === entityId)?.name ?? "area"}</option>
              {entityProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-2">Priority</span>
          <Segmented
            value={priority}
            onChange={setPriority}
            className="w-full [&>button]:flex-1"
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium", tone: "amber" },
              { value: "high", label: "High", tone: "coral" },
            ]}
          />
        </div>
        <Field label="Notes" htmlFor="t_notes">
          <Textarea id="t_notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </SheetBody>
      <SheetFooter>
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={pending}>
          {initial ? "Save" : "Add task"}
        </Button>
      </SheetFooter>
    </form>
  );
}
