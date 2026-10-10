"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Home, Users, GraduationCap, BookOpen, Calendar,
  FileText, ClipboardList, Bell, LogOut, Settings,
  BarChart3, UserCircle, Banknote, Award, MessageSquare,
  ShieldCheck, X, ChevronDown, ChevronRight, Smartphone,
  Library, Lightbulb, ArrowRightLeft, Mail, Ticket, Sparkles, Layers3, Video,
  UserPlus,
  Building2, Briefcase, CalendarCheck, Star, Bot, Package, Wallet, ReceiptText
} from "lucide-react";
import { Button } from "./ui/button";
import { useSidebar } from "@/contexts/SidebarContext";
import {
  hasAnyFeeAccess,
  normalizeUserPermissions,
  type UserPermissions,
} from "@/lib/user-permissions";

type UserRole = "admin" | "teacher" | "student" | "parent";
type AdminRole = "SUPER_ADMIN" | "ADMIN";

interface SidebarSessionUser {
  role?: UserRole;
  adminRole?: AdminRole;
  name?: string | null;
}

interface SidebarUserData {
  name?: string;
  permissions?: UserPermissions;
  surname?: string;
}

interface MenuItem {
  title: string;
  icon: LucideIcon;
  href: string;
  roles: UserRole[];
  adminOnly?: boolean;
  platformOnly?: boolean;
  teacherPermission?: keyof UserPermissions;
}

interface MenuCategory {
  title: string;
  icon: LucideIcon;
  items: MenuItem[];
}

const DEFAULT_SCHOOL_LOGO = "/img/ECKINTOSH LOGO.png";

