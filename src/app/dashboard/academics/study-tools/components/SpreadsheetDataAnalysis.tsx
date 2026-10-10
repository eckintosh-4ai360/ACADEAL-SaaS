"use client";

import { useState } from "react";

const INITIAL_DATA = [
  { id: 1, name: "Kofi", math: 85, science: 90, english: 78 },
  { id: 2, name: "Ama", math: 92, science: 88, english: 95 },
  { id: 3, name: "Kwame", math: 76, science: 85, english: 80 },
  { id: 4, name: "Abena", math: 88, science: 92, english: 89 },
];

export default function SpreadsheetDataAnalysis() {
  const [data] = useState(INITIAL_DATA);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string } | null>(null);
  const [formulaResult, setFormulaResult] = useState<string | number | null>(null);
  const [formulaName, setFormulaName] = useState<string>("");

  const handleCalculateSum = (subject: "math" | "science" | "english") => {
    const sum = data.reduce((acc, row) => acc + row[subject], 0);
    setFormulaName(`SUM(${subject.toUpperCase()})`);
    setFormulaResult(sum);
  };

  const handleCalculateAvg = (subject: "math" | "science" | "english") => {
    const sum = data.reduce((acc, row) => acc + row[subject], 0);
    const avg = sum / data.length;
    setFormulaName(`AVERAGE(${subject.toUpperCase()})`);
    setFormulaResult(avg.toFixed(1));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-foreground flex items-center justify-center gap-2">
          <span className="text-4xl">📊</span> Spreadsheet Data Analysis
        </h1>
        <p className="text-muted-foreground">
          Practice basic spreadsheet functions (SUM, AVERAGE). Analyze simple datasets.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="bg-muted/30 p-3 border-b border-border flex flex-wrap gap-2">
          <button 
            onClick={() => handleCalculateSum("math")}
            className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded text-sm font-semibold transition-colors"
          >
            SUM(Math)
          </button>
          <button 
            onClick={() => handleCalculateAvg("math")}
            className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded text-sm font-semibold transition-colors"
          >
            AVG(Math)
          </button>
          <div className="w-px h-8 bg-border mx-2 hidden sm:block"></div>
          <button 
            onClick={() => handleCalculateSum("science")}
            className="px-3 py-1.5 bg-secondary/10 text-secondary hover:bg-secondary/20 rounded text-sm font-semibold transition-colors"
          >
            SUM(Science)
          </button>
          <button 
            onClick={() => handleCalculateAvg("science")}
            className="px-3 py-1.5 bg-secondary/10 text-secondary hover:bg-secondary/20 rounded text-sm font-semibold transition-colors"
          >
            AVG(Science)
          </button>
        </div>

        {/* Formula Bar */}
        <div className="flex items-center gap-2 p-3 border-b border-border bg-background">
          <div className="text-xs font-bold text-muted-foreground w-8 text-center bg-muted py-1 rounded">fx</div>
          <div className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-sm font-mono flex items-center">
            {formulaName ? (
              <span className="text-foreground">
                <span className="text-primary">=</span> {formulaName} 
                <span className="mx-2 text-muted-foreground">→</span> 
                <span className="font-bold">{formulaResult}</span>
              </span>
            ) : (
              <span className="text-muted-foreground italic">Click a function above to calculate...</span>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold text-xs uppercase border-b border-border">
              <tr>
                <th className="px-4 py-3 w-16 border-r border-border text-center"></th>
                <th className="px-4 py-3 border-r border-border">A (Name)</th>
                <th className="px-4 py-3 border-r border-border">B (Math)</th>
                <th className="px-4 py-3 border-r border-border">C (Science)</th>
                <th className="px-4 py-3">D (English)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((row, idx) => (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 border-r border-border text-center text-xs font-bold text-muted-foreground bg-muted/30">
                    {idx + 1}
                  </td>
                  <td 
                    onClick={() => setSelectedCell({ row: idx, col: 'A' })}
                    className={`px-4 py-3 border-r border-border cursor-pointer ${selectedCell?.row === idx && selectedCell?.col === 'A' ? 'ring-2 ring-inset ring-primary bg-primary/5' : ''}`}
                  >
                    {row.name}
                  </td>
                  <td 
                    onClick={() => setSelectedCell({ row: idx, col: 'B' })}
                    className={`px-4 py-3 border-r border-border cursor-pointer font-mono ${selectedCell?.row === idx && selectedCell?.col === 'B' ? 'ring-2 ring-inset ring-primary bg-primary/5' : ''}`}
                  >
                    {row.math}
                  </td>
                  <td 
                    onClick={() => setSelectedCell({ row: idx, col: 'C' })}
                    className={`px-4 py-3 border-r border-border cursor-pointer font-mono ${selectedCell?.row === idx && selectedCell?.col === 'C' ? 'ring-2 ring-inset ring-primary bg-primary/5' : ''}`}
                  >
                    {row.science}
                  </td>
                  <td 
                    onClick={() => setSelectedCell({ row: idx, col: 'D' })}
                    className={`px-4 py-3 cursor-pointer font-mono ${selectedCell?.row === idx && selectedCell?.col === 'D' ? 'ring-2 ring-inset ring-primary bg-primary/5' : ''}`}
                  >
                    {row.english}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
