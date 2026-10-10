"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddAdminModal } from "@/components/forms/AddAdminModal";

export function AddAdminButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Admin
      </Button>
      <AddAdminModal 
        open={open} 
        onOpenChange={setOpen}
      />
    </>
  );
}

