"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented, Select, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useRef_ } from "@/components/ref-provider";
import { saveTask } from "@/lib/actions/tasks";
import type { TaskPriority, TaskRow } from "@/lib/db/types";

export function TaskSheet({
  open,
  onOpenChange,
  initial,
  defaultEntityId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: TaskRow | null;
  defaultEntityId?: string | null;
}) {
  const { entities } = useRef_();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [entityId, setEntityId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [due, setDue] = useState("");

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setTitle(initial?.title ?? "");
    setNotes(initial?.notes ?? "");
    setEntityId(initial?.entity_id ?? defaultEntityId ?? "");
    setPriority(initial?.priority ?? "medium");
    setDue(initial?.due_on ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  function submit() {
    start(async () => {
      const res = await saveTask({
        id: initial?.id,
        title,
        notes: notes || null,
        entity_id: entityId || null,
        priority,
        due_on: due || null,
      });
      if (!res.ok) {
        setErrors(res.fields ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(initial ? "Task updated" : "Task added");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "Edit task" : "New task"}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={pending}>
            {initial ? "Save" : "Add task"}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Task" htmlFor="t_title" error={errors.title}>
          <Input
            id="t_title"
            placeholder="What needs doing?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Project" htmlFor="t_entity">
            <Select id="t_entity" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
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
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Sheet>
  );
}
