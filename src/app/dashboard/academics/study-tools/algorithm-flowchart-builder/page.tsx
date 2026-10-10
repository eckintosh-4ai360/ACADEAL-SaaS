"use client";

import AlgorithmFlowchartBuilder from "../components/AlgorithmFlowchartBuilder";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function AlgorithmFlowchartBuilderPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto mb-6">
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Study Tools
        </Link>
      </div>
      
      <AlgorithmFlowchartBuilder />
    </div>
  );
}
