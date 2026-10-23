"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented, Textarea } from "@/components/ui/field";
import { ConfirmDialog, Sheet, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { deleteProject, saveProject } from "@/lib/actions/projects";
import type { EntityRow, ProjectRow, ProjectStatus } from "@/lib/db/types";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  idea: "Idea",
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

/** "+ Project" (new) or a pencil (edit), opening the project sheet. */
export function ProjectButton({
  entity,
  project,
  noun = "project",
  variant = "secondary",
}: {
  entity: EntityRow;
  project?: ProjectRow;
  noun?: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {project ? (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Pencil /> Edit
        </Button>
      ) : (
        <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
          <Plus /> New {noun}
        </Button>
      )}
      <Sheet open={open} onOpenChange={setOpen} title={project ? `Edit ${project.name}` : `New ${noun} · ${entity.name}`}>
        <ProjectForm key={project?.id ?? "new"} entity={entity} project={project} noun={noun} close={() => setOpen(false)} />
      </Sheet>
    </>
  );
}

function ProjectForm({
  entity,
  project,
  noun,
  close,
}: {
  entity: EntityRow;
  project?: ProjectRow;
  noun: string;
  close: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const [name, setName] = useState(project?.name ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "active");
  const [url, setUrl] = useState(project?.url ?? "");
  const [description, setDescription] = useState(project?.description ?? "");

  function submit() {
    setErrors({});
    start(async () => {
      const r = await saveProject({ id: project?.id, entity_id: entity.id, name, status, url: url || null, description: description || null });
      if (!r.ok) {
        setErrors(r.fields ?? {});
        return void toast.error(r.error);
      }
      toast.success(project ? "Saved" : `${name} created`);
      close();
      // land on the (possibly renamed) project page
      router.push(`/businesses/${entity.slug}/${r.data.slug}`);
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
        <Field label="Name" htmlFor="p_name" error={errors.name}>
          <Input id="p_name" value={name} onChange={(e) => setName(e.target.value)} placeholder={noun === "product" ? "e.g. Notion templates pack" : "e.g. Invoice app"} autoFocus />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-2">Status</span>
          <Segmented
            value={status}
            onChange={setStatus}
            className="w-full [&>button]:flex-1"
            options={[
              { value: "idea", label: "Idea", tone: "amber" },
              { value: "active", label: "Active", tone: "mint" },
              { value: "paused", label: "Paused" },
              { value: "archived", label: "Archived" },
            ]}
          />
        </div>
        <Field label="Link (optional)" htmlFor="p_url" error={errors.url} hint="Website, store page, dashboard…">
          <Input id="p_url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="myapp.com" inputMode="url" />
        </Field>
        <Field label="What is it? (optional)" htmlFor="p_desc" error={errors.description}>
          <Textarea id="p_desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One or two lines so future-you remembers." />
        </Field>
        {project ? (
          <Button type="button" variant="danger" size="sm" className="self-start" onClick={() => setConfirm(true)}>
            <Trash2 /> Delete {noun}
          </Button>
        ) : null}
      </SheetBody>
      <SheetFooter>
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={pending}>
          {project ? "Save" : `Create ${noun}`}
        </Button>
      </SheetFooter>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${project?.name}?`}
        description="Its notes are deleted. Its transactions and tasks stay in the business, just without a project. Archive it instead if you might come back to it."
        loading={pending}
        onConfirm={() =>
          project &&
          start(async () => {
            const r = await deleteProject(project.id);
            if (!r.ok) return void toast.error(r.error);
            toast.success("Deleted");
            setConfirm(false);
            close();
            router.push(`/businesses/${entity.slug}`);
          })
        }
      />
    </form>
  );
}
