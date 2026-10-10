import DictionaryTool from "../components/DictionaryTool";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Dictionary & Meaning Explorer | Study Tools",
  description: "Search for words and explore their meanings, parts of speech, and more.",
};

export default function DictionaryPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto mb-6 max-w-4xl">
        <Link
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Study Tools
        </Link>
      </div>

      <DictionaryTool />
    </div>
  );
}
