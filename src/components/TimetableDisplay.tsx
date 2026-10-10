"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, Calendar, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { AddTimetableButton } from "./forms/AddTimetableButton";
import { deleteTimetable } from "@/lib/timetableActions";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { ViewGridTimetableModal } from "@/components/schedule/ViewGridTimetableModal";
import {
  TIMETABLE_TARGET_GROUP_LABELS,
  TimetableTargetGroup,
  normalizeTimetableFileUrl,
  getTimetableDownloadUrl,
} from "@/lib/utils";

interface Timetable {
  id: number;
  title: string;
  semester: string;
  academicYear: string;
  targetGroup: string;
  fileUrl: string;
  fileType: string;
  updatedAt: Date;
}

interface TimetableDisplayProps {
  timetables: Timetable[];
  isAdmin: boolean;
}

function resolveTimetableTargetGroup(targetGroup: string): TimetableTargetGroup {
  if (
    targetGroup === "PRE_SCHOOL" ||
    targetGroup === "LOWER_PRIMARY" ||
    targetGroup === "UPPER_PRIMARY" ||
    targetGroup === "JUNIOR_HIGH"
  ) {
    return targetGroup as TimetableTargetGroup;
  }

  return "PRE_SCHOOL";
}

function TimetableCard({ item, isAdmin }: { item: Timetable; isAdmin: boolean }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [gridModalOpen, setGridModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const targetGroup = resolveTimetableTargetGroup(item.targetGroup);

  // Check if this timetable has an actual file attached
  const hasFile = Boolean(item.fileUrl && item.fileUrl.trim() && item.fileUrl.trim() !== "");
  const viewUrl = hasFile ? normalizeTimetableFileUrl(item.fileUrl, item.fileType) : "#";
  const downloadUrl = hasFile ? getTimetableDownloadUrl(item.fileUrl, item.title, item.fileType) : "#";
  const downloadFilename = `${
    item.title.trim().replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "timetable"
  }${item.fileType === "PDF" ? ".pdf" : ""}`;

  const handleView = () => {
    if (!hasFile || viewUrl === "#") {
      setGridModalOpen(true);
      return;
    }
    window.open(viewUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = () => {
    if (!hasFile || downloadUrl === "#") {
      setGridModalOpen(true);
      return;
    }
    try {
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = downloadFilename;
      anchor.rel = "noopener noreferrer";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      console.error("Timetable download error:", error);
      toast.error("Failed to download timetable file.");
    }
  };

  const handleDelete = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", item.id.toString());
      await deleteTimetable({ success: false, error: false }, formData);
      setDeleteOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-primary/10">
        <CardHeader className="bg-muted/30 pb-4">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-background rounded border border-border shadow-sm">
              {item.fileType}
            </span>
          </div>
          <CardTitle className="mt-4 text-xl">{item.title}</CardTitle>
          <CardDescription className="font-medium text-primary/80">
            {item.semester} - {item.academicYear}
          </CardDescription>
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
              {TIMETABLE_TARGET_GROUP_LABELS[targetGroup]}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-6">
            <span>Updated: {format(new Date(item.updatedAt), "MMM dd, yyyy")}</span>
          </div>
          {hasFile ? (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={handleView}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-2"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          ) : (
            <div className="mb-3 py-3 px-4 rounded-lg border border-dashed border-primary/20 bg-primary/5 text-center space-y-2">
              <p className="text-xs text-foreground font-bold">
                Interactive Grid Timetable
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isAdmin
                  ? "This post represents an interactive grid. Click below to view grid or build it in Timetable Builder."
                  : "View the full interactive class timetable grid and download/print as PDF below."}
              </p>
              <button
                type="button"
                onClick={() => setGridModalOpen(true)}
                className="inline-flex items-center justify-center rounded-md text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 gap-1.5 w-full mt-1 transition-all shadow-sm"
              >
                <Eye className="w-4 h-4" />
                View Grid Timetable
              </button>
            </div>
          )}
          {isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              className="w-full flex items-center gap-2"
              onClick={() => setDeleteOpen(true)}
              disabled={isPending}
            >
              <Trash2 className="w-4 h-4" />
              {isPending ? "Deleting..." : "Delete Timetable"}
            </Button>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Timetable"
        description={`Are you sure you want to delete "${item.title}"? This action cannot be undone.`}
        isDeleting={isPending}
      />

      <ViewGridTimetableModal
        open={gridModalOpen}
        onOpenChange={setGridModalOpen}
        targetGroup={item.targetGroup}
        title={item.title}
        semester={item.semester}
        academicYear={item.academicYear}
      />
    </>
  );
}

export function TimetableDisplay({ timetables, isAdmin }: TimetableDisplayProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="text-primary w-6 h-6" />
            Official Termly Timetables
          </h2>
          <p className="text-muted-foreground">Access the official schedules for the current academic session</p>
        </div>
        {isAdmin && <AddTimetableButton />}
      </div>

      {timetables.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {timetables.map((item) => (
            <TimetableCard key={item.id} item={item} isAdmin={isAdmin} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2 py-12 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-muted/50 rounded-full mb-4">
            <FileText className="w-12 h-12 text-muted-foreground/30" />
          </div>
          <CardTitle className="text-muted-foreground">No timetables posted yet</CardTitle>
          <CardDescription className="mb-6">
            The administration has not posted any official timetables yet.
          </CardDescription>
          {isAdmin && <AddTimetableButton />}
        </Card>
      )}
    </div>
  );
}

