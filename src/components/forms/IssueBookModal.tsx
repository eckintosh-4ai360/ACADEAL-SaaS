"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  LibraryBorrowSchema,
  libraryBorrowSchema,
} from "@/lib/formValidationSchemas";
import { createLibraryBorrow } from "@/lib/libraryBorrowActions";

type StudentOption = {
  id: string;
  name: string;
  surname: string;
  studentId: string;
};

type BookOption = {
  id: number;
  title: string;
  author: string | null;
  copies: number;
  activeBorrowCount: number;
};

interface IssueBookModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  students: StudentOption[];
  books: BookOption[];
}

const initialState = {
  success: false,
  error: false,
  message: "",
};

type LibraryBorrowFormValues = {
  itemId: string;
  studentId: string;
  dueDate: Date | null;
  notes: string;
};

export function IssueBookModal({
  open,
  setOpen,
  students,
  books,
}: IssueBookModalProps) {
  const [state, formAction] = useActionState(createLibraryBorrow, initialState);
  const [isSaving, startSavingTransition] = useTransition();

  const availableBooks = books.filter(b => b.copies > b.activeBorrowCount);

  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date;
  };

  const form = useForm<LibraryBorrowFormValues>({
    defaultValues: {
      itemId: "",
      studentId: "",
      dueDate: getDefaultDueDate(),
      notes: "",
    },
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      setOpen(false);
      form.reset({
        itemId: "",
        studentId: "",
        dueDate: getDefaultDueDate(),
        notes: "",
      });
    } else if (state.error) {
      toast.error(state.message);
    }
  }, [form, setOpen, state]);

  const onSubmit = (data: LibraryBorrowFormValues) => {
    if (!data.dueDate) {
      form.setError("dueDate", { type: "required", message: "Due date is required!" });
      return;
    }

    const payload: LibraryBorrowSchema = {
      itemId: parseInt(data.itemId, 10),
      studentId: data.studentId,
      dueDate: data.dueDate,
      notes: data.notes,
    };

    startSavingTransition(() => {
      formAction(payload);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Issue / Checkout Book</DialogTitle>
          <DialogDescription>
            Register a book checkout for a student.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="studentId"
              rules={{ required: "Student selection is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student *</FormLabel>
                  <FormControl>
                    <Select value={field.value} onChange={field.onChange}>
                      <option value="">Select Student</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.surname}, {student.name} ({student.studentId})
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemId"
              rules={{ required: "Book selection is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Book *</FormLabel>
                  <FormControl>
                    <Select value={field.value} onChange={field.onChange}>
                      <option value="">Select Book</option>
                      {availableBooks.map((book) => {
                        const remaining = book.copies - book.activeBorrowCount;
                        return (
                          <option key={book.id} value={book.id}>
                            {book.title} {book.author ? `by ${book.author}` : ""} ({remaining} of {book.copies} copies available)
                          </option>
                        );
                      })}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date *</FormLabel>
                  <FormControl>
                    <DatePicker
                      selected={field.value}
                      onChange={field.onChange}
                      minDate={new Date()}
                      placeholder="Select return due date"
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Condition of book, special arrangements, etc."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || isSaving}>
                {(form.formState.isSubmitting || isSaving) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Issue Book
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
