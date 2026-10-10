"use client";

import { useState } from "react";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteBehavior } from "@/lib/actions";

interface BehaviorDeleteButtonProps {
  behaviorId: number;
}

export function BehaviorDeleteButton({ behaviorId }: BehaviorDeleteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  

  const handleDelete = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", behaviorId.toString());
      
      const result = await deleteBehavior({ success: false, error: false }, formData);
      
      if (result.success) {
        setShowConfirm(false);
      }
    });
  };

  if (showConfirm) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200 disabled:opacity-50"
        >
          {isPending ? "Archiving..." : "Confirm"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
          className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold hover:bg-gray-200 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="inline-flex items-center px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
      title="Archive record"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
