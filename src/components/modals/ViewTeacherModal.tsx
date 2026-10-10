"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { X, User } from "lucide-react";
import Image from "next/image";

interface Teacher {
  id: string;
  username: string;
  staffId: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  address: string;
  sex: string;
  birthday: Date;
  img?: string | null;
  subjects: { name: string }[];
}

interface ViewTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: Teacher | null;
}

export function ViewTeacherModal({ open, onOpenChange, teacher }: ViewTeacherModalProps) {
  if (!teacher) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between border-b pb-4">
            <span className="text-2xl font-bold bg-clip-text text-gray-600">
              Teacher Profile
            </span>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 py-4">
          
          <div className="md:col-span-3 flex flex-col items-center space-y-4 border-r pr-6 border-border/50">
            <div className="relative group">
              {teacher.img ? (
                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-primary/20 shadow-xl transition-transform group-hover:scale-105">
                  <Image
                    src={teacher.img}
                    alt={`${teacher.name} ${teacher.surname}`}
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
                {teacher.name} {teacher.surname}
              </h2>
              <p className="text-muted-foreground font-medium">@{teacher.username}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-xs font-bold rounded-full border border-blue-500/20 uppercase">
                  Teacher
                </span>
                <span className="px-3 py-1 bg-purple-500/10 text-purple-500 text-xs font-bold rounded-full border border-purple-500/20 uppercase">
                  ID: {teacher.staffId}
                </span>
              </div>
            </div>
          </div>

          {/* * Personal details */}
          <div className="md:col-span-4 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center">
                <span className="w-8 h-[2px] bg-primary mr-2" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-muted/10 p-3 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground">Birthday</p>
                  <p className="font-semibold">{format(new Date(teacher.birthday), "MMMM dd, yyyy")}</p>
                </div>
                <div className="bg-muted/10 p-3 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="font-semibold">{teacher.sex}</p>
                </div>
              </div>
            </div>
          </div>

          {/* * Contact & Academic */}
          <div className="md:col-span-5 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center">
                <span className="w-8 h-[2px] bg-primary mr-2" />
                Contact & Subjects
              </h3>
              <div className="space-y-4">
                <div className="flex items-start bg-muted/20 p-4 rounded-xl border border-border/50">
                  <div className="space-y-3 w-full">
                    <div className="flex justify-between items-center border-b border-border/50 pb-2">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium text-sm truncate max-w-[200px]">{teacher.email || "Not provided"}</p>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/50 pb-2">
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium text-sm">{teacher.phone || "Not provided"}</p>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm text-muted-foreground mb-1">Address</p>
                      <p className="font-medium text-sm line-clamp-2">{teacher.address}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-sm font-semibold text-foreground mb-3">Subjects Teaching</p>
                  {teacher.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {teacher.subjects.map((subject, idx) => (
                        <span key={idx} className="px-3 py-1 bg-gray-900 text-white dark:text-blue-400 bg-gray-500 rounded-md text-sm border border-blue-500/20 shadow-sm">
                          {subject.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">No subjects assigned</p>
                  )}
                </div>
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

