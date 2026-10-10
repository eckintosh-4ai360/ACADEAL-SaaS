"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteLibraryCatalogItem } from "@/lib/libraryCatalogActions";

interface DeleteLibraryCatalogModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  itemId: number | null;
  itemTitle: string | null;
}

export function DeleteLibraryCatalogModal({
  open,
  setOpen,
  itemId,
  itemTitle,
}: DeleteLibraryCatalogModalProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!itemId) return;

    startTransition(async () => {
      const state = await deleteLibraryCatalogItem(itemId);
      if (state.success) {
        toast.success(state.message);
        setOpen(false);
      } else {
        toast.error(state.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete catalog item</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-semibold text-foreground">"{itemTitle}"</span>? This action is permanent and cannot be undone. Any active borrowing records for this item will also be removed.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
