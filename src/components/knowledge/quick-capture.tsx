"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KnowledgeEditorDialog } from "@/components/knowledge/knowledge-editor-dialog";

/** QuickCapture — tombol global untuk menangkap ide < 10 detik (KNW-02). */
export function QuickCapture({ defaultCategory }: { defaultCategory?: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button aria-label="Tambah catatan" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Tambah
      </Button>
      <KnowledgeEditorDialog
        key={open ? "new-open" : "new-closed"}
        open={open}
        onOpenChange={setOpen}
        defaultCategory={defaultCategory}
        onSaved={() => {
          window.location.reload();
        }}
      />
    </>
  );
}
