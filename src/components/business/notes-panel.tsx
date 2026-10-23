"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { Lightbulb, Pin, PinOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { ConfirmDialog, Sheet, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { deleteNote, saveNote, setNotePinned } from "@/lib/actions/notes";
import type { NoteRow } from "@/lib/db/types";
import { humanDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Action =
  | { kind: "add"; note: NoteRow }
  | { kind: "update"; id: string; patch: Partial<NoteRow> }
  | { kind: "remove"; id: string };

function sortNotes(list: NoteRow[]) {
  return [...list].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || b.updated_at.localeCompare(a.updated_at));
}

/**
 * Ideas & notes for a business or one project. Writes are optimistic: a note
 * shows up the moment you save it, the server catches up in the background.
 */
export function NotesPanel({
  notes,
  entityId,
  projectId,
  placeholder = "Capture an idea… (Ctrl/⌘ + Enter to save)",
}: {
  notes: NoteRow[];
  entityId?: string | null;
  projectId?: string | null;
  placeholder?: string;
}) {
  const [list, apply] = useOptimistic(notes, (state: NoteRow[], a: Action) => {
    if (a.kind === "add") return sortNotes([a.note, ...state]);
    if (a.kind === "remove") return state.filter((n) => n.id !== a.id);
    return sortNotes(state.map((n) => (n.id === a.id ? { ...n, ...a.patch } : n)));
  });
  const [, start] = useTransition();
  const [draft, setDraft] = useState("");
  const [edit, setEdit] = useState<NoteRow | null>(null);
  const [confirm, setConfirm] = useState<NoteRow | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  function add() {
    const body = draft.trim();
    if (!body) return;
    const now = new Date().toISOString();
    const temp: NoteRow = {
      id: `temp-${now}`,
      owner_id: "",
      entity_id: entityId ?? null,
      project_id: projectId ?? null,
      title: null,
      body,
      is_pinned: false,
      created_at: now,
      updated_at: now,
    };
    setDraft("");
    start(async () => {
      apply({ kind: "add", note: temp });
      const r = await saveNote({ entity_id: entityId ?? null, project_id: projectId ?? null, body });
      if (!r.ok) {
        toast.error(r.error);
        setDraft(body);
      }
    });
    box.current?.focus();
  }

  function togglePin(n: NoteRow) {
    start(async () => {
      apply({ kind: "update", id: n.id, patch: { is_pinned: !n.is_pinned } });
      const r = await setNotePinned(n.id, !n.is_pinned);
      if (!r.ok) toast.error(r.error);
    });
  }

  function remove(n: NoteRow) {
    setConfirm(null);
    setEdit(null);
    start(async () => {
      apply({ kind: "remove", id: n.id });
      const r = await deleteNote(n.id);
      if (!r.ok) toast.error(r.error);
    });
  }

  function saveEdit(n: NoteRow, body: string) {
    setEdit(null);
    start(async () => {
      apply({ kind: "update", id: n.id, patch: { body, updated_at: new Date().toISOString() } });
      const r = await saveNote({ id: n.id, body, title: null });
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-hairline bg-surface p-2 focus-within:border-mint focus-within:ring-2 focus-within:ring-mint/30">
        <textarea
          ref={box}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              add();
            }
          }}
          rows={draft.split("\n").length > 2 ? Math.min(10, draft.split("\n").length + 1) : 2}
          placeholder={placeholder}
          aria-label="New note"
          className="w-full resize-none bg-transparent px-2 py-1.5 text-[15px] text-ink placeholder:text-ink-3 focus:outline-none"
        />
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-ink-3">First line becomes the title</span>
          <Button size="sm" variant="primary" onClick={add} disabled={!draft.trim()}>
            Save note
          </Button>
        </div>
      </div>

      {list.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((n) => {
            const lines = n.title ? [n.title, ...n.body.split("\n")] : n.body.split("\n");
            const first = lines[0]?.trim();
            const rest = lines.slice(1);
            const temp = n.id.startsWith("temp-");
            return (
              <article
                key={n.id}
                className={cn(
                  "group flex flex-col gap-2 rounded-lg border bg-surface p-3 transition-colors",
                  n.is_pinned ? "border-amber/40" : "border-hairline",
                  temp && "opacity-70",
                )}
              >
                <button type="button" className="flex flex-col gap-1 text-left" onClick={() => !temp && setEdit(n)} disabled={temp}>
                  <h3 className="line-clamp-2 text-sm font-semibold">{first || "Untitled"}</h3>
                  {rest.join("\n").trim() ? (
                    <p className="line-clamp-5 whitespace-pre-line text-sm text-ink-2">{rest.join("\n").trim()}</p>
                  ) : null}
                </button>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
                    {n.is_pinned ? <Pin className="size-3 text-amber" aria-label="Pinned" /> : null}
                    {temp ? "Saving…" : humanDate(n.updated_at.slice(0, 10))}
                  </span>
                  <div className="flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                    <Button size="icon-sm" variant="ghost" aria-label={n.is_pinned ? "Unpin" : "Pin"} onClick={() => togglePin(n)} disabled={temp}>
                      {n.is_pinned ? <PinOff /> : <Pin />}
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Delete note" className="hover:text-coral" onClick={() => setConfirm(n)} disabled={temp}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-hairline-strong px-4 py-5 text-sm text-ink-2">
          <Lightbulb className="size-5 shrink-0 text-amber" aria-hidden />
          No notes yet. Ideas, to-try lists, supplier contacts, launch plans — drop them here.
        </div>
      )}

      <Sheet open={Boolean(edit)} onOpenChange={(o) => !o && setEdit(null)} title="Note" wide>
        {edit ? <EditNote key={edit.id} note={edit} onSave={saveEdit} onDelete={() => setConfirm(edit)} /> : <span />}
      </Sheet>
      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Delete this note?"
        description="It can't be brought back."
        onConfirm={() => confirm && remove(confirm)}
      />
    </div>
  );
}

function EditNote({ note, onSave, onDelete }: { note: NoteRow; onSave: (n: NoteRow, body: string) => void; onDelete: () => void }) {
  const [body, setBody] = useState(note.title ? `${note.title}\n${note.body}` : note.body);
  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (body.trim()) onSave(note, body.trim());
      }}
    >
      <SheetBody className="flex flex-1 flex-col gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[55vh] flex-1 text-[15px] leading-relaxed"
          aria-label="Note"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              if (body.trim()) onSave(note, body.trim());
            }
          }}
        />
        <p className="text-[11px] text-ink-3">Last edited {humanDate(note.updated_at.slice(0, 10))} · Ctrl/⌘ + Enter to save</p>
      </SheetBody>
      <SheetFooter>
        <Button type="button" variant="danger" onClick={onDelete} className="mr-auto">
          <Trash2 /> Delete
        </Button>
        <Button type="submit" variant="primary" disabled={!body.trim()}>
          Save
        </Button>
      </SheetFooter>
    </form>
  );
}
