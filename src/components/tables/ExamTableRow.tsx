"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EditExamModal } from "@/components/forms/EditExamModal";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { deleteExam } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { Eye, Trash2 } from "lucide-react";

interface Exam {
  id: number;
  title: string;
  startTime: Date;
  endTime: Date;
  lesson: {
    id: number;
    name: string;
    subject: {
      name: string;
    };
    class: {
      name: string;
    };
    teacher: {
      id: string; //* Added ID for permission check
      name: string;
      surname: string;
    };
  };
  _count: {
    results: number;
  };
}

interface ExamTableRowProps {
  exam: Exam;
  role: string;
  userId: string;
  lessons: { id: number; name: string }[];
}

export function ExamTableRow({ exam, role, userId, lessons }: ExamTableRowProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canEdit = role === "admin" || (role === "teacher" && userId === exam.lesson.teacher.id);

  const now = new Date();
  const start = new Date(exam.startTime);
  const end = new Date(exam.endTime);
  const status =
    now < start ? "Upcoming" : now > end ? "Closed" : "Active";
  const statusClass =
    status === "Active"
      ? "text-green-600 dark:text-green-400"
      : status === "Closed"
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";

  const handleDelete = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", exam.id.toString());
      await deleteExam({ success: false, error: false }, formData);
      setDeleteOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <tr className="border-b transition-colors hover:bg-muted/50">
        <td className="p-4 font-medium">{exam.title}</td>
        <td className="p-4 text-sm">{exam.lesson.subject.name}</td>
        <td className="p-4 text-sm">{exam.lesson.class.name}</td>
        <td className="p-4 text-sm">
          {exam.lesson.teacher.name} {exam.lesson.teacher.surname}
        </td>
        <td className="p-4 text-sm">
          <div>{format(start, "MMM dd, yyyy")}</div>
          <div className="text-xs text-muted-foreground">
            {format(start, "HH:mm")} - {format(end, "HH:mm")}
          </div>
          <div className={`text-xs font-medium ${statusClass}`}>{status}</div>
        </td>
        <td className="p-4 text-sm">{exam._count.results} students</td>
        <td className="p-4 flex">
          <Link href={`/dashboard/exams/${exam.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Eye className="w-3 h-3" />
              View
            </Button>
          </Link>

          {canEdit && (
             <>
             <EditExamModal data={{
                id: exam.id,
                title: exam.title,
                startTime: exam.startTime,
                endTime: exam.endTime,
                lessonId: exam.lesson.id || 0, //* Should exist
             }} lessons={lessons} />
             
             <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-1 ml-2"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </Button>
             </>
          )}
        </td>
      </tr>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Exam"
        description={`Are you sure you want to delete ${exam.title}? This action cannot be undone.`}
        isDeleting={isPending}
      />
    </>
  );
}

