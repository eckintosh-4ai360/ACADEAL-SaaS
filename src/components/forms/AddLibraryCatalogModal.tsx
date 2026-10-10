"use client";

import { useActionState, useEffect, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  LibraryCatalogItemSchema,
  libraryCatalogItemSchema,
} from "@/lib/formValidationSchemas";
import { createLibraryCatalogItem } from "@/lib/libraryCatalogActions";

interface AddLibraryCatalogModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const initialState = {
  success: false,
  error: false,
  message: "",
};

type LibraryCatalogItemFormValues = z.input<typeof libraryCatalogItemSchema>;

export function AddLibraryCatalogModal({
  open,
  setOpen,
}: AddLibraryCatalogModalProps) {
  const [state, formAction] = useActionState(createLibraryCatalogItem, initialState);
  const [isSaving, startSavingTransition] = useTransition();

  const form = useForm<LibraryCatalogItemFormValues, unknown, LibraryCatalogItemSchema>({
    resolver: zodResolver(libraryCatalogItemSchema),
    defaultValues: {
      itemType: "BOOK",
      title: "",
      author: "",
      isbn: "",
      category: "",
      gradeRange: "",
      availability: "AVAILABLE",
      copies: 1,
      description: "",
      externalUrl: "",
    },
  });

  const itemType = form.watch("itemType");

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      setOpen(false);
      form.reset({
        itemType: "BOOK",
        title: "",
        author: "",
        isbn: "",
        category: "",
        gradeRange: "",
        availability: "AVAILABLE",
        copies: 1,
        description: "",
        externalUrl: "",
      });
    } else if (state.error) {
      toast.error(state.message);
    }
  }, [form, setOpen, state]);

  const onSubmit = (data: LibraryCatalogItemSchema) => {
    startSavingTransition(() => {
      formAction(data);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Create library catalog entry</DialogTitle>
          <DialogDescription>
            Add either a physical book entry or a digital resource link.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="itemType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onChange={field.onChange}>
                        <option value="BOOK">Book</option>
                        <option value="DIGITAL_RESOURCE">Digital Resource</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Literature, Mathematics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="author"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Author</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          itemType === "BOOK" ? "Enter the author name" : "Optional"
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isbn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ISBN</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional ISBN" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="gradeRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade range</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Basic 4-6" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="availability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Availability</FormLabel>
                    <FormControl>
                      <Select value={field.value} onChange={field.onChange}>
                        <option value="AVAILABLE">Available</option>
                        <option value="LIMITED">Limited</option>
                        <option value="UNAVAILABLE">Unavailable</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="copies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Copies</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the book or resource."
                      className="min-h-[110px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="externalUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resource URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        itemType === "DIGITAL_RESOURCE"
                          ? "https://example.com/resource"
                          : "Optional external link"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <Label className="text-sm font-medium">Admin note</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Books appear as catalog entries. Digital resources can be opened directly from the
                library page.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || isSaving}>
                {(form.formState.isSubmitting || isSaving) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create entry
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
