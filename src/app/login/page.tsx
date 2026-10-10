"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { Eye, EyeOff, User, Lock, GraduationCap, BookOpen, PenLine } from "lucide-react";

const DEFAULT_SCHOOL_LOGO = "/img/ECKINTOSH LOGO.png";

export default function LoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [schoolName, setSchoolName] = useState("Student Management System");
  const [schoolLogo, setSchoolLogo] = useState(DEFAULT_SCHOOL_LOGO);

  useEffect(() => {
    //* Fetch school settings for branding
    fetch("/api/settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { schoolName?: string; schoolLogo?: string | null }) => {
        if (data.schoolName) {
          setSchoolName(data.schoolName);
        }

        setSchoolLogo(
          typeof data.schoolLogo === "string" && data.schoolLogo.trim()
            ? data.schoolLogo
            : DEFAULT_SCHOOL_LOGO
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      fetch("/api/settings", { cache: "no-store" })
        .then((response) => response.json())
        .then((data: { schoolName?: string; schoolLogo?: string | null }) => {
          if (data.schoolName) {
            setSchoolName(data.schoolName);
          }

          setSchoolLogo(
            typeof data.schoolLogo === "string" && data.schoolLogo.trim()
              ? data.schoolLogo
              : DEFAULT_SCHOOL_LOGO
          );
        })
        .catch(() => {});
    };

    window.addEventListener("settings-updated", handleSettingsUpdate);

    return () => {
      window.removeEventListener("settings-updated", handleSettingsUpdate);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = userId.trim();
    const callbackUrl =
      typeof window === "undefined"
        ? "/dashboard"
        : new URLSearchParams(window.location.search).get("callbackUrl") || "/dashboard";

    if (!identifier || !password) {
      toast.error("Enter your user ID and password.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        userId: identifier,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        let errorMessage = "Login failed due to a server error. Please try again.";

        if (result.error === "CredentialsSignin") {
          errorMessage = "Invalid user ID or password.";
        } else if (result.error.startsWith("ACCOUNT_LOCKED:")) {
          const minutes = result.error.split(":")[1];
          errorMessage = `Account locked due to 5 failed attempts. Please try again in ${minutes} minutes.`;
        }

        toast.error(errorMessage);
        setLoading(false);
      } else if (result?.ok) {
        toast.success("Login successful!");
        window.location.assign(result.url || callbackUrl);
      } else {
        toast.error("An error occurred. Please try again.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* Left column — brand / illustration panel */}
      <div className="relative hidden lg:flex lg:w-2/3 flex-col justify-between overflow-hidden bg-blue-700 px-12 py-12 text-white">
        {/* Background image */}
        <Image
          src="/img/student login.jpg"
          alt=""
          fill
          priority
          className="object-cover"
        />
        {/* Gradient tint over the image */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-600/40 via-indigo-600/45 to-violet-700/40" />

        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-6rem] right-[-4rem] h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 right-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

        <div className="relative z-10 flex items-center gap-3">
          <Image
            src={schoolLogo}
            alt={schoolName}
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg object-contain bg-white/90 p-1"
            onError={() => setSchoolLogo(DEFAULT_SCHOOL_LOGO)}
          />
          <span className="text-lg font-semibold tracking-tight">{schoolName}</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
            Empowering
            <br />
            Digital Education
          </h1>
          <p className="mt-4 text-base text-white/80 leading-relaxed">
            Manage students, teachers, classes and results in one secure
            platform built for modern schools.
          </p>

          {/* Floating illustration made of cards + icons */}
          <div className="relative mt-12 h-56">
            <div className="absolute left-0 top-6 w-48 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-4 shadow-xl">
              <GraduationCap className="h-8 w-8 text-white" />
              <p className="mt-3 text-sm font-medium">Academic Records</p>
              <p className="text-xs text-white/70">Track progress with ease</p>
            </div>
            <div className="absolute right-0 top-24 w-44 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-4 shadow-xl">
              <BookOpen className="h-7 w-7 text-white" />
              <p className="mt-3 text-sm font-medium">Class Resources</p>
            </div>
            <div className="absolute left-16 bottom-0 w-40 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-4 shadow-xl">
              <PenLine className="h-7 w-7 text-white" />
              <p className="mt-3 text-sm font-medium">Assessments</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/60">
          ECKINTOSH &mdash; Engineering Digital Solutions <br />
          <span>For support contact: 053 115 2121 || 024 836 5559</span>
        </p>

      </div>

      {/* Right column — login form */}
      <div className="relative flex w-full lg:w-1/2 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100 px-6 py-12 sm:px-10">
        {/* Decorative color washes to give the glass card something to refract */}
        <div className="pointer-events-none absolute -top-16 right-[-3rem] h-80 w-80 rounded-full bg-blue-400/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-6rem] left-[-5rem] h-80 w-80 rounded-full bg-violet-400/40 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 right-10 h-40 w-40 rounded-full bg-pink-300/30 blur-3xl" />

        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/60 bg-white/30 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl sm:p-10">
          <div className="mb-8 lg:hidden flex flex-col items-center text-center">
            <Image
              src={schoolLogo}
              alt={schoolName}
              width={56}
              height={56}
              className="h-14 w-14 object-contain mb-3"
              priority
              onError={() => setSchoolLogo(DEFAULT_SCHOOL_LOGO)}
            />
          </div>

          <h2 className="text-3xl font-bold text-slate-900">User Login</h2>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back to {schoolName}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="userId" className="sr-only">
                User ID
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="userId"
                  type="text"
                  placeholder="User ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="username"
                  className="h-12 w-full rounded-lg border border-white/70 bg-white/50 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none backdrop-blur-sm transition focus:border-blue-500 focus:bg-white/80 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="h-12 w-full rounded-lg border border-white/70 bg-white/50 pl-11 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none backdrop-blur-sm transition focus:border-blue-500 focus:bg-white/80 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-sm">
              <label className="flex items-center gap-2 text-slate-500 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                />
                Remember me
              </label>
              <Link
                href="/forgot-password"
                className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-base font-semibold shadow-lg shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700"
            >
              {loading ? "Signing in..." : "Login"}
            </Button>
          </form>

          {/* <div className="mt-8 rounded-lg border border-dashed border-slate-300/70 bg-white/30 px-4 py-3 text-sm text-slate-500 backdrop-blur-sm">
            <p className="font-bold text-slate-700">
              ECKINTOSH{" "}
              <span className="text-xs font-normal italic tracking-[0.18em] text-slate-400">
                Engineering Digital Solutions
              </span>
            </p>
            <small>For support contact: 053 115 2121 || 024 836 5559</small>
          </div> */}
        </div>
      </div>
    </div>
  );
}
