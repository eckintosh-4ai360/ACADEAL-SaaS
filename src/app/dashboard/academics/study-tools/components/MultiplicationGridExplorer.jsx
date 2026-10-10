import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Grid3X3, 
  Play, 
  RotateCcw, 
  Target, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  HelpCircle,
  Timer,
  Zap,
  ChevronLeft
} from "lucide-react";

export default function MultiplicationGridExplorer() {
  const [selectedTable, setSelectedTable] = useState(null);
  const [animatingCell, setAnimatingCell] = useState(null);
  const [highlightedCells, setHighlightedCells] = useState([]);
  const [gameMode, setGameMode] = useState(false);
  const [targetProduct, setTargetProduct] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);

  const grid = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= 12; i++) {
      for (let j = 1; j <= 12; j++) {
        arr.push({ r: i, c: j, val: i * j });
      }
    }
    return arr;
  }, []);

  const startSkipCount = useCallback((num) => {
    if (gameMode) return;
    
    setSelectedTable(num);
    setHighlightedCells([]);
    setAnimatingCell(1);

    // Simple animation sequence for skip counting
    let current = 1;
    const interval = setInterval(() => {
      if (current <= 12) {
        setHighlightedCells(prev => [...prev, current]);
        setAnimatingCell(current);
        current++;
      } else {
        clearInterval(interval);
        setAnimatingCell(null);
      }
    }, 150);
  }, [gameMode]);

  const generateTarget = useCallback(() => {
    const r = Math.floor(Math.random() * 12) + 1;
    const c = Math.floor(Math.random() * 12) + 1;
    setTargetProduct({ r, c, val: r * c });
    setFeedback(null);
    setSelectedTable(null);
    setHighlightedCells([]);
  }, []);

  const handleCellClick = (cell) => {
    if (!gameMode || !targetProduct) return;

    setAttempts(prev => prev + 1);
    if (cell.val === targetProduct.val) {
      setFeedback("correct");
      setScore(prev => prev + 10);
      setHighlightedCells([cell.r]); // Highlight the row for visual payoff
    } else {
      setFeedback("incorrect");
    }
  };

  const toggleGameMode = () => {
    if (!gameMode) {
      generateTarget();
    }
    setGameMode(!gameMode);
    setFeedback(null);
    setHighlightedCells([]);
    setSelectedTable(null);
  };

  const resetGame = () => {
    setScore(0);
    setAttempts(0);
    generateTarget();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-emerald-50/20 min-h-screen font-sans text-slate-800">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      {/* 1. Header */}
      <header className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-100 p-4 rounded-2xl">
            <Grid3X3 className="text-emerald-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Multiplication Grid Explorer</h1>
            <p className="text-slate-500 font-medium">Master your tables with interactive visuals</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm">
            Primary 4–6
          </span>
          <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm flex items-center gap-1">
            <Timer size={16} /> 12 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* 2. "How to Use" box */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <HelpCircle className="text-emerald-500" size={18} /> How to Explore
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              {gameMode 
                ? "Find and click the cell that gives the target answer. Use the grid to help you calculate!"
                : "Click a number below to see its multiplication table light up in the grid. Watch the skip-counting pattern!"}
            </p>
          </section>

          {/* 3. Interactive Control Zone */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Select a Table</h3>
               <button 
                onClick={toggleGameMode}
                className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${gameMode ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
               >
                 {gameMode ? 'Exit Quiz' : 'Try Quiz Mode'}
               </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[...Array(12)].map((_, i) => (
                <button
                  key={i + 1}
                  disabled={gameMode}
                  onClick={() => startSkipCount(i + 1)}
                  className={`
                    h-12 rounded-xl font-bold transition-all border-2
                    ${selectedTable === (i + 1) 
                      ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg scale-105' 
                      : 'bg-white border-slate-100 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed'}
                  `}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {gameMode && (
              <div className="mt-6 p-4 bg-orange-50 rounded-2xl border border-orange-100 animate-in slide-in-from-top-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Target Product</span>
                  <Zap size={14} className="text-orange-400" />
                </div>
                <div className="text-center font-black text-4xl text-slate-900 py-2">
                  {targetProduct?.val}
                </div>
                <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-500">
                  <span>SCORE: {score}</span>
                  <span>ATTEMPTS: {attempts}</span>
                </div>
              </div>
            )}

            {feedback && (
              <div className={`mt-4 p-4 rounded-xl font-bold flex items-center gap-2 animate-in zoom-in duration-300 ${feedback === 'correct' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {feedback === 'correct' ? (
                  <>
                    <CheckCircle2 size={18} /> ✅ Correct! Find next?
                    <button onClick={generateTarget} className="ml-auto text-xs underline">Next</button>
                  </>
                ) : (
                  <>
                    <Zap size={18} /> ❌ Try again! Hint: {targetProduct?.r} × {targetProduct?.c}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mt-auto">
             <div className="flex items-center gap-4">
                <div className="bg-slate-50 p-3 rounded-2xl">
                   <Target className="text-slate-400" size={24} />
                </div>
                <div>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Mastery Tip</p>
                   <p className="text-sm text-slate-600 font-medium">Notice how 6 × 8 is the same as 8 × 6. This is the <strong>Commutative Property</strong>!</p>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Visual area (Grid) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* 4. Live Visual Output Area */}
          <div className="bg-white rounded-[3rem] shadow-xl border-8 border-slate-50 p-6 overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-[3rem_repeat(12,1fr)] gap-1">
                {/* Header Row */}
                <div className="h-10 invisible" />
                {[...Array(12)].map((_, i) => (
                  <div key={i} className={`h-10 flex items-center justify-center font-black text-sm rounded-lg ${selectedTable === i + 1 ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>
                    {i + 1}
                  </div>
                ))}

                {/* Grid Rows */}
                {[...Array(12)].map((_, r) => (
                  <div key={r} className="contents">
                    {/* Header Column */}
                    <div className={`w-10 h-10 flex items-center justify-center font-black text-sm rounded-lg ${selectedTable === r + 1 ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>
                      {r + 1}
                    </div>
                    {/* Data Cells */}
                    {[...Array(12)].map((_, c) => {
                      const row = r + 1;
                      const col = c + 1;
                      const val = row * col;
                      const isRowHighlight = selectedTable === row;
                      const isColHighlight = selectedTable === col;
                      const isActive = isRowHighlight || isColHighlight;
                      const isAnimating = (selectedTable === row && animatingCell === col) || (selectedTable === col && animatingCell === row);
                      
                      return (
                        <button
                          key={`${r}-${c}`}
                          onClick={() => handleCellClick({ r: row, c: col, val })}
                          className={`
                            h-10 md:h-12 flex items-center justify-center text-xs md:text-sm font-bold rounded-lg transition-all 
                            relative overflow-hidden
                            ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}
                            ${isAnimating ? 'ring-4 ring-emerald-400 scale-110 z-10 shadow-lg' : ''}
                            ${highlightedCells.includes(col) && isRowHighlight ? 'bg-emerald-400 text-white' : ''}
                            ${highlightedCells.includes(row) && isColHighlight ? 'bg-emerald-400 text-white' : ''}
                          `}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-8 flex justify-center gap-6">
               <div className="flex items-center gap-2">
                 <div className="w-4 h-4 rounded bg-emerald-400" />
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Highlighted Set</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-4 h-4 rounded bg-emerald-100" />
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Related Family</span>
               </div>
            </div>
          </div>
        </div>
      </main>

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-emerald-600" size={24} />
          Educational Benefits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-emerald-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Visualizes <strong>patterns</strong> in multiplication tables up to 12×12.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-blue-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Reinforces <strong>skip counting</strong> through animated sequences.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-orange-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Builds <strong>computational fluency</strong> via interactive retrieval practice.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-purple-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Develops an understanding of <strong>relational properties</strong> (e.g., commutativity).</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
