import { format } from "date-fns";
import { amountInWords, formatCedis } from "@/lib/cedis";
import type { SchoolLetterhead } from "@/lib/school-letterhead";
import type { StudentBillView } from "@/lib/student-bill";
import { formatTermLabel } from "@/lib/termUtils";

//* The printable student bill. Colours are fixed (not theme tokens) because
//* this is paper: it renders the same in dark mode, in print and in the PDF.

function Detail({ label, value, upper = false }: { label: string; value: string; upper?: boolean }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2">
      <dt className="font-semibold text-slate-600">{label}:</dt>
      <dd className={`break-words font-semibold text-slate-900 ${upper ? "uppercase" : ""}`} suppressHydrationWarning>
        {value || " "}
      </dd>
    </div>
  );
}

export function StudentBillDocument({
  school,
  bill,
  className,
}: {
  school: SchoolLetterhead;
  bill: StudentBillView;
  className?: string;
}) {
  const period = `${bill.academicYear} Academic Year ${formatTermLabel(bill.term)}`;
  const contactLine = [school.phone ? `Phone: ${school.phone}` : null, school.email ? `Email: ${school.email}` : null]
    .filter(Boolean)
    .join("   ");
  const billDate = format(new Date(bill.billDate), "EEEE, MMMM d, yyyy");
  const resumptionDate = bill.resumptionDate
    ? format(new Date(bill.resumptionDate), "EEEE, do MMMM, yyyy")
    : "";

  return (
    <article
      className={`w-full border-2 border-slate-800 bg-white text-[12px] leading-snug text-slate-900 ${className ?? ""}`}
    >
      <header className="grid grid-cols-[80px_minmax(0,1fr)_80px] items-center gap-4 border-b-2 border-slate-800 px-5 py-4">
        <div className="flex h-20 w-20 items-center justify-center">
          {/* Plain <img>: next/image's lazy, srcset-driven output is unreliable
              for window.print() and html2canvas. crossOrigin keeps the cached
              copy usable when the PDF export re-reads it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={school.logo}
            alt={`${school.name} logo`}
            crossOrigin="anonymous"
            className="max-h-20 max-w-20 object-contain"
          />
        </div>
        <div className="text-center">
          <h1 className="text-[20px] font-extrabold uppercase leading-tight tracking-wide">{school.name}</h1>
          {school.address && <p className="mt-1 italic text-slate-700">{school.address}</p>}
          {contactLine && <p className="mt-0.5 text-[11px] text-slate-600">{contactLine}</p>}
        </div>
        <div aria-hidden="true" />
      </header>

      <div className="border-b border-slate-400 px-5 py-2 text-center">
        <p className="inline-block border-2 border-slate-800 px-3 py-0.5 text-[13px] font-extrabold uppercase tracking-[0.2em]">
          Student Bill
        </p>
        <p className="mt-1 font-semibold">Total Bill For {period}</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 border-b-2 border-slate-800 px-5 py-3">
        <div className="space-y-1">
          <Detail label="Student ID" value={bill.studentCode} upper />
          <Detail label="Class" value={bill.className ?? ""} upper />
          <Detail label="Bill No" value={bill.billNumber} />
        </div>
        <div className="space-y-1">
          <Detail label="Full Name" value={bill.studentName} upper />
          <Detail label="Bill Date" value={billDate} />
          <Detail label="Bill Term" value={formatTermLabel(bill.term)} />
          <Detail label="Resumption Date" value={resumptionDate} />
        </div>
      </dl>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-100 text-left text-[11px] uppercase tracking-wide">
            <th scope="col" className="w-12 px-5 py-1.5 font-bold">No.</th>
            <th scope="col" className="px-3 py-1.5 font-bold">Description</th>
            <th scope="col" className="w-40 px-5 py-1.5 text-right font-bold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, index) => (
            <tr key={`${item.label}-${index}`} className="border-b border-slate-200">
              <td className="px-5 py-1 text-slate-600">{index + 1}</td>
              <td className="px-3 py-1 uppercase">{item.label}</td>
              <td className="px-5 py-1 text-right tabular-nums">{formatCedis(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t-2 border-slate-800 px-5 py-2">
        <div className="ml-auto max-w-[460px] space-y-1">
          <div className="flex justify-between gap-4 font-semibold">
            <span>Total Bill For {period}</span>
            <span className="tabular-nums">{formatCedis(bill.totalAmount)}</span>
          </div>
          <div className="flex justify-between gap-4 text-slate-700">
            <span>Arrears</span>
            <span className="tabular-nums">{formatCedis(bill.arrears)}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-slate-800 pt-1 text-[15px] font-extrabold uppercase">
            <span>Grand Total</span>
            <span className="tabular-nums">{formatCedis(bill.grandTotal)}</span>
          </div>
        </div>
      </div>

      <p className="border-t border-slate-400 px-5 py-1.5">
        <span className="font-semibold">Amount in Words: </span>
        <span className="italic underline decoration-slate-400 underline-offset-2">
          {amountInWords(bill.grandTotal)}
        </span>
      </p>

      {bill.notes && (
        <div className="border-t border-slate-400 px-5 py-2">
          <p className="font-bold">NB:</p>
          <p className="mt-0.5 whitespace-pre-line text-slate-800">{bill.notes}</p>
        </div>
      )}

      <footer
        className={`grid grid-cols-2 items-end gap-6 border-t-2 border-slate-800 px-5 pb-3 ${
          school.stamp ? "pt-28" : "pt-8"
        }`}
      >
        <p>
          Prepared by: <span className="font-semibold">{bill.preparedBy}</span>
        </p>
        <div className="relative text-center">
          {school.stamp && (
            //* Sits over the signature line like a real stamp. Centred with
            //* margins, not a transform, so html2canvas places it correctly.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={school.stamp}
              alt="School stamp"
              crossOrigin="anonymous"
              className="pointer-events-none absolute bottom-2 left-0 right-0 mx-auto h-[110px] w-[110px] object-contain"
            />
          )}
          <div className="mx-auto w-52 border-t border-slate-800 pt-1 font-semibold">For (Finance Officer)</div>
        </div>
        <p className="col-span-2 text-center text-[11px] font-semibold tracking-wider text-slate-600">
          ***** Computer Generated Bill *****
        </p>
      </footer>
    </article>
  );
}
