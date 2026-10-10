"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AddLibraryCatalogModal } from "./AddLibraryCatalogModal";

export function AddLibraryCatalogButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Add catalog item
      </Button>
      <AddLibraryCatalogModal open={open} setOpen={setOpen} />
    </>
  );
}
