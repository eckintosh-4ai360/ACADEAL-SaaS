"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";

export default function ClearSessionPage() {
  const router = useRouter();

  useEffect(() => {
    const clearSession = async () => {
      try {
        //* Delete all NextAuth cookies manually
        if (typeof document !== "undefined") {
          const cookies = document.cookie.split(";");
          for (let cookie of cookies) {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
            //* Delete cookie for all paths
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
          }
        }

        //* Sign out to ensure NextAuth clears its cookies
        await signOut({ redirect: false });
        
        //* Clear localStorage and sessionStorage
        if (typeof window !== "undefined") {
          localStorage.clear();
          sessionStorage.clear();
        }

        //* Wait a moment then redirect to login
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } catch (error) {
        console.error("Error clearing session:", error);
        //* Force redirect anyway
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      }
    };

    clearSession();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-center text-center">
            <AlertCircle className="w-6 h-6 mr-2 text-orange-500" />
            Clearing Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-gray-700 font-medium">
              Clearing old session data...
            </p>
            <p className="text-sm text-gray-500">
              You'll be redirected to login in a moment.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Why is this happening?</strong><br />
              Your session cookies were created before the authentication system was fully configured.
              We're clearing them now so you can log in again with a fresh session.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

