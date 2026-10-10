//* Ghana Cedi money helpers shared by payslips and student bills.

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

//* Always Ghana Cedis: SystemSettings.currency defaults to USD in the database
//* and is not a reliable signal (see formatCurrency in students/[id]/page.tsx).
export function formatCedis(amount: number) {
  const value = roundMoney(amount);
  const formatted = Math.abs(value).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "-" : ""}GH₵${formatted}`;
}

const ONES = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const SCALES = ["", "Thousand", "Million", "Billion", "Trillion"];

function hundredsToWords(value: number) {
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  const words: string[] = [];

  if (hundreds) words.push(`${ONES[hundreds]} Hundred`);
  if (rest >= 20) {
    const tens = TENS[Math.floor(rest / 10)];
    words.push(rest % 10 ? `${tens}-${ONES[rest % 10]}` : tens);
  } else if (rest) {
    words.push(ONES[rest]);
  }

  return words.join(" ");
}

export function integerToWords(value: number) {
  if (value === 0) return ONES[0];

  const groups: string[] = [];
  let remaining = Math.floor(Math.abs(value));

  for (let scale = 0; remaining > 0 && scale < SCALES.length; scale++) {
    const chunk = remaining % 1000;
    if (chunk) {
      groups.unshift([hundredsToWords(chunk), SCALES[scale]].filter(Boolean).join(" "));
    }
    remaining = Math.floor(remaining / 1000);
  }

  return groups.join(" ");
}

//* 350 → "Three Hundred Fifty Cedis and No Pesewas"
export function amountInWords(amount: number) {
  const pesewasTotal = Math.round(roundMoney(Math.abs(amount)) * 100);
  const cedis = Math.floor(pesewasTotal / 100);
  const pesewas = pesewasTotal % 100;
  const cediWords = `${integerToWords(cedis)} ${cedis === 1 ? "Cedi" : "Cedis"}`;
  const pesewaWords = pesewas
    ? `${integerToWords(pesewas)} ${pesewas === 1 ? "Pesewa" : "Pesewas"}`
    : "No Pesewas";

  return `${amount < 0 ? "Minus " : ""}${cediWords} and ${pesewaWords}`;
}
