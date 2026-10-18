"use client";

import { createContext, useContext } from "react";
import type { AccountRow, CategoryRow, EntityRow, ProfileRow } from "@/lib/db/types";

export type RefData = {
  profile: ProfileRow;
  entities: EntityRow[];
  categories: CategoryRow[];
  accounts: AccountRow[];
};

const Ctx = createContext<RefData | null>(null);

export function RefProvider({ value, children }: { value: RefData; children: React.ReactNode }) {
  return <Ctx value={value}>{children}</Ctx>;
}

export function useRef_() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRef_ must be used inside RefProvider");
  return v;
}

export function useEntityMap() {
  const { entities } = useRef_();
  return new Map(entities.map((e) => [e.id, e]));
}
