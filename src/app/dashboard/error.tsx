"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  const isJWTError = error.message?.includes("decryption") || 
                     error.message?.includes("JWT") ||
                     error.message?.includes("session");

  if (isJWTError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-600">
              <AlertTriangle className="w-6 h-6 mr-2" />
              Session Error Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">
                Your browser has old session cookies that need to be cleared.
              </p>
              <p className="text-xs text-red-700">
                This happens when the authentication system was configured while you had an active session.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">Solution:</p>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Press <kbd className="px-1 py-0.5 bg-white rounded border">F12</kbd> to open Developer Tools</li>
                <li>Go to <strong>Application</strong> tab (Chrome) or <strong>Storage</strong> tab (Firefox)</li>
                <li>Click <strong>Cookies</strong> → <strong>http://* localhost:3000</strong></li>
                <li>Right-click → <strong>Clear all cookies</strong></li>
                <li>Close DevTools and refresh the page</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Link href="/clear-session" className="flex-1">
                <Button className="w-full" variant="default">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Auto-Clear Cookies
                </Button>
              </Link>
              <Link href="/login" className="flex-1">
                <Button className="w-full" variant="outline">
                  Back to Login
                </Button>
              </Link>
            </div>

            <details className="text-xs text-gray-600">
              <summary className="cursor-pointer font-medium">Technical Details</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                {error.message}
              </pre>
            </details>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertTriangle className="w-6 h-6 mr-2" />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">An unexpected error occurred.</p>
          <div className="flex gap-2">
            <Button onClick={reset} className="flex-1">
              Try Again
            </Button>
            <Link href="/login" className="flex-1">
              <Button variant="outline" className="w-full">
                Back to Login
              </Button>
            </Link>
          </div>
          <details className="text-xs text-gray-600">
            <summary className="cursor-pointer font-medium">Error Details</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
              {error.message}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

