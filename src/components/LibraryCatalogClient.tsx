"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Edit,
  ExternalLink,
  Filter,
  Library,
  Search,
  Trash2,
} from "lucide-react";

import { AddLibraryCatalogButton } from "@/components/forms/AddLibraryCatalogButton";
import { EditLibraryCatalogModal } from "@/components/forms/EditLibraryCatalogModal";
import { DeleteLibraryCatalogModal } from "@/components/forms/DeleteLibraryCatalogModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  LIBRARY_CATALOG_AVAILABILITY_LABELS,
  LIBRARY_CATALOG_ITEM_TYPE_LABELS,
  LibraryCatalogAvailability,
  LibraryCatalogItemType,
} from "@/lib/utils";

type LibraryCatalogRecord = {
  id: number;
  itemType: LibraryCatalogItemType;
  title: string;
  author: string | null;
  isbn: string | null;
  category: string;
  gradeRange: string | null;
  availability: LibraryCatalogAvailability;
  copies: number;
  description: string;
  externalUrl: string | null;
  uploadedByName: string;
  borrows?: { id: number }[];
};

interface LibraryCatalogClientProps {
  items: LibraryCatalogRecord[];
  canManage: boolean;
  featureReady: boolean;
}

export function LibraryCatalogClient({
  items,
  canManage,
  featureReady,
}: LibraryCatalogClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | LibraryCatalogItemType>("all");

  // Modals state
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LibraryCatalogRecord | null>(null);

  const categories = ["all", ...Array.from(new Set(items.map((item) => item.category)))];

  const filteredItems = items.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.author?.toLowerCase().includes(query) ||
      item.isbn?.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query);

    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesType = typeFilter === "all" || item.itemType === typeFilter;

    return matchesSearch && matchesCategory && matchesType;
  });

  const bookCount = items.filter((item) => item.itemType === "BOOK").length;
  const digitalCount = items.filter((item) => item.itemType === "DIGITAL_RESOURCE").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Total Entries
                </p>
                <p className="mt-2 text-2xl font-black text-foreground">{items.length}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Books
                </p>
                <p className="mt-2 text-2xl font-black text-foreground">{bookCount}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Digital
                </p>
                <p className="mt-2 text-2xl font-black text-foreground">{digitalCount}</p>
              </div>
            </div>
            {canManage && <AddLibraryCatalogButton />}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, ISBN, or category"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as "all" | LibraryCatalogItemType)
              }
            >
              <option value="all">All Types</option>
              <option value="BOOK">Books</option>
              <option value="DIGITAL_RESOURCE">Digital Resources</option>
            </Select>
            <Select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All Categories</option>
              {categories
                .filter((category) => category !== "all")
                .map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
            </Select>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>
              Showing {filteredItems.length} of {items.length} catalog {" "}
              {items.length === 1 ? "entry" : "entries"}
            </span>
          </div>
        </CardContent>
      </Card>

      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => {
            const isDigital = item.itemType === "DIGITAL_RESOURCE";
            const isAvailable = item.availability === "AVAILABLE";
            const isLimited = item.availability === "LIMITED";

            const activeBorrowsCount = item.borrows?.length || 0;
            const availableCopies = Math.max(0, item.copies - activeBorrowsCount);

            return (
              <Card
                key={item.id}
                className="flex flex-col justify-between border-border/40 transition-all duration-300 hover:shadow-lg"
              >
                <div>
                  <CardHeader className="border-b bg-muted/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <CardTitle className="line-clamp-2 text-base font-bold leading-tight">
                          {item.title}
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.author || item.uploadedByName}
                        </p>
                      </div>
                      <Badge variant={isAvailable ? "default" : isLimited ? "secondary" : "outline"}>
                        {LIBRARY_CATALOG_AVAILABILITY_LABELS[item.availability]}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-4">
                    <p className="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {LIBRARY_CATALOG_ITEM_TYPE_LABELS[item.itemType]}
                      </Badge>
                      <Badge variant="outline">{item.category}</Badge>
                      {item.gradeRange && <Badge variant="outline">{item.gradeRange}</Badge>}
                    </div>

                    <div className="space-y-2 text-sm">
                      {!isDigital && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Copies:</span>
                            <span className="font-medium">
                              {availableCopies} / {item.copies} available
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">ISBN:</span>
                            <span className="font-mono text-xs">
                              {item.isbn || "Not listed"}
                            </span>
                          </div>
                        </>
                      )}
                      {isDigital && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Access:</span>
                          <span className="font-medium">External resource</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>

                <div className="px-6 pb-6">
                  {isDigital && item.externalUrl ? (
                    <Button asChild className="w-full gap-2">
                      <a href={item.externalUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Open Resource
                      </a>
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      <span>
                        {isAvailable && availableCopies > 0
                          ? "Available in the library catalog."
                          : availableCopies === 0 && item.copies > 0
                          ? "All copies currently checked out."
                          : "Cataloged but currently not ready for checkout."}
                      </span>
                    </div>
                  )}

                  {canManage && (
                    <div className="mt-4 flex gap-2 border-t pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => {
                          setSelectedItem(item);
                          setEditOpen(true);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                        onClick={() => {
                          setSelectedItem(item);
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-4 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted/40">
              <Library className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                {featureReady
                  ? "No catalog entries match the current filters."
                  : "Library catalog setup is not ready yet."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {featureReady
                  ? "Try a different search or filter, or add the first catalog item as an admin."
                  : "Sync the Prisma schema and restart the app to enable library catalog entries."}
              </p>
            </div>
            {canManage && <AddLibraryCatalogButton />}
          </CardContent>
        </Card>
      )}

      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ArrowUpRight className="mt-0.5 h-5 w-5 text-green-600" />
            <div>
              <h3 className="mb-1 font-semibold text-green-900 dark:text-green-100">
                Library Usage
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200">
                Books are listed as catalog entries for discovery. Digital resources can be opened
                directly when an external access link is provided by the administration.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditLibraryCatalogModal
        open={editOpen}
        setOpen={setEditOpen}
        item={selectedItem}
      />

      <DeleteLibraryCatalogModal
        open={deleteOpen}
        setOpen={setDeleteOpen}
        itemId={selectedItem?.id || null}
        itemTitle={selectedItem?.title || null}
      />
    </div>
  );
}
