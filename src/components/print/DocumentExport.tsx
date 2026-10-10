"use client";

import { useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { createPortal, flushSync } from "react-dom";

const PRINT_ROOT_ID = "document-print-root";

//* Only the document prints. The print copy lives in a portal on <body> because
//* the dashboard shell is a fixed-height, overflow-hidden flex column that would
//* clip it; while exporting a PDF it is shown off-screen at a fixed width so the
//* PDF looks the same whatever the screen size. Each `.print-page` child starts
//* a new A4 page, so one print can hold a whole class's bills.
//*
//* The img rule: html2canvas finds text baselines with a 1x1 <img> it appends to
//* <body>, and Tailwind's preflight makes every img display:block, which pushes
//* all PDF text a few pixels down. Keep that probe inline.
const PRINT_CSS = `
#${PRINT_ROOT_ID} { display: none; }
#${PRINT_ROOT_ID}[data-capturing] { display: block; position: absolute; top: 0; left: -10000px; width: 760px; }
body > div > img[width="1"][height="1"] { display: inline !important; }
@media print {
  @page { size: A4 portrait; margin: 10mm; }
  html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
  body > *:not(#${PRINT_ROOT_ID}) { display: none !important; }
  #${PRINT_ROOT_ID} { display: block !important; position: static !important; width: auto !important; }
  #${PRINT_ROOT_ID} * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  #${PRINT_ROOT_ID} .print-page { break-inside: avoid; }
  #${PRINT_ROOT_ID} .print-page + .print-page { break-before: page; }
}
`;

function subscribeNothing() {
  return () => {};
}

/**
 * Print and PDF export for the documents on a page. Pass `printRef` and
 * `capturing` to <DocumentPrintCopy>; `window.print()` then prints only those
 * documents, and `downloadPdf` saves one A4 PDF page per `.print-page` child
 * (it throws if the export fails).
 */
export function useDocumentExport() {
  const printRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);

  async function downloadPdf(fileName: string) {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    flushSync(() => setCapturing(true));
    try {
      const root = printRef.current;
      if (!root) throw new Error("The document is not ready to export.");
      const pages = Array.from(root.querySelectorAll<HTMLElement>(":scope > .print-page"));

      const pdf = new jsPDF("p", "mm", "a4");
      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const maxHeight = pdf.internal.pageSize.getHeight() - margin * 2;

      for (const [index, page] of (pages.length > 0 ? pages : [root]).entries()) {
        const canvas = await html2canvas(page, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        let width = pageWidth - margin * 2;
        let height = (canvas.height * width) / canvas.width;
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        if (index > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", (pageWidth - width) / 2, margin, width, height);
      }

      pdf.save(fileName);
    } finally {
      setCapturing(false);
    }
  }

  return { printRef, capturing, downloadPdf };
}

export function DocumentPrintCopy({
  printRef,
  capturing,
  children,
}: {
  printRef: RefObject<HTMLDivElement | null>;
  capturing: boolean;
  //* One or more <div className="print-page"> elements.
  children: ReactNode;
}) {
  const isClient = useSyncExternalStore(subscribeNothing, () => true, () => false);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      {isClient &&
        createPortal(
          <div id={PRINT_ROOT_ID} aria-hidden="true" data-capturing={capturing ? "" : undefined}>
            <div ref={printRef}>{children}</div>
          </div>,
          document.body
        )}
    </>
  );
}

export function fileSafeName(value: string, fallback: string) {
  return value.trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || fallback;
}
