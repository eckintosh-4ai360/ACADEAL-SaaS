"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilLine } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { replaceSchoolClassStructure } from "@/lib/actions";
import { schoolClassStructureSchema } from "@/lib/formValidationSchemas";
import {
  buildClassNameFromGradeLevel,
  getStreamLabels,
} from "@/lib/class-management";

interface EditSchoolClassStructureButtonProps {
  currentStreamCount: number;
  hasConfiguredClasses: boolean;
  hasInconsistentStreams: boolean;
}

const STREAM_OPTIONS = [1, 2, 3, 4, 5, 6];

export function EditSchoolClassStructureButton({
  currentStreamCount,
  hasConfiguredClasses,
  hasInconsistentStreams,
}: EditSchoolClassStructureButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [streamCount, setStreamCount] = useState(currentStreamCount.toString());
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const previewLabels = useMemo(() => {
    const parsedCount = Number.parseInt(streamCount, 10);
    const safeCount = Number.isFinite(parsedCount) ? parsedCount : currentStreamCount;
    const labels = getStreamLabels(safeCount);

    return {
      creche: [buildClassNameFromGradeLevel(1)],
      nursery1: [buildClassNameFromGradeLevel(2)],
      nursery2: [buildClassNameFromGradeLevel(3)],
      kg1: labels.map((label) => buildClassNameFromGradeLevel(4, label)),
      basic1: labels.map((label) => buildClassNameFromGradeLevel(6, label)),
      jhs3: labels.map((label) => buildClassNameFromGradeLevel(14, label)),
    };
  }, [currentStreamCount, streamCount]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setMessage("");
      setStreamCount(currentStreamCount.toString());
    }

    setOpen(nextOpen);
  };

  const handleSubmit = () => {
    setMessage("");

    const parsedCount = Number.parseInt(streamCount, 10);
    const validation = schoolClassStructureSchema.safeParse({
      streamCount: parsedCount,
    });

    if (!validation.success) {
      setMessage(validation.error.issues[0]?.message || "Invalid stream count.");
      return;
    }

    startTransition(async () => {
      const result = await replaceSchoolClassStructure(
        { success: false, error: false },
        validation.data
      );

      setMessage(result.message || "");

      if (result.success) {
        setTimeout(() => {
          handleOpenChange(false);
          router.refresh();
        }, 900);
      }
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PencilLine className="mr-2 h-4 w-4" />
        {hasConfiguredClasses ? "Edit Streams" : "Set Streams"}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit School Class Structure</DialogTitle>
            <DialogDescription>
              Set one class structure for the whole school. The order runs from
              Creche to JHS 3, and streams are applied consistently from KG 1
              to JHS 3.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Creche, Nursery 1, and Nursery 2 stay as single classes. The
              stream choice you make here will run from KG 1 to JHS 3.
            </div>

            {hasInconsistentStreams && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                The current setup varies across grades. Saving here will
                normalize the school to one consistent stream layout.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="streamCount">Number of streams</Label>
              <Select
                id="streamCount"
                value={streamCount}
                onChange={(event) => setStreamCount(event.target.value)}
                disabled={isPending}
              >
                {STREAM_OPTIONS.map((count) => (
                  <option key={count} value={count}>
                    {count} stream{count === 1 ? "" : "s"} ({getStreamLabels(count).join(", ")})
                  </option>
                ))}
              </Select>
            </div>

            <div className="rounded-xl border border-dashed border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-950">
              <p className="font-semibold">Preview</p>
              <p className="mt-2">Creche: {previewLabels.creche.join(", ")}</p>
              <p className="mt-1">Nursery 1: {previewLabels.nursery1.join(", ")}</p>
              <p className="mt-1">Nursery 2: {previewLabels.nursery2.join(", ")}</p>
              <p className="mt-1">KG 1: {previewLabels.kg1.join(", ")}</p>
              <p className="mt-1">Basic 1: {previewLabels.basic1.join(", ")}</p>
              <p className="mt-1">JHS 3: {previewLabels.jhs3.join(", ")}</p>
            </div>

            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              Saving will replace the old class structure in this school&apos;s
              database. Any removed streams will be merged into the nearest
              remaining stream for the same grade.
            </div>

            {message && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  message.toLowerCase().includes("failed") ||
                  message.toLowerCase().includes("unauthorized") ||
                  message.toLowerCase().includes("invalid") ||
                  message.toLowerCase().includes("collide")
                    ? "border border-red-200 bg-red-50 text-red-700"
                    : "border border-green-200 bg-green-50 text-green-700"
                }`}
              >
                {message}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={isPending}>
                {isPending ? "Applying..." : "Replace Class Structure"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
