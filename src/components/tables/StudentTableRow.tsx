"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ViewStudentModal } from "@/components/modals/ViewStudentModal";
import { EditStudentModal } from "@/components/forms/EditStudentModal";
import { GRADE_NAMES, cn } from "@/lib/utils";
import { Pencil, User, UserMinus, Mail } from "lucide-react";
import Image from "next/image";
import { MarkDropoutModal } from "@/components/modals/MarkDropoutModal";
import { SendEmailModal } from "@/components/modals/SendEmailModal";

interface Student {
  id: string;
  username: string;
  studentId?: string;
  name: string;
  surname: string;
  otherNames?: string | null;
  email: string | null;
  phone: string | null;
  address?: string | null;
  bloodType?: string | null;
  sex: string;
  birthday: Date;
  img?: string | null;
  residencyStatus?: string | null;
  house?: string | null;
  guardianName?: string | null;
  contactNumber?: string | null;
  occupation?: string | null;
  nhisNumber?: string | null;
  admissionDate?: Date | null;
  emergencyContact?: string | null;
  class: { id: number; name: string };
  grade: { id: number; level: number };
  parent: { id: string; name?: string; surname?: string; phone?: string; email?: string | null } | null;
}

interface StudentTableRowProps {
  student: Student;
  grades: { id: number; level: number }[];
  classes: { id: number; name: string; gradeId: number }[];
  parents: { id: string; name: string; surname: string; parentUserId?: string | null }[];
  userRole: string;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  showCheckbox?: boolean;
}

export function StudentTableRow({
  student,
  grades,
  classes,
  parents,
  userRole,
  isSelected = false,
  onToggleSelect,
  showCheckbox = false,
}: StudentTableRowProps) {
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [markDropoutOpen, setMarkDropoutOpen] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);

  const canManage = userRole === "admin";

  return (
    <>
      <tr className={cn("border-b transition-colors hover:bg-muted/50", isSelected && "bg-primary/5 dark:bg-primary/10")}>
        {showCheckbox && (
          <td className="p-4 w-12 text-center">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect?.(student.id)}
              aria-label={`Select student ${student.name} ${student.surname}`}
            />
          </td>
        )}
        <td className="p-4">
          <div className="flex items-center space-x-3">
            {student.img ? (
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
                <Image
                  src={student.img}
                  alt={`${student.name} ${student.surname}`}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {student.name.charAt(0)}{student.surname.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium">{student.name} {student.surname}</p>
              <p className="text-sm text-muted-foreground">@{student.username}</p>
            </div>
          </div>
        </td>
        <td className="p-4 text-sm font-mono text-muted-foreground">
          {student.studentId || "PENDING"}
        </td>
        <td className="p-4 text-sm">{student.class.name}</td>
        <td className="p-4 text-sm">{GRADE_NAMES[student.grade.level] || `Grade ${student.grade.level}`}</td>
        <td className="p-4 text-sm">{student.parent?.name} {student.parent?.surname}</td>
        <td className="p-4 text-sm">{student.email || student.phone || "-"}</td>
        <td className="p-4">
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/students/${student.id}`}>
              <Button 
                variant="default" 
                size="sm" 
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
              >
                <User className="w-3 h-3" />
                Profile
              </Button>
            </Link>
            {canManage && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSendEmailOpen(true)}
                  className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                  disabled={!student.parent?.email && !student.email}
                >
                  <Mail className="w-3 h-3" />
                  Email
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setMarkDropoutOpen(true)}
                  className="flex items-center gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  <UserMinus className="w-3 h-3" />
                  Dropout
                </Button>
              </>
            )}
          </div>
        </td>
      </tr>

      <SendEmailModal
        open={sendEmailOpen}
        onOpenChange={setSendEmailOpen}
        recipientEmail={student.parent?.email || student.email || ""}
        recipientName={student.parent ? `${student.parent.name} ${student.parent.surname}` : `${student.name} ${student.surname}`}
      />

      <ViewStudentModal 
        open={viewOpen}
        onOpenChange={setViewOpen}
        student={student}
      />

      <EditStudentModal
        open={editOpen}
        onOpenChange={setEditOpen}
        student={student}
        grades={grades}
        classes={classes}
        parents={parents}
      />

      <MarkDropoutModal 
        open={markDropoutOpen} 
        onOpenChange={setMarkDropoutOpen}
        preSelectedStudent={{
          id: student.id,
          name: student.name,
          surname: student.surname,
          studentId: student.studentId,
          class: student.class,
          grade: student.grade,
        }}
      />
    </>
  );
}
