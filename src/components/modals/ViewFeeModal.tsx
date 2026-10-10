"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { X } from "lucide-react";

interface Fee {
  id: number;
  title: string;
  amount: number;
  dueDate: Date;
  status: string;
  description: string | null;
  student: {
    name: string;
    surname: string;
    class: { name: string };
    parent: { name: string; surname: string; phone: string } | null;
  };
}

interface ViewFeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fee: Fee | null;
}

export function ViewFeeModal({ open, onOpenChange, fee }: ViewFeeModalProps) {
  if (!fee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between border-b pb-4">
            <span className="text-2xl font-bold text-orange-600">
              Fee Details & Statement
            </span>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
          {/* * Column 1: Fee & Payment Stats */}
          <div className="space-y-6 border-r pr-8 border-border/50">
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center">
                <span className="w-8 h-[2px] bg-orange-600 mr-2" />
                Financial Information
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-muted/10 rounded-xl border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Fee Title</p>
                  <p className="font-bold text-lg">{fee.title}</p>
                </div>
                
                {fee.description && (
                  <div className="p-3 bg-muted/5 rounded-lg border border-border/30 italic text-sm text-muted-foreground">
                    {fee.description}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-orange-500/5 rounded-xl border border-orange-500/20">
                    <p className="text-xs text-orange-600 font-bold uppercase">Amount Due</p>
                    <p className="text-2xl font-black text-foreground mt-1">GH₵{fee.amount.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-muted/10 rounded-xl border border-border/50 flex flex-col justify-center">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Status</p>
                    <div className="mt-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                        fee.status === "PAID"
                          ? "bg-green-500/10 text-green-500 border-green-500/30"
                          : fee.status === "OVERDUE"
                          ? "bg-red-500/10 text-red-500 border-red-500/30"
                          : "bg-orange-500/10 text-orange-500 border-orange-500/30"
                      }`}>
                        {fee.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 border-t border-border/50 pt-4">
                  <span className="text-sm text-muted-foreground">Payment Deadline:</span>
                  <span className="font-bold text-sm">{format(new Date(fee.dueDate), "MMMM dd, yyyy")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* * Column 2: Payer/Student Info */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center">
                <span className="w-8 h-[2px] bg-blue-600 mr-2" />
                Billed To
              </h3>
              <div className="bg-muted/10 p-5 rounded-2xl border border-border/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-8 -mt-8" />
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-600 font-bold">
                      {fee.student.name.charAt(0)}{fee.student.surname.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-lg leading-none">{fee.student.name} {fee.student.surname}</p>
                      <p className="text-xs text-muted-foreground mt-1">{fee.student.class.name}</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-border/50 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground italic">Parent/Guardian:</span>
                      <span className="text-sm font-medium">{fee.student.parent?.name} {fee.student.parent?.surname || ""}</span>
                    </div>
                    <div className="flex justify-between items-center bg-foreground/5 p-2 rounded-lg">
                      <span className="text-xs text-muted-foreground uppercase font-bold">Contact:</span>
                      <span className="text-sm font-mono text-foreground">{fee.student.parent?.phone || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

