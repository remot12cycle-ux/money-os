"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionSheet } from "@/components/forms/transaction-sheet";

export function EntityAddButton({ entityId, primary }: { entityId: string; primary?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={primary ? "primary" : "secondary"} size="sm" onClick={() => setOpen(true)}>
        <Plus /> Add
      </Button>
      <TransactionSheet open={open} onOpenChange={setOpen} defaults={{ entity_id: entityId, type: "income" }} />
    </>
  );
}
