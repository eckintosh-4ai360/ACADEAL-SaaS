"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  Building2,
  CheckCircle2,
  Database,
  Edit3,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createSchoolTenantAction,
  deleteSchoolTenantAction,
  updateSchoolTenantAction,
} from "@/lib/controlPlaneActions";

export type SchoolControlPlaneView = {
  id: string;
  slug: string;
  schoolName: string;
  domains: string[];
  loginCodes: string[];
  publicAppUrl: string | null;
  enabled: boolean;
  databaseHost: string | null;
  hasDirectUrl: boolean;
  hasUnpooledUrl: boolean;
  updatedAt: string;
};

type SchoolControlPlaneClientProps = {
  controlPlaneConfigured: boolean;
  controlPlaneHost: string | null;
  schools: SchoolControlPlaneView[];
};

const EMPTY_FORM = {
  id: "",
  slug: "",
  schoolName: "",
  publicAppUrl: "",
  domainsText: "",
  loginCodesText: "",
  databaseUrl: "",
  directUrl: "",
  databaseUrlUnpooled: "",
  enabled: true,
};

function toTextareaValue(values: string[]) {
  return values.join("\n");
}

function formatUpdatedAt(value: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

type MigrationResult = {
  tenantSlug: string;
  success: boolean;
  appliedMigrations: string[];
  skippedMigrations: string[];
  error?: string;
};

export function SchoolControlPlaneClient({
  controlPlaneConfigured,
  controlPlaneHost,
  schools,
}: SchoolControlPlaneClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolControlPlaneView | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResults, setMigrationResults] = useState<MigrationResult[] | null>(null);

  const handleRunMigrations = async (tenantId?: string) => {
    setIsMigrating(true);
    setMigrationResults(null);
    try {
      const res = await fetch("/api/admin/migrate-tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tenantId ? { tenantId } : {}),
      });
      const data = await res.json() as { message: string; results: MigrationResult[] };
      setMigrationResults(data.results);
      const allOk = data.results.every((r) => r.success);
      if (allOk) {
        toast.success(data.message);
      } else {
        toast.warning(data.message);
      }
    } catch (err) {
      toast.error("Migration request failed: " + String(err));
    } finally {
      setIsMigrating(false);
    }
  };

  const openCreateDialog = () => {
    setEditingSchool(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (school: SchoolControlPlaneView) => {
    setEditingSchool(school);
    setIsDialogOpen(true);
  };

  const handleDelete = (school: SchoolControlPlaneView) => {
    if (
      !window.confirm(
        `Delete ${school.schoolName} from the control plane? This removes runtime routing for the school, but it does not delete the Neon database.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteSchoolTenantAction(school.id);

      if (result.success) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  };

  const initialValues = editingSchool
    ? {
        id: editingSchool.id,
        slug: editingSchool.slug,
        schoolName: editingSchool.schoolName,
        publicAppUrl: editingSchool.publicAppUrl ?? "",
        domainsText: toTextareaValue(editingSchool.domains),
        loginCodesText: toTextareaValue(
          editingSchool.loginCodes.filter((code) => code !== editingSchool.slug)
        ),
        databaseUrl: "",
        directUrl: "",
        databaseUrlUnpooled: "",
        enabled: editingSchool.enabled,
      }
    : EMPTY_FORM;

  return (
    <div className="space-y-6">
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Control Plane Status
          </CardTitle>
          <CardDescription>
            A dedicated registry lets this deployment discover schools without editing Vercel
            tenant JSON by hand.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={controlPlaneConfigured ? "default" : "destructive"}>
              {controlPlaneConfigured ? "Connected" : "Not Configured"}
            </Badge>
            {controlPlaneHost ? (
              <span className="text-muted-foreground">
                Registry DB: <span className="font-medium text-foreground">{controlPlaneHost}</span>
              </span>
            ) : null}
          </div>
          <p className="text-muted-foreground">
            {controlPlaneConfigured
              ? "Add or update schools here. Runtime tenant lookup will use this registry first and fall back to the env registry if needed."
              : "Set CONTROL_PLANE_DATABASE_URL in Vercel, redeploy, and pull it into .env.local for local dev to unlock self-serve school onboarding from the dashboard."}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                Schools
              </CardTitle>
              <CardDescription>
                Each school keeps its own Neon database while sharing one application codebase.
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog} disabled={!controlPlaneConfigured || isPending}>
              <Plus className="mr-2 h-4 w-4" />
              Add School
            </Button>
          </CardHeader>
          <CardContent>
            {schools.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No schools are registered in the control plane yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>Routing</TableHead>
                    <TableHead>Database</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-semibold">{school.schoolName}</div>
                          <div className="text-xs text-muted-foreground">
                            Slug: <span className="font-mono">{school.slug}</span>
                          </div>
                          {school.loginCodes.length > 1 ? (
                            <div className="flex flex-wrap gap-1">
                              {school.loginCodes.map((code) => (
                                <Badge key={code} variant="outline" className="font-mono">
                                  {code}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {school.domains.map((domain) => (
                              <Badge key={domain} variant="secondary" className="max-w-full truncate">
                                {domain}
                              </Badge>
                            ))}
                          </div>
                          {school.publicAppUrl ? (
                            <a
                              href={school.publicAppUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <Globe className="h-3.5 w-3.5" />
                              Open public URL
                            </a>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1 text-foreground">
                            <Database className="h-3.5 w-3.5 text-emerald-500" />
                            <span>{school.databaseHost ?? "Configured"}</span>
                          </div>
                          <div className="text-muted-foreground">
                            Direct URL: {school.hasDirectUrl ? "Yes" : "No"}
                          </div>
                          <div className="text-muted-foreground">
                            Unpooled URL: {school.hasUnpooledUrl ? "Yes" : "No"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={school.enabled ? "default" : "outline"}>
                          {school.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatUpdatedAt(school.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(school)}
                            disabled={isPending}
                          >
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(school)}
                            disabled={isPending}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Onboarding Notes</CardTitle>
            <CardDescription>
              This is the workflow for adding a school safely.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">1. Provision the Neon database</p>
              <p>Create the school database first, then paste the pooled and direct connection URLs here.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">2. Point the domain</p>
              <p>Add the school subdomain or custom domain so host-based tenant routing can resolve the school automatically.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">3. Seed the tenant</p>
              <p>Run your school setup or seed flow against that tenant DB before inviting staff.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">4. Use the school code only when needed</p>
              <p>School code is a fallback for preview or shared portal logins. On a mapped domain, the host should do the routing.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Database Migrations ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-violet-500" />
              Database Migrations
            </CardTitle>
            <CardDescription>
              Apply pending schema migrations to all tenant databases in one click.
              Safe to re-run — each migration is skipped if already applied.
            </CardDescription>
          </div>
          <Button
            onClick={() => handleRunMigrations()}
            disabled={isMigrating || !controlPlaneConfigured || schools.length === 0}
            variant="outline"
            className="shrink-0"
          >
            {isMigrating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</>
            ) : (
              <><RefreshCw className="mr-2 h-4 w-4" />Run Migrations on All Tenants</>
            )}
          </Button>
        </CardHeader>

        {migrationResults && migrationResults.length > 0 && (
          <CardContent>
            <div className="space-y-3">
              {migrationResults.map((result) => (
                <div
                  key={result.tenantSlug}
                  className={`rounded-lg border p-4 text-sm ${
                    result.success ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30" : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-mono">{result.tenantSlug}</span>
                    {result.success ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        {result.appliedMigrations.length} applied · {result.skippedMigrations.length} already up-to-date
                      </span>
                    ) : null}
                  </div>
                  {result.appliedMigrations.length > 0 && (
                    <ul className="mt-2 space-y-1 pl-6 text-xs text-emerald-700 dark:text-emerald-300">
                      {result.appliedMigrations.map((m) => (
                        <li key={m} className="font-mono">✓ {m}</li>
                      ))}
                    </ul>
                  )}
                  {result.error && (
                    <p className="mt-2 pl-6 text-xs text-red-700 dark:text-red-300 font-mono break-all">
                      {result.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingSchool ? `Edit ${editingSchool.schoolName}` : "Add School"}
            </DialogTitle>
            <DialogDescription>
              {editingSchool
                ? "Update routing, branding, or database credentials for this school."
                : "Register a new school so the app can resolve its domain and database at runtime."}
            </DialogDescription>
          </DialogHeader>

          <form
            key={editingSchool?.id ?? "new-school"}
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);

              startTransition(async () => {
                const result = editingSchool
                  ? await updateSchoolTenantAction(formData)
                  : await createSchoolTenantAction(formData);

                if (result.success) {
                  toast.success(result.message);
                  setIsDialogOpen(false);
                  router.refresh();
                  return;
                }

                toast.error(result.message);
              });
            }}
            className="space-y-6"
          >
            <input type="hidden" name="id" value={initialValues.id} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name</Label>
                <Input
                  id="schoolName"
                  name="schoolName"
                  defaultValue={initialValues.schoolName}
                  placeholder="Alpha International School"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  name="slug"
                  defaultValue={initialValues.slug}
                  placeholder="alpha-international"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="publicAppUrl">Public App URL</Label>
                <Input
                  id="publicAppUrl"
                  name="publicAppUrl"
                  type="url"
                  defaultValue={initialValues.publicAppUrl}
                  placeholder="https://alpha.yourapp.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domainsText">Domains</Label>
                <Textarea
                  id="domainsText"
                  name="domainsText"
                  defaultValue={initialValues.domainsText}
                  placeholder={"alpha.yourapp.com\nschool-alpha.vercel.app"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loginCodesText">Extra Login Codes</Label>
                <Textarea
                  id="loginCodesText"
                  name="loginCodesText"
                  defaultValue={initialValues.loginCodesText}
                  placeholder={"alpha\nais"}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="databaseUrl">
                  Pooled Database URL
                  {editingSchool ? " (leave blank to keep current)" : ""}
                </Label>
                <Textarea
                  id="databaseUrl"
                  name="databaseUrl"
                  defaultValue={initialValues.databaseUrl}
                  placeholder="postgresql://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="directUrl">Direct URL</Label>
                <Textarea
                  id="directUrl"
                  name="directUrl"
                  defaultValue={initialValues.directUrl}
                  placeholder="postgresql://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="databaseUrlUnpooled">Unpooled URL</Label>
                <Textarea
                  id="databaseUrlUnpooled"
                  name="databaseUrlUnpooled"
                  defaultValue={initialValues.databaseUrlUnpooled}
                  placeholder="postgresql://..."
                />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
              <Checkbox
                id="enabled"
                name="enabled"
                defaultChecked={initialValues.enabled}
              />
              <div className="space-y-1">
                <Label htmlFor="enabled" className="cursor-pointer">
                  Active tenant
                </Label>
                <p className="text-xs text-muted-foreground">
                  Disabled schools stay in the registry but won’t be selected for runtime traffic.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!controlPlaneConfigured || isPending}>
                {isPending ? "Saving..." : editingSchool ? "Save Changes" : "Create School"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
