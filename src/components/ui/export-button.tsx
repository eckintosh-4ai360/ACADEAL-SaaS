"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportToCSV, exportToExcel, formatDataForExport } from "@/lib/exportUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportButtonProps {
  data: any[];
  filename: string;
  fieldsToRemove?: string[];
}

export function ExportButton({ data, filename, fieldsToRemove }: ExportButtonProps) {
  const handleExportCSV = () => {
    const formattedData = formatDataForExport(data, fieldsToRemove);
    exportToCSV(formattedData, filename);
  };

  const handleExportExcel = () => {
    const formattedData = formatDataForExport(data, fieldsToRemove);
    exportToExcel(formattedData, filename);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          Export as Excel (.xlsx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

