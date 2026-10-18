import type { ZodError } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fields?: Record<string, string> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string, fields?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fields };
}

export function fromZod(err: ZodError): ActionResult<never> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fail("Please fix the highlighted fields.", fields);
}

/** FormData → plain object, with empty strings as undefined. */
export function formToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") out[k] = v === "" ? undefined : v;
  }
  return out;
}
