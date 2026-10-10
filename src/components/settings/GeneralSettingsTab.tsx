"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";
import { updateSystemSettings } from "@/lib/actions";
import { Loader2, Trash2, Upload } from "lucide-react";

interface GeneralSettings {
  id: number;
  vacationDate?: string | Date | null;
  reopeningDate?: string | Date | null;
  totalAttendanceDays?: number | null;
  currentTerm: string;
  academicYear: string;
  studentIdInitials: string;
  timezone: string;
  dateFormat: string;
  schoolName: string;
  schoolShortName: string;
  schoolLogo?: string | null;
  schoolStamp?: string | null;
  schoolEmail?: string | null;
  schoolPhone?: string | null;
  schoolAddress?: string | null;
  schoolWebsite?: string | null;
  publicAppUrl?: string | null;
  currency: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

interface GeneralSettingsTabProps {
  settings: GeneralSettings;
}

const DEFAULT_SCHOOL_LOGO = "/img/ECKINTOSH LOGO.png";

export function GeneralSettingsTab({ settings }: GeneralSettingsTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingStamp, setIsUploadingStamp] = useState(false);
  const [vacationDate, setVacationDate] = useState(settings.vacationDate ? new Date(settings.vacationDate).toISOString().split('T')[0] : "");
  const [reopeningDate, setReopeningDate] = useState(settings.reopeningDate ? new Date(settings.reopeningDate).toISOString().split('T')[0] : "");
  const [schoolLogoValue, setSchoolLogoValue] = useState(
    typeof settings.schoolLogo === "string" ? settings.schoolLogo : ""
  );
  const [schoolLogoPreview, setSchoolLogoPreview] = useState(
    typeof settings.schoolLogo === "string" && settings.schoolLogo.trim()
      ? settings.schoolLogo
      : DEFAULT_SCHOOL_LOGO
  );
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [schoolStampValue, setSchoolStampValue] = useState(
    typeof settings.schoolStamp === "string" ? settings.schoolStamp : ""
  );
  const [schoolStampPreview, setSchoolStampPreview] = useState(
    typeof settings.schoolStamp === "string" && settings.schoolStamp.trim()
      ? settings.schoolStamp
      : ""
  );
  const stampInputRef = useRef<HTMLInputElement>(null);
  const totalAttendance = useMemo(() => {
    if (vacationDate && reopeningDate) {
      const vDate = new Date(vacationDate);
      const rDate = new Date(reopeningDate);

      if (!isNaN(vDate.getTime()) && !isNaN(rDate.getTime())) {
        const diffTime = vDate.getTime() - rDate.getTime();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
    }

    return settings.totalAttendanceDays || 0;
  }, [reopeningDate, settings.totalAttendanceDays, vacationDate]);

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file for the school logo.");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploadingLogo(true);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; path?: string; error?: string }
        | null;

      if (!response.ok || !payload?.success || !payload.path) {
        throw new Error(payload?.error || "Failed to upload school logo.");
      }

      setSchoolLogoValue(payload.path);
      setSchoolLogoPreview(payload.path);
      toast.success("Logo uploaded. Click Update Settings to save it for this school.");
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "Failed to upload school logo.";
      toast.error(messageText);
    } finally {
      setIsUploadingLogo(false);
      event.target.value = "";
    }
  };

  const handleRemoveLogo = () => {
    setSchoolLogoValue("");
    setSchoolLogoPreview(DEFAULT_SCHOOL_LOGO);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  const handleStampUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Choose a PNG, JPEG, or WebP image for the school stamp.");
      event.target.value = "";
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      toast.error("The school stamp must be 4 MB or smaller.");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "school-stamp");
    setIsUploadingStamp(true);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; path?: string; error?: string }
        | null;

      if (!response.ok || !payload?.success || !payload.path) {
        throw new Error(payload?.error || "Failed to upload school stamp.");
      }

      setSchoolStampValue(payload.path);
      setSchoolStampPreview(payload.path);
      toast.success("Stamp uploaded. Click Update Settings to save it for this school.");
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "Failed to upload school stamp.";
      toast.error(messageText);
    } finally {
      setIsUploadingStamp(false);
      event.target.value = "";
    }
  };

  const handleRemoveStamp = () => {
    setSchoolStampValue("");
    setSchoolStampPreview("");
    if (stampInputRef.current) {
      stampInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");

    const formData = new FormData(e.currentTarget);
    //* Explicitly add totalAttendanceDays since disabled fields might not be included
    formData.set("totalAttendanceDays", totalAttendance.toString());

    startTransition(async () => {
      const result = await updateSystemSettings(formData);
      if (result.success) {
        setMessage(result.message || "Settings updated successfully!");
        toast.success("Settings updated!");
        window.dispatchEvent(new CustomEvent("settings-updated"));
        router.refresh();
      } else {
        setMessage(result.message || "Failed to update settings");
        toast.error(result.message || "Failed to update settings");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <input type="hidden" name="id" value={settings.id} />
      <input type="hidden" name="schoolLogo" value={schoolLogoValue} />
      <input type="hidden" name="schoolStamp" value={schoolStampValue} />

      {/* ! Term/Semester Setup */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 text-blue-900 dark:text-blue-100">Term/Semester Setup</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currentTerm">Term (Semester)</Label>
            <Input
              id="currentTerm"
              name="currentTerm"
              defaultValue={settings.currentTerm}
              placeholder="First Term"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="academicYear">Academic Year</Label>
            <Input
              id="academicYear"
              name="academicYear"
              defaultValue={settings.academicYear}
              placeholder="2025/2026"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reopeningDate">Reopening Date</Label>
            <Input
              id="reopeningDate"
              name="reopeningDate"
              type="date"
              value={reopeningDate}
              onChange={(e) => setReopeningDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vacationDate">Vacation Date</Label>
            <Input
              id="vacationDate"
              name="vacationDate"
              type="date"
              value={vacationDate}
              onChange={(e) => setVacationDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalAttendanceDays">Total Attendance (Calculated)</Label>
            <Input
              id="totalAttendanceDays"
              name="totalAttendanceDays"
              type="number"
              value={totalAttendance}
              readOnly
              disabled
              className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
              placeholder="68"
            />
            <p className="text-xs text-gray-500 italic">Automatically calculated from dates above</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="studentIdInitials">Student ID Initials</Label>
            <Input
              id="studentIdInitials"
              name="studentIdInitials"
              defaultValue={settings.studentIdInitials}
              placeholder="CTS"
              maxLength={10}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              name="timezone"
              defaultValue={settings.timezone}
              placeholder="UTC"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateFormat">Date Format</Label>
            <Input
              id="dateFormat"
              name="dateFormat"
              defaultValue={settings.dateFormat}
              placeholder="dd/MM/yyyy"
            />
          </div>
        </div>
      </div>

      {/* ! School Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 text-blue-900 dark:text-blue-100">School Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="schoolName">School Name *</Label>
            <Input
              id="schoolName"
              name="schoolName"
              defaultValue={settings.schoolName}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schoolShortName">Short Name *</Label>
            <Input
              id="schoolShortName"
              name="schoolShortName"
              defaultValue={settings.schoolShortName}
              required
            />
          </div>
          <div className="space-y-4 md:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="schoolLogoFile">School Logo</Label>
              <div className="flex flex-col gap-4 rounded-lg border border-dashed p-4 md:flex-row md:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/30">
                  <div className="relative h-full w-full">
                    <Image
                      src={schoolLogoPreview}
                      alt={`${settings.schoolName} logo preview`}
                      fill
                      sizes="96px"
                      className="object-contain"
                      onError={() => setSchoolLogoPreview(DEFAULT_SCHOOL_LOGO)}
                    />
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <Input
                    ref={logoInputRef}
                    id="schoolLogoFile"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      void handleLogoUpload(event);
                    }}
                    disabled={isUploadingLogo}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Choose Logo File
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isUploadingLogo || !schoolLogoValue}
                      onClick={handleRemoveLogo}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Logo
                    </Button>
                  </div>

                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    {schoolLogoValue
                      ? `Selected logo path: ${schoolLogoValue}`
                      : "No custom logo uploaded yet. The default logo will be used until you upload one."}
                  </div>

                  <p className="text-xs text-gray-500">
                    Upload the school&apos;s logo image here, then click <span className="font-semibold">Update Settings</span>.
                    This saved logo will be used for this school&apos;s login page and sidebar.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4 md:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="schoolStampFile">School Stamp</Label>
              <div className="flex flex-col gap-4 rounded-lg border border-dashed p-4 md:flex-row md:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/30">
                  {schoolStampPreview ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={schoolStampPreview}
                        alt={`${settings.schoolName} stamp preview`}
                        fill
                        sizes="96px"
                        className="object-contain"
                        onError={() => setSchoolStampPreview("")}
                      />
                    </div>
                  ) : (
                    <span className="px-2 text-center text-xs text-muted-foreground">No stamp</span>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <Input
                    ref={stampInputRef}
                    id="schoolStampFile"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      void handleStampUpload(event);
                    }}
                    disabled={isUploadingStamp}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploadingStamp}
                      onClick={() => stampInputRef.current?.click()}
                    >
                      {isUploadingStamp ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Choose Stamp File
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isUploadingStamp || !schoolStampValue}
                      onClick={handleRemoveStamp}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Stamp
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Upload a PNG, JPEG, or WebP image up to 4 MB, then click <span className="font-semibold">Update Settings</span>.
                    The saved stamp will appear automatically on this school&apos;s terminal report cards.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schoolEmail">School Email</Label>
            <Input
              id="schoolEmail"
              name="schoolEmail"
              type="email"
              defaultValue={settings.schoolEmail || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schoolPhone">School Phone</Label>
            <Input
              id="schoolPhone"
              name="schoolPhone"
              defaultValue={settings.schoolPhone || ""}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="schoolAddress">School Address</Label>
            <Input
              id="schoolAddress"
              name="schoolAddress"
              defaultValue={settings.schoolAddress || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schoolWebsite">School Website</Label>
            <Input
              id="schoolWebsite"
              name="schoolWebsite"
              type="url"
              defaultValue={settings.schoolWebsite || ""}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="publicAppUrl">Public App URL (for SMS and WhatsApp receipt links)</Label>
            <Input
              id="publicAppUrl"
              name="publicAppUrl"
              type="url"
              defaultValue={settings.publicAppUrl || ""}
              placeholder="https://your-live-app.vercel.app or https://school.example.com"
            />
            <p className="text-xs text-gray-500">
              URL accessible from outside the school network. Used in SMS for fee receipt links. Use the exact live domain of this app and include http:// or https://.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              name="currency"
              defaultValue={settings.currency}
            />
          </div>
        </div>
      </div>

      {/* ! Branding Colors */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 text-blue-900 dark:text-blue-100">Branding Colors</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                name="primaryColor"
                type="color"
                defaultValue={settings.primaryColor}
                className="w-20 h-10"
              />
              <Input
                type="text"
                defaultValue={settings.primaryColor}
                className="flex-1"
                readOnly
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryColor">Secondary Color</Label>
            <div className="flex gap-2">
              <Input
                id="secondaryColor"
                name="secondaryColor"
                type="color"
                defaultValue={settings.secondaryColor}
                className="w-20 h-10"
              />
              <Input
                type="text"
                defaultValue={settings.secondaryColor}
                className="flex-1"
                readOnly
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accentColor">Accent Color</Label>
            <div className="flex gap-2">
              <Input
                id="accentColor"
                name="accentColor"
                type="color"
                defaultValue={settings.accentColor}
                className="w-20 h-10"
              />
              <Input
                type="text"
                defaultValue={settings.accentColor}
                className="flex-1"
                readOnly
              />
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded ${
            message.includes("success")
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || isUploadingLogo || isUploadingStamp}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isPending ? "Updating..." : "Update Settings"}
        </Button>
      </div>
    </form>
  );
}
