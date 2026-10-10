"use client";

import React, { useState, useEffect, useRef } from "react";
import { getStudentReportCards } from "@/lib/actions/reportCardActions";
import ReportCardView, { SavedCard } from "./ReportCardView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Eye, X, Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface StudentReportCardListProps {
  studentId: string;
  schoolStamp?: string | null;
}

async function embedStampForPdf(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Stamp request failed: ${response.status}`);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read the school stamp"));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function StudentReportCardList({ studentId, schoolStamp }: StudentReportCardListProps) {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<SavedCard | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchCards() {
      setLoading(true);
      const res = await getStudentReportCards(studentId);
      if (res.success && res.data) {
        setCards(res.data.map(d => ({
          ...(d.cardData as Omit<SavedCard, "id" | "savedAt">),
          id: d.id,
          savedAt: d.createdAt.toISOString()
        })));
      }
      setLoading(false);
    }
    fetchCards();
  }, [studentId]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current || !selectedCard) return;
    
    setIsExporting(true);
    try {
      // Find the actual card element to avoid capturing outer padding/margins
      const el = reportRef.current.querySelector(".rc-card-break") as HTMLElement || reportRef.current;
      const embeddedStamp = schoolStamp ? await embedStampForPdf(schoolStamp) : null;
      if (embeddedStamp && !el.querySelector("img.rc-archive-stamp")) {
        throw new Error("The school stamp is missing from the report card");
      }
      
      const canvas = await html2canvas(el, {
        scale: 3, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 800, // Aligned with ~210mm width
        onclone: (_document, clonedElement) => {
          const image = clonedElement.querySelector<HTMLImageElement>("img.rc-archive-stamp");
          if (image && embeddedStamp) image.src = embeddedStamp;
        },
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate height based on aspect ratio to avoid distortion while filling width
      const imgProps = pdf.getImageProperties(imgData);
      const scaledHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // If the scaled image is taller than the page, use page height and scale width
      if (scaledHeight > pdfHeight) {
        const scaledWidth = (imgProps.width * pdfHeight) / imgProps.height;
        pdf.addImage(imgData, "JPEG", (pdfWidth - scaledWidth) / 2, 0, scaledWidth, pdfHeight);
      } else {
        // Fill width and center vertically if shorter
        const yOffset = (pdfHeight - scaledHeight) / 2;
        pdf.addImage(imgData, "JPEG", 0, yOffset, pdfWidth, scaledHeight);
      }
      
      pdf.save(`${selectedCard.studentName.replace(/\s+/g, '_')}_Report_Card.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Error generating PDF");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          No report cards available yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {selectedCard ? (
        <div className="space-y-4 print-root">
          <div className="flex items-center justify-between no-print gap-4">
            <Button variant="outline" onClick={() => setSelectedCard(null)}>
              <X className="w-4 h-4 mr-2" /> Back to List
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleDownloadPDF} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Save to PDF
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
            </div>
          </div>
          <div ref={reportRef} className="print-area">
            <ReportCardView card={selectedCard} gradeScale={selectedCard.gradeScale} stampSrc={schoolStamp} />
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>My Report Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                    <th className="p-4">Academic Year</th>
                    <th className="p-4">Term</th>
                    <th className="p-4">Class</th>
                    <th className="p-4">Overall Pos.</th>
                    <th className="p-4">Date Saved</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cards.map((card) => (
                    <tr key={card.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4 font-medium">{card.academicYear || "—"}</td>
                      <td className="p-4">{card.reportTitle}</td>
                      <td className="p-4">{card.className}</td>
                      <td className="p-4 text-primary font-bold">{card.overallPos || "—"}</td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(card.savedAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedCard(card)}>
                          <Eye className="w-4 h-4 mr-2" /> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <style jsx global>{`
        @media print {
          @page { margin: 10mm; }

          /* Hide UI elements */
          .no-print, 
          header, 
          nav, 
          aside, 
          .AdminSystemChat-container,
          button { 
            display: none !important; 
          }
          
          /* Full reset of the dashboard container structure */
          html, body, #__next, 
          .h-screen, .flex, .flex-col, .flex-1, 
          main, 
          .overflow-y-auto, .overflow-hidden { 
            height: auto !important; 
            min-height: auto !important;
            overflow: visible !important; 
            display: block !important;
            background: #fff !important;
            position: static !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          
          /* Ensure our specific print target is isolated */
          .print-root {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .print-area {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .rc-card-break { 
            border: 2px solid #1e3a5f !important; 
            margin: 0 auto !important; 
            width: 100% !important; 
            max-width: 210mm !important; 
            min-height: 260mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
          }
          
          /* Force colors and backgrounds */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