//* Menu structure with grouped categories
const menuCategories: MenuCategory[] = [
  {
    title: "Dashboard",
    icon: Home,
    items: [
      {
        title: "Dashboard",
        icon: Home,
        href: "/dashboard",
        roles: ["admin", "teacher", "student", "parent"],
      },
    ],
  },
  {
    title: "User Management",
    icon: Users,
    items: [
      {
        title: "Admins",
        icon: ShieldCheck,
        href: "/dashboard/admins",
        roles: ["admin"],
        adminOnly: true,
      },
      {
        title: "Teachers",
        icon: Users,
        href: "/dashboard/teachers",
        roles: ["admin"],
      },
      {
        title: "Students",
        icon: GraduationCap,
        href: "/dashboard/students",
        roles: ["admin", "teacher"],
      },
      {
        title: "Admissions",
        icon: UserPlus,
        href: "/dashboard/admissions",
        roles: ["admin", "teacher"],
        teacherPermission: "admissions",
      },
      {
        title: "Parents",
        icon: UserCircle,
        href: "/dashboard/parents",
        roles: ["admin"],
      },
    ],
  },
  {
    title: "HR Modules",
    icon: Briefcase,
    items: [
      {
        title: "Staff & HR",
        icon: Building2,
        href: "/dashboard/staff",
        roles: ["admin"],
      },
      {
        title: "HR Overview",
        icon: Briefcase,
        href: "/dashboard/hr",
        roles: ["admin"],
      },
      {
        title: "Payroll",
        icon: Banknote,
        href: "/dashboard/hr/payroll",
        roles: ["admin"],
      },
      {
        title: "Payslips",
        icon: ReceiptText,
        href: "/dashboard/hr/payslips",
        roles: ["admin"],
      },
      {
        // Teachers see only their own payslips, read-only
        title: "My Payslips",
        icon: ReceiptText,
        href: "/dashboard/my-payslips",
        roles: ["teacher"],
      },
      {
        title: "Leave",
        icon: CalendarCheck,
        href: "/dashboard/hr/leave",
        roles: ["admin"],
      },
      {
        title: "Appraisals",
        icon: Star,
        href: "/dashboard/hr/appraisals",
        roles: ["admin"],
      },
    ],
  },
  {
    title: "Academics",
    icon: GraduationCap,
    items: [
      {
        title: "Classes",
        icon: Users,
        href: "/dashboard/classes",
        roles: ["admin"],
      },
      {
        title: "Subjects",
        icon: BookOpen,
        href: "/dashboard/subjects",
        roles: ["admin"],
      },
      {
        title: "Timetable Manager",
        icon: Layers3,
        href: "/dashboard/schedule",
        roles: ["admin"],
      },
      {
        title: "Lessons",
        icon: FileText,
        href: "/dashboard/lessons",
        roles: ["admin", "teacher"],
      },
      {
        title: "Lessons",
        icon: FileText,
        href: "/dashboard/academics",
        roles: ["student"],
      },
      {
        title: "Necessities",
        icon: Library,
        href: "/dashboard/academics/necessities",
        roles: ["admin", "teacher", "student", "parent"],
      },
      {
        title: "Library",
        icon: Library,
        href: "/dashboard/lessons/library",
        roles: ["admin", "teacher", "student", "parent"],
      },
      {
        title: "Video Lessons",
        icon: Video,
        href: "/dashboard/lessons/video-lessons",
        roles: ["admin", "teacher", "student"],
      },
      {
        title: "Notes",
        icon: FileText,
        href: "/dashboard/academics/notes",
        roles: ["admin", "teacher", "student", "parent"],
      },
      {
        title: "Study Tools",
        icon: Lightbulb,
        href: "/dashboard/academics/study-tools",
        roles: ["admin", "student", "teacher"],
      },
      {
        title: "Eckintosh AI",
        icon: Sparkles,
        href: "/dashboard/acadeal-ai",
        roles: ["teacher", "student"],
      },
    ],
  },
  {
    title: "Assessments",
    icon: ClipboardList,
    items: [
      {
        title: "Exams",
        icon: ClipboardList,
        href: "/dashboard/exams",
        roles: ["admin", "teacher", "student"],
      },
      {
        title: "Assignments",
        icon: FileText,
        href: "/dashboard/assignments",
        roles: ["admin", "teacher", "student"],
      },
      {
        title: "Results",
        icon: BarChart3,
        href: "/dashboard/results",
        roles: ["admin", "teacher", "student"],
      },
      {
        title: "Report Card",
        icon: Award,
        href: "/dashboard/teachers/report-card",
        roles: ["admin", "teacher"],
      },
      {
        title: "My Report Cards",
        icon: Award,
        href: "/dashboard/student-report-cards",
        roles: ["student"],
      },
      {
        title: "Student Report Cards",
        icon: Award,
        href: "/dashboard/parent-report-cards",
        roles: ["parent"],
      },
    ],
  },
  {
    title: "Analytics",
    icon: BarChart3,
    items: [
      {
        title: "Performance Analytics",
        icon: BarChart3,
        href: "/dashboard/analytics",
        roles: ["admin"],
      },
    ],
  },
  {
    title: "Attendance",
    icon: Calendar,
    items: [
      {
        title: "Attendance",
        icon: Calendar,
        href: "/dashboard/attendance",
        roles: ["admin", "teacher", "student"],
      },
    ],
  },
  {
    title: "Behaviour",
    icon: Award,
    items: [
      {
        title: "Behaviour",
        icon: Award,
        href: "/dashboard/behavior",
        roles: ["admin", "teacher"],
      },
    ],
  },
  {
    title: "Communication",
    icon: MessageSquare,
    items: [
      {
        title: "Announcements",
        icon: Bell,
        href: "/dashboard/announcements",
        roles: ["admin", "teacher", "student", "parent"],
      },
      {
        title: "Chats",
        icon: MessageSquare,
        href: "/dashboard/messages",
        roles: ["admin", "teacher", "student", "parent"],
      },
      {
        title: "Meetings",
        icon: Calendar,
        href: "/dashboard/meetings",
        roles: ["admin", "teacher", "parent"],
      },
      {
        title: "SMS",
        icon: Smartphone,
        href: "/dashboard/sms",
        roles: ["admin"],
      },
      {
        title: "Events",
        icon: Calendar,
        href: "/dashboard/events",
        roles: ["admin", "teacher", "student", "parent"],
      },
      {
        title: "AI Assistant",
        icon: Bot,
        href: "/dashboard/system-chat",
        roles: ["admin"],
      },
    ],
  },
  {
    title: "Finance",
    icon: Banknote,
    items: [
      {
        title: "Excursion",
        icon: Ticket,
        href: "/dashboard/excursion",
        roles: ["admin", "teacher"],
      },
      {
        title: "Collections",
        icon: Layers3,
        href: "/dashboard/collections",
        roles: ["admin", "teacher"],
      },
      {
        title: "Fees & Bills",
        icon: Banknote,
        href: "/dashboard/fees",
        roles: ["admin", "teacher"],
      },
      {
        title: "Income & Expenses",
        icon: Wallet,
        href: "/dashboard/finance",
        roles: ["admin"],
      },
      {
        title: "Sales & Inventory",
        icon: Package,
        href: "/dashboard/inventory",
        roles: ["admin", "teacher"],
      },
      {
        title: "Children's Fees",
        icon: Banknote,
        href: "/dashboard/fees/my-fees",
        roles: ["parent"],
      },
      {
        // Students get their own read-only fee statement page
        title: "My Fees",
        icon: Banknote,
        href: "/dashboard/fees/my-fees",
        roles: ["student"],
      },
    ],
  },
  {
    title: "Utilities",
    icon: Settings,
    items: [
      {
        title: "Dropout Students",
        icon: Users,
        href: "/dashboard/utilities/dropout-students",
        roles: ["admin"],
      },
      {
        title: "Migrate Class",
        icon: ArrowRightLeft,
        href: "/dashboard/utilities/migrate-class",
        roles: ["admin"],
      },
      {
        title: "Old Students",
        icon: GraduationCap,
        href: "/dashboard/utilities/old-students",
        roles: ["admin"],
      },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    items: [
      {
        title: "Settings",
        icon: Settings,
        href: "/dashboard/settings",
        roles: ["admin"],
        adminOnly: true,
      },
      {
        title: "Email Templates",
        icon: Mail,
        href: "/dashboard/email-templates",
        roles: ["admin"],
        adminOnly: true,
      },
      {
        title: "School Onboarding",
        icon: Building2,
        href: "/dashboard/platform/schools",
        roles: ["admin"],
        adminOnly: true,
        platformOnly: true,
      },
    ],
  },
  {
    title: "System",
    icon: ShieldCheck,
    items: [
      {
        title: "Audit Logs",
        icon: FileText,
        href: "/dashboard/logs",
        roles: ["admin"],
      },
    ],
  },
];

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();
  const sessionUser = session?.user as SidebarSessionUser | undefined;
  const userRole = sessionUser?.role || "student";
  const adminRole = sessionUser?.adminRole;
  const [schoolName, setSchoolName] = useState("SMS");
  const [schoolFullName, setSchoolFullName] = useState("Student Management");
  const [schoolLogo, setSchoolLogo] = useState(DEFAULT_SCHOOL_LOGO);
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#8b5cf6");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["Dashboard"]);
  const [collapsedActiveCategory, setCollapsedActiveCategory] = useState<string | null>(null);
  const [userData, setUserData] = useState<SidebarUserData | null>(null);
  const [isPlatformRequest, setIsPlatformRequest] = useState(false);

  useEffect(() => {
    const applyBranding = (data: {
      schoolShortName?: string | null;
      schoolName?: string | null;
      schoolLogo?: string | null;
      primaryColor?: string | null;
      secondaryColor?: string | null;
    }) => {
      if (data.schoolShortName) setSchoolName(data.schoolShortName);
      if (data.schoolName) setSchoolFullName(data.schoolName);
      setSchoolLogo(
        typeof data.schoolLogo === "string" && data.schoolLogo.trim()
          ? data.schoolLogo
          : DEFAULT_SCHOOL_LOGO
      );
      if (data.primaryColor) setPrimaryColor(data.primaryColor);
      if (data.secondaryColor) setSecondaryColor(data.secondaryColor);
    };

    //* Fetch school settings for branding
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => applyBranding(data))
      .catch(() => {});

    //* Profile update listener
    const fetchUserProfile = () => {
      fetch("/api/user/profile")
        .then((res) => res.json())
        .then((data: SidebarUserData & { error?: string }) => {
          if (data && !data.error) {
            setUserData(data);
          }
        })
        .catch(() => {});
    };

    fetchUserProfile();
    window.addEventListener("profile-updated", fetchUserProfile);

    fetch("/api/tenant/current")
      .then((res) => res.json())
      .then((data: { isPlatformRequest?: boolean }) => {
        setIsPlatformRequest(Boolean(data?.isPlatformRequest));
      })
      .catch(() => {
        setIsPlatformRequest(false);
      });

    //* Event listener for real-time updates
    const handleSettingsUpdate = () => {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => applyBranding(data));
    };

    window.addEventListener("settings-updated", handleSettingsUpdate);

    return () => {
      window.removeEventListener("profile-updated", fetchUserProfile);
      window.removeEventListener("settings-updated", handleSettingsUpdate);
    };
  }, [pathname]);

  const filterItems = (items: MenuItem[]) => {
    return items.filter((item) => {
      if (!item.roles.includes(userRole)) return false;
      if (item.adminOnly && adminRole !== "SUPER_ADMIN") return false;
      if (item.platformOnly && !isPlatformRequest) return false;
      if (
        userRole === "teacher" &&
        item.teacherPermission &&
        !normalizeUserPermissions(userData?.permissions)[item.teacherPermission]
      ) {
        return false;
      }
      if (
        userRole === "teacher" &&
        item.href === "/dashboard/fees" &&
        !hasAnyFeeAccess(normalizeUserPermissions(userData?.permissions))
      ) {
        return false;
      }
      return true;
    });
  };

  const filteredCategories = menuCategories
    .map((category) => ({
      ...category,
      items: filterItems(category.items),
    }))
    .filter((category) => category.items.length > 0);

  const isPathMatch = (href: string) => {
    const hrefPath = href.split("?")[0];
    return pathname === hrefPath;
  };

  const activeCategoryTitle = filteredCategories.find((category) =>
    category.items.some((item) => isPathMatch(item.href))
  )?.title;

  const toggleCategory = (categoryTitle: string) => {
    if (categoryTitle === activeCategoryTitle) {
      setExpandedCategories((prev) => prev.filter((title) => title !== categoryTitle));
      setCollapsedActiveCategory((prev) => (prev === categoryTitle ? null : categoryTitle));
      return;
    }

    setExpandedCategories((prev) =>
      prev.includes(categoryTitle)
        ? prev.filter((title) => title !== categoryTitle)
        : [...prev, categoryTitle]
    );
  };

  const handleMenuItemClick = () => {
    setCollapsedActiveCategory(null);
    setExpandedCategories([]);

    if (window.innerWidth < 1024) {
      close();
    }
  };

  return (
    <>
      {/* * Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={close}
        />
      )}

      {/* ! Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 h-screen bg-card border-r border-border flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded">
              <Image
                src={schoolLogo}
                alt="School Logo"
                fill
                sizes="40px"
                className="object-contain"
                onError={() => setSchoolLogo(DEFAULT_SCHOOL_LOGO)}
              />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: primaryColor }}>
                {schoolName}
              </h1>
              <p className="text-xs" style={{ color: secondaryColor }}>
                {schoolFullName}
              </p>
            </div>
          </div>

          {/* * Close button for mobile view */}
          <button
            onClick={close}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {filteredCategories.map((category) => {
              const isExpanded =
                category.title === activeCategoryTitle
                  ? collapsedActiveCategory !== category.title
                  : expandedCategories.includes(category.title);
              const isDashboard = category.title === "Dashboard";

              return (
                <li key={category.title}>
                  {!isDashboard && (
                    <button
                      onClick={() => toggleCategory(category.title)}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {category.icon && <category.icon className="w-4 h-4" />}
                        <span>{category.title}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {(isDashboard || isExpanded) && (
                    <ul className="space-y-1">
                      {category.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = isPathMatch(item.href);

                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={handleMenuItemClick}
                              className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
                                isActive ? "text-white" : "hover:bg-muted"
                              }`}
                              style={
                                isActive
                                  ? { backgroundColor: primaryColor }
                                  : {}
                              }
                            >
                              <Icon
                                className="w-4 h-4"
                                style={{ color: isActive ? "white" : primaryColor }}
                              />
                              <span
                                className="text-sm"
                                style={{ color: isActive ? "white" : secondaryColor }}
                              >
                                {item.title}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium text-foreground">
              {userData ? (userRole === "admin" ? userData.name : `${userData.name} ${userData.surname}`) : (session?.user?.name)}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
          </div>
          <Button
            onClick={() => signOut({ callbackUrl: "/login" })}
            variant="destructive"
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </>
  );
}
