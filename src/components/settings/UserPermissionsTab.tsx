"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";
import { saveUserPermissions, getUserPermissions, saveAllTeachersPermissions } from "@/lib/actions";
import {
  DEFAULT_USER_PERMISSIONS,
  type UserPermissions,
} from "@/lib/user-permissions";
import { Loader2, Users } from "lucide-react";

const ALL_TEACHERS_VALUE = "__ALL_TEACHERS__";

type AdminUserOption = {
  id: string;
  name: string;
  role: string;
  staffId: string;
};

type TeacherUserOption = {
  id: string;
  name: string;
  staffId: string;
  surname: string;
};

interface UserPermissionsTabProps {
  admins: AdminUserOption[];
  teachers: TeacherUserOption[];
}

const PERMISSION_LABELS: { label: string; key: keyof UserPermissions }[] = [
  { label: "Record Students", key: "recordStudents" },
  { label: "Edit Fee Records", key: "editFeeRecords" },
  { label: "Statement", key: "statement" },
  { label: "Prepare Bill", key: "prepareBill" },
  { label: "Admissions", key: "admissions" },
  { label: "Payment List", key: "paymentList" },
  { label: "Generate Bill", key: "generateBill" },
  { label: "Arrears PDF", key: "arrearsPDF" },
  { label: "School Fees", key: "schoolFees" },
  { label: "Receipt", key: "receipt" },
  { label: "View Detail", key: "viewDetail" },
  { label: "Expenses", key: "expenses" },
  { label: "Income", key: "income" },
  { label: "Special Fees Offer", key: "specialFeesOffer" },
  { label: "Bus Fee", key: "busFee" },
  { label: "Feeding Fee", key: "feedingFee" },
  { label: "Salary", key: "salary" },
  { label: "Salary Advance", key: "salaryAdvance" },
  { label: "Financial Report", key: "financialReport" },
  { label: "Message", key: "message" },
];

export function UserPermissionsTab({ admins, teachers }: UserPermissionsTabProps) {
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedUserType, setSelectedUserType] = useState<"admin" | "teacher">("admin");
  const [isAllTeachers, setIsAllTeachers] = useState(false);
  const [position, setPosition] = useState("");
  const [staffId, setStaffId] = useState("");
  const [permissions, setPermissions] = useState<UserPermissions>({ ...DEFAULT_USER_PERMISSIONS });
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const allUsers = [
    ...admins.map((a) => ({ ...a, type: "admin" as const })),
    ...teachers.map((t) => ({ ...t, type: "teacher" as const })),
  ];

  const handleUserChange = async (userId: string) => {
    setSelectedUser(userId);

    if (!userId) {
      setIsAllTeachers(false);
      setPermissions({ ...DEFAULT_USER_PERMISSIONS });
      setPosition("");
      setStaffId("");
      return;
    }

    // Special "All Teachers" bulk mode
    if (userId === ALL_TEACHERS_VALUE) {
      setIsAllTeachers(true);
      setPermissions({ ...DEFAULT_USER_PERMISSIONS });
      setPosition("");
      setStaffId("");
      return;
    }

    setIsAllTeachers(false);
    const user = allUsers.find((u) => u.id === userId);
    if (!user) return;

    setSelectedUserType(user.type);
    setStaffId(user.staffId);
    setPosition(user.type === "admin" ? user.role : "Teacher");

    // Load saved permissions from the database
    setIsFetching(true);
    try {
      const saved = await getUserPermissions(userId, user.type);
      setPermissions(saved);
    } catch {
      toast.error("Could not load current permissions.");
      setPermissions({ ...DEFAULT_USER_PERMISSIONS });
    } finally {
      setIsFetching(false);
    }
  };

  const handlePermissionChange = (key: keyof UserPermissions, value: boolean) => {
    setPermissions((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      toast.error("Please select a user.");
      return;
    }

    startSaving(async () => {
      if (isAllTeachers) {
        const result = await saveAllTeachersPermissions(permissions);
        if (result.success) {
          toast.success(result.message || "Permissions applied to all teachers!");
        } else {
          toast.error(result.message || "Failed to update permissions.");
        }
      } else {
        const result = await saveUserPermissions(selectedUser, selectedUserType, permissions);
        if (result.success) {
          toast.success(result.message || "Permissions updated!");
        } else {
          toast.error(result.message || "Failed to update permissions.");
        }
      }
    });
  };

  const handleClear = () => {
    setSelectedUser("");
    setIsAllTeachers(false);
    setPosition("");
    setStaffId("");
    setPermissions({ ...DEFAULT_USER_PERMISSIONS });
  };

  const isDisabled = !selectedUser || isFetching || isSaving;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* User Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="selectUser">Select User</Label>
          <select
            id="selectUser"
            value={selectedUser}
            onChange={(e) => handleUserChange(e.target.value)}
            disabled={isFetching || isSaving}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">Select...</option>
            <optgroup label="── Bulk Actions ──">
              <option value={ALL_TEACHERS_VALUE}>
                👥 All Teachers ({teachers.length})
              </option>
            </optgroup>
            <optgroup label="Administrators">
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name} ({admin.staffId})
                </option>
              ))}
            </optgroup>
            <optgroup label="Teachers">
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} {teacher.surname} ({teacher.staffId})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {!isAllTeachers && (
          <>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Position"
                disabled={!selectedUser || isFetching}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staffId">Staff ID</Label>
              <Input
                id="staffId"
                value={staffId}
                readOnly
                className="bg-gray"
                placeholder="Staff ID"
              />
            </div>
          </>
        )}

        {isAllTeachers && (
          <div className="md:col-span-2 flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-300">
            <Users className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              <span className="font-semibold">Bulk mode:</span> The permissions you set below will be applied to{" "}
              <span className="font-semibold">all {teachers.length} teacher(s)</span> in the system, overwriting their individual settings.
            </p>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isFetching && (
        <div className="flex items-center gap-2 text-sm text-blue-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading current permissions...
        </div>
      )}

      {/* Permissions Grid */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-4 text-blue-900 dark:text-blue-100">Permissions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {PERMISSION_LABELS.map(({ label, key }) => (
            <div key={key} className="space-y-1">
              <Label className="text-sm text-gray-600">{label}</Label>
              <select
                value={permissions[key] ? "yes" : "no"}
                onChange={(e) => handlePermissionChange(key, e.target.value === "yes")}
                disabled={isDisabled}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          disabled={isSaving || isFetching}
          className="bg-red-500 text-white hover:bg-red-600"
        >
          CLEAR
        </Button>
        <Button
          type="submit"
          disabled={isDisabled}
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSaving ? "Saving..." : isAllTeachers ? `APPLY TO ALL ${teachers.length} TEACHERS` : "UPDATE"}
        </Button>
      </div>
    </form>
  );
}
