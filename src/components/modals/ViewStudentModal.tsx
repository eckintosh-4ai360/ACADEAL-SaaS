"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { X, User } from "lucide-react";
import Image from "next/image";

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
  class: { name: string };
  grade: { level: number };
  parent: { id?: string; name?: string; surname?: string; phone?: string } | null;
}

interface ViewStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
}

export function ViewStudentModal({ open, onOpenChange, student }: ViewStudentModalProps) {
  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between border-b pb-4">
            <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Student Profile
            </span>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 py-4">
          {/* * Column 1: Profile & Identity (3/12) */}
          <div className="md:col-span-3 flex flex-col items-center space-y-4 border-r pr-6 border-border/50">
            <div className="relative group">
              {student.img ? (
                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-primary/20 shadow-xl transition-transform group-hover:scale-105">
                  <Image
                    src={student.img}
                    alt={`${student.name} ${student.surname}`}
                    width={160}
                    height={160}
                    className="object-cover w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-40 h-40 bg-primary/10 rounded-full flex items-center justify-center border-4 border-primary/20 shadow-xl">
                  <User className="w-20 h-20 text-primary" />
                </div>
              )}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground line-clamp-2">
                {student.name} {student.surname}
              </h2>
              {student.otherNames && <p className="text-sm text-muted-foreground">{student.otherNames}</p>}
              <p className="text-muted-foreground font-medium">@{student.username}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded-full border border-green-500/20 uppercase">
                  Grade {student.grade.level}
                </span>
                <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-xs font-bold rounded-full border border-blue-500/20 uppercase">
                  {student.class.name}
                </span>
              </div>
            </div>
          </div>

          {/* * Column 2: Personal & Academic (4/12) */}
          <div className="md:col-span-4 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center">
                <span className="w-8 h-[2px] bg-primary mr-2" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-muted/10 p-3 rounded-lg border border-border/50 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Birthday</span>
                  <span className="font-semibold text-sm">{format(new Date(student.birthday), "MMM dd, yyyy")}</span>
                </div>
                <div className="bg-muted/10 p-3 rounded-lg border border-border/50 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Gender</span>
                  <span className="font-semibold text-sm">{student.sex}</span>
                </div>
                <div className="bg-muted/10 p-3 rounded-lg border border-border/50 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Residency</span>
                  <span className="font-semibold text-sm">{student.residencyStatus}</span>
                </div>
                <div className="bg-muted/10 p-3 rounded-lg border border-border/50 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">House</span>
                  <span className="font-semibold text-sm">{student.house || "N/A"}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center">
                <span className="w-8 h-[2px] bg-secondary mr-2" />
                Medical & Admin
              </h3>
              <div className="bg-muted/20 p-4 rounded-xl border border-border/50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground uppercase font-bold">NHIS Number</span>
                  <span className="text-sm font-bold">{student.nhisNumber || "None"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground uppercase font-bold">Admission Date</span>
                  <span className="text-sm font-bold">
                    {student.admissionDate ? format(new Date(student.admissionDate), "MMM dd, yyyy") : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* * Column 3: Contact & Parent (5/12) */}
          <div className="md:col-span-5 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center">
                <span className="w-8 h-[2px] bg-primary mr-2" />
                Contact & Guardian
              </h3>
              <div className="space-y-4 bg-muted/10 p-4 rounded-xl border border-border/50">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Guardian Name</span>
                  <span className="font-bold text-lg">{student.guardianName || "N/A"}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-border/30 pt-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Occupation</span>
                    <span className="font-medium text-sm">{student.occupation || "N/A"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Primary Contact</span>
                    <span className="font-medium text-sm">{student.contactNumber || "N/A"}</span>
                  </div>
                </div>
                <div className="flex flex-col border-t border-border/30 pt-2">
                  <span className="text-xs text-muted-foreground">Emergency Contact</span>
                  <span className="font-medium text-sm text-red-600">{student.emergencyContact || "Not provided"}</span>
                </div>
              </div>
            </div>

            <div className="bg-muted/5 p-4 rounded-xl border border-border/50">
                <h4 className="text-xs font-bold text-muted-foreground mb-2 uppercase">Official Records</h4>
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Student ID: <span className="text-foreground font-mono font-bold">{student.studentId || "PENDING"}</span></p>
                    <p className="text-xs text-muted-foreground">System Email: <span className="text-foreground">{student.email || "N/A"}</span></p>
                </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t mt-6">
          <Button variant="outline" className="px-8" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

