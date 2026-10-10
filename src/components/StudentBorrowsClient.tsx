"use client";

import { format, differenceInDays } from "date-fns";
import { BookOpen, Calendar, Clock, History, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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
    title: string;
    author: string | null;
    category: string;
  };
};

interface StudentBorrowsClientProps {
  borrows: BorrowRecord[];
}

export function StudentBorrowsClient({ borrows }: StudentBorrowsClientProps) {
  const activeBorrows = borrows.filter((b) => b.status !== "RETURNED");
  const historyBorrows = borrows.filter((b) => b.status === "RETURNED");

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="active" className="gap-2">
            <Clock className="h-4 w-4" />
            Currently Borrowed ({activeBorrows.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            My Reading History ({historyBorrows.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeBorrows.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeBorrows.map((borrow) => {
                const isOverdue = borrow.status === "OVERDUE" || new Date(borrow.dueDate) < new Date();
                const daysLeft = differenceInDays(new Date(borrow.dueDate), new Date());

                return (
                  <Card
                    key={borrow.id}
                    className={`border-l-4 transition-all duration-300 hover:shadow-md ${
                      isOverdue ? "border-l-destructive" : "border-l-primary"
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant={isOverdue ? "destructive" : "secondary"}>
                          {isOverdue ? "Overdue" : "Borrowed"}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Checked out {format(new Date(borrow.borrowDate), "MMM dd, yyyy")}
                        </span>
                      </div>
                      <CardTitle className="mt-2 text-base font-bold line-clamp-1">
                        {borrow.item.title}
                      </CardTitle>
                      {borrow.item.author && (
                        <p className="text-xs text-muted-foreground">by {borrow.item.author}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Due date:</span>
                          <span className="font-semibold">
                            {format(new Date(borrow.dueDate), "MMM dd, yyyy")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-1 mt-1">
                          <span className="text-muted-foreground">Status:</span>
                          <span className={isOverdue ? "text-destructive font-bold flex items-center gap-1" : "font-medium"}>
                            {isOverdue ? (
                              <>
                                <AlertTriangle className="h-3 w-3" />
                                {Math.abs(daysLeft)} days overdue
                              </>
                            ) : (
                              `${daysLeft} days remaining`
                            )}
                          </span>
                        </div>
                      </div>
                      {borrow.notes && (
                        <p className="text-xs text-muted-foreground italic bg-muted/20 p-2 rounded border border-border/40">
                          Note: {borrow.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="mx-auto h-12 w-12 opacity-30 mb-3" />
                <p className="font-semibold text-foreground">You don't have any books checked out</p>
                <p className="text-xs mt-1">Visit the school library to borrow books.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          {historyBorrows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border/40 bg-card">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/20 text-muted-foreground font-semibold font-sans">
                    <th className="p-4">Book Title</th>
                    <th className="p-4">Author</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Borrowed Date</th>
                    <th className="p-4">Returned Date</th>
                  </tr>
                </thead>
                <tbody>
                  {historyBorrows.map((borrow) => (
                    <tr key={borrow.id} className="border-b hover:bg-muted/10">
                      <td className="p-4 font-semibold text-foreground">{borrow.item.title}</td>
                      <td className="p-4 text-muted-foreground">{borrow.item.author || "N/A"}</td>
                      <td className="p-4">
                        <Badge variant="outline">{borrow.item.category}</Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {format(new Date(borrow.borrowDate), "MMM dd, yyyy")}
                      </td>
                      <td className="p-4 text-muted-foreground font-medium text-green-600 dark:text-green-400">
                        {borrow.returnDate ? format(new Date(borrow.returnDate), "MMM dd, yyyy") : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <History className="mx-auto h-12 w-12 opacity-30 mb-3" />
                <p className="font-semibold text-foreground">No reading history yet</p>
                <p className="text-xs mt-1">Once you return borrowed books, they will appear here.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
