"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import {
  Calendar,
  CheckCircle,
  Clock,
  History,
  Info,
  BookOpen,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

import { IssueBookModal } from "@/components/forms/IssueBookModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  returnLibraryBorrow,
  renewLibraryBorrow,
  deleteLibraryBorrow,
} from "@/lib/libraryBorrowActions";

type BorrowRecord = {
  id: number;
  itemId: number;
  studentId: string;
  borrowDate: Date;
  dueDate: Date;
  returnDate: Date | null;
  status: "BORROWED" | "RETURNED" | "OVERDUE";
  notes: string | null;
  item: {
    id: number;
    title: string;
    author: string | null;
    copies: number;
  };
  student: {
    id: string;
    name: string;
    surname: string;
    studentId: string;
  };
};

interface LibraryBorrowingClientProps {
  borrows: BorrowRecord[];
  students: { id: string; name: string; surname: string; studentId: string }[];
  books: { id: number; title: string; author: string | null; copies: number; activeBorrowCount: number }[];
  isAdmin: boolean;
}

export function LibraryBorrowingClient({
  borrows,
  students,
  books,
  isAdmin,
}: LibraryBorrowingClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedBorrow, setSelectedBorrow] = useState<BorrowRecord | null>(null);
  const [newDueDate, setNewDueDate] = useState<Date | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleReturn = (id: number) => {
    startTransition(async () => {
      const result = await returnLibraryBorrow(id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleRenewSubmit = () => {
    if (!selectedBorrow || !newDueDate) return;

    startTransition(async () => {
      const result = await renewLibraryBorrow(selectedBorrow.id, newDueDate);
      if (result.success) {
        toast.success(result.message);
        setRenewModalOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleDeleteSubmit = () => {
    if (!selectedBorrow) return;

    startTransition(async () => {
      const result = await deleteLibraryBorrow(selectedBorrow.id);
      if (result.success) {
        toast.success(result.message);
        setDeleteModalOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  };

  const filteredBorrows = borrows.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      b.student.name.toLowerCase().includes(q) ||
      b.student.surname.toLowerCase().includes(q) ||
      b.student.studentId.toLowerCase().includes(q) ||
      b.item.title.toLowerCase().includes(q)
    );
  });

  const activeBorrows = filteredBorrows.filter((b) => b.status !== "RETURNED");
  const historyBorrows = filteredBorrows.filter((b) => b.status === "RETURNED");

  const overdueCount = borrows.filter((b) => b.status === "OVERDUE").length;
  const activeCount = borrows.filter((b) => b.status === "BORROWED" || b.status === "OVERDUE").length;

  return (
    <div className="space-y-6">
      {/* Stats Summary Card */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Active Checkouts
          </p>
          <p className="mt-2 text-2xl font-black text-foreground">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50/50 dark:border-red-950 dark:bg-red-950/10 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
            Overdue Books
          </p>
          <p className="mt-2 text-2xl font-black text-red-600 dark:text-red-400">{overdueCount}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Total Logs
          </p>
          <p className="mt-2 text-2xl font-black text-foreground">{borrows.length}</p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search checkouts by student name, ID, or book title"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setIssueModalOpen(true)} className="gap-2 self-start lg:self-auto">
              <Plus className="h-4 w-4" />
              Issue Book
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="active" className="gap-2">
            <Clock className="h-4 w-4" />
            Active Borrows ({activeBorrows.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Return History ({historyBorrows.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeBorrows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border/40 bg-card">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/20 text-muted-foreground font-semibold">
                    <th className="p-4">Student</th>
                    <th className="p-4">Book Details</th>
                    <th className="p-4">Checkout Date</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBorrows.map((borrow) => {
                    const isOverdue = borrow.status === "OVERDUE" || new Date(borrow.dueDate) < new Date();
                    return (
                      <tr key={borrow.id} className="border-b hover:bg-muted/10">
                        <td className="p-4">
                          <div className="font-semibold text-foreground">
                            {borrow.student.surname}, {borrow.student.name}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <User className="h-3 w-3" /> {borrow.student.studentId}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-foreground max-w-xs truncate">
                            {borrow.item.title}
                          </div>
                          {borrow.item.author && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              by {borrow.item.author}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {format(new Date(borrow.borrowDate), "MMM dd, yyyy")}
                        </td>
                        <td className="p-4">
                          <span className={isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                            {format(new Date(borrow.dueDate), "MMM dd, yyyy")}
                          </span>
                        </td>
                        <td className="p-4">
                          <Badge variant={isOverdue ? "destructive" : "secondary"}>
                            {isOverdue ? "Overdue" : "Borrowed"}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => handleReturn(borrow.id)}
                              disabled={isPending}
                              variant="outline"
                              size="sm"
                              className="gap-1.5 h-8 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/20 dark:text-green-400 hover:dark:bg-green-950/40"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Return
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedBorrow(borrow);
                                setNewDueDate(new Date(borrow.dueDate));
                                setRenewModalOpen(true);
                              }}
                              disabled={isPending}
                              variant="outline"
                              size="sm"
                              className="gap-1.5 h-8"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Renew
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="mx-auto h-12 w-12 opacity-30 mb-3" />
                <p className="font-semibold text-foreground">No active checkouts found</p>
                <p className="text-xs mt-1">Lend books to students by clicking "Issue Book" above.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          {historyBorrows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border/40 bg-card">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/20 text-muted-foreground font-semibold">
                    <th className="p-4">Student</th>
                    <th className="p-4">Book Details</th>
                    <th className="p-4">Checkout Date</th>
                    <th className="p-4">Returned Date</th>
                    <th className="p-4">Status</th>
                    {isAdmin && <th className="p-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {historyBorrows.map((borrow) => (
                    <tr key={borrow.id} className="border-b hover:bg-muted/10">
                      <td className="p-4">
                        <div className="font-semibold text-foreground">
                          {borrow.student.surname}, {borrow.student.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          ID: {borrow.student.studentId}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-foreground max-w-xs truncate">
                          {borrow.item.title}
                        </div>
                        {borrow.item.author && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            by {borrow.item.author}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {format(new Date(borrow.borrowDate), "MMM dd, yyyy")}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {borrow.returnDate ? format(new Date(borrow.returnDate), "MMM dd, yyyy") : "N/A"}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          Returned
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td className="p-4 text-right">
                          <Button
                            onClick={() => {
                              setSelectedBorrow(borrow);
                              setDeleteModalOpen(true);
                            }}
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <History className="mx-auto h-12 w-12 opacity-30 mb-3" />
                <p className="font-semibold text-foreground">No return history logged yet</p>
                <p className="text-xs mt-1">Returned items will be recorded here.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <IssueBookModal
        open={issueModalOpen}
        setOpen={setIssueModalOpen}
        students={students}
        books={books}
      />

      {/* Renew Due Date Modal */}
      <Dialog open={renewModalOpen} onOpenChange={setRenewModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Renew Book Checkout</DialogTitle>
            <DialogDescription>
              Update the return due date for <span className="font-semibold text-foreground">"{selectedBorrow?.item.title}"</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">New Due Date</label>
              <DatePicker
                selected={newDueDate}
                onChange={setNewDueDate}
                minDate={new Date()}
                required
              />
            </div>
            {selectedBorrow?.notes && (
              <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border flex gap-1.5 items-start">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-foreground">Previous Notes:</span> {selectedBorrow.notes}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewModalOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleRenewSubmit} disabled={isPending || !newDueDate}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Renew checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Borrow Record Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete borrowing log record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this borrowing log record? This action will permanently remove it from the student's library records.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSubmit} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
