import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Plus, 
  Minus, 
  Target, 
  RefreshCcw, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  Search,
  Hash,
  ChevronLeft
} from "lucide-react";

export default function DecimalPlaceValueExplorer() {
  const [ones, setOnes] = useState(0);
  const [tenths, setTenths] = useState(0);
  const [hundredths, setHundredths] = useState(0);
  const [targetNumber, setTargetNumber] = useState(0);
  const [gameMode, setGameMode] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const currentValue = useMemo(() => {
    return (ones + tenths * 0.1 + hundredths * 0.01).toFixed(2);
  }, [ones, tenths, hundredths]);

  const generateTarget = useCallback(() => {
    const random = (Math.random() * 9.99).toFixed(2);
    setTargetNumber(parseFloat(random));
    setFeedback(null);
    setAttempts(0);
  }, []);

  const handleModeToggle = () => {
    if (!gameMode) {
      generateTarget();
    }
    setGameMode(!gameMode);
    setFeedback(null);
  };

  const checkSolution = () => {
    setAttempts(prev => prev + 1);
    if (parseFloat(currentValue) === targetNumber) {
      setFeedback("correct");
    } else {
      setFeedback("hint");
    }
  };

  const resetValues = () => {
    setOnes(0);
    setTenths(0);
    setHundredths(0);
    setFeedback(null);
    if (gameMode) generateTarget();
  };

  // Helper for the visual representation
  const renderUnitBlocks = (count, color, label) => (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap gap-1 justify-center max-w-[150px] min-h-[40px]">
        {[...Array(count)].map((_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-sm shadow-sm transition-all duration-300 animate-in zoom-in-50 ${color}`}
          />
        ))}
        {count === 0 && <div className="w-4 h-4 rounded-sm border-2 border-dashed border-slate-200" />}
      </div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-blue-50/20 min-h-screen font-sans text-slate-800">
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
          <div className="bg-blue-100 p-4 rounded-2xl">
            <Hash className="text-blue-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Decimal Place Value Explorer</h1>
            <p className="text-slate-500 font-medium">Explore Ones, Tenths, and Hundredths</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full border border-purple-200 shadow-sm">
            Primary 4–6
          </span>
          <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm flex items-center gap-1">
            <Hash size={16} /> 12 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Sliders & Controls */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* 2. "How to Use" box */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Search className="text-blue-500" size={18} /> How to Use
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Use the sliders to change each digit. Watch the grid and number line update instantly to see how small decimals really are!
            </p>
          </section>

          {/* 3. Interactive Control Zone */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="space-y-8">
              {/* Ones */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-black text-slate-400 uppercase tracking-widest text-xs">Ones (Units)</span>
                  <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center font-bold">{ones}</span>
                </div>
                <input 
                  type="range" min="0" max="9" step="1" value={ones} 
                  onChange={(e) => setOnes(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Tenths */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-black text-slate-400 uppercase tracking-widest text-xs">Tenths (0.1)</span>
                  <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center font-bold">{tenths}</span>
                </div>
                <input 
                  type="range" min="0" max="9" step="1" value={tenths} 
                  onChange={(e) => setTenths(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              {/* Hundredths */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-black text-slate-400 uppercase tracking-widest text-xs">Hundredths (0.01)</span>
                  <span className="bg-purple-100 text-purple-700 w-8 h-8 rounded-full flex items-center justify-center font-bold">{hundredths}</span>
                </div>
                <input 
                  type="range" min="0" max="9" step="1" value={hundredths} 
                  onChange={(e) => setHundredths(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex gap-4">
              <button 
                onClick={resetValues}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-slate-100 text-slate-500 hover:bg-slate-50 transition-all font-bold text-sm"
              >
                <RefreshCcw size={16} /> Reset
              </button>
              <button 
                onClick={handleModeToggle}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${gameMode ? 'bg-orange-100 text-orange-700 border-2 border-orange-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              >
                {gameMode ? <Plus size={16} /> : <Target size={16} />}
                {gameMode ? 'Exit Challenge' : 'Play Challenge'}
              </button>
            </div>
          </div>

          {/* 5. Score / Feedback Panel */}
          {gameMode && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 animate-in slide-in-from-left-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Target size={14} className="text-orange-500" /> Challenge Mode
                </h3>
                <span className="text-xs font-bold text-slate-400">Attempts: {attempts}</span>
              </div>
              
              <div className="bg-orange-50 rounded-2xl p-6 text-center border border-orange-100 mb-6">
                <p className="text-sm text-slate-500 font-medium mb-1">Target Number</p>
                <h4 className="text-4xl font-black text-slate-900 tracking-tight">{targetNumber.toFixed(2)}</h4>
              </div>

              {feedback === "correct" ? (
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center gap-3 border border-emerald-100">
                  <CheckCircle2 size={24} />
                  <div>
                    <span className="font-bold block">Perfect! ✅</span>
                    <button onClick={generateTarget} className="text-xs underline hover:text-emerald-800 transition-colors">Next Target</button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={checkSolution}
                  className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black text-lg hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={20} /> Check Answer
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Visual area */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* 4. Live Visual Output Area */}
          <div className="bg-white rounded-[3rem] shadow-xl border-8 border-slate-50 p-8 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
            
            {/* Value Display */}
            <div className="mb-12 flex items-baseline gap-2">
              <div className="flex flex-col items-center">
                <span className="text-6xl font-black text-blue-600">{ones}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">Ones</span>
              </div>
              <span className="text-6xl font-black text-slate-300">.</span>
              <div className="flex flex-col items-center">
                <span className="text-6xl font-black text-emerald-600">{tenths}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">Tenths</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-6xl font-black text-purple-600">{hundredths}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">Hundredths</span>
              </div>
            </div>

            {/* Blocks Visualization */}
            <div className="grid grid-cols-3 gap-8 w-full max-w-md bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
              {renderUnitBlocks(ones, "bg-blue-500", "Units")}
              {renderUnitBlocks(tenths, "bg-emerald-500", "0.1s")}
              {renderUnitBlocks(hundredths, "bg-purple-500", "0.01s")}
            </div>

            {/* Number Line Visualization */}
            <div className="mt-16 w-full px-4">
              <div className="relative h-20 w-full">
                {/* Main Axis */}
                <div className="absolute top-1/2 w-full h-1 bg-slate-200 rounded-full" />
                
                {/* Ticks */}
                {[...Array(11)].map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute top-1/2 flex flex-col items-center" 
                    style={{ left: `${i * 10}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <div className="h-4 w-0.5 bg-slate-300 mt-4" />
                    <span className="text-[10px] font-bold text-slate-400 mt-2">{i}</span>
                  </div>
                ))}

                {/* The Pointer */}
                <div 
                  className="absolute top-1/2 flex flex-col items-center transition-all duration-500 ease-out z-10"
                  style={{ left: `${(ones + tenths * 0.1 + hundredths * 0.01) * 10}%`, transform: 'translate(-50%, -100%)' }}
                >
                  <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg mb-2 animate-bounce">
                    {currentValue}
                  </div>
                  <div className="w-0.5 h-6 bg-blue-600" />
                </div>
              </div>
              <div className="text-center mt-4 italic text-[10px] text-slate-400 font-medium">
                Showing value on 0-10 Number Line
              </div>
            </div>

            {/* Decorative background grid */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none -z-0">
              <svg width="100%" height="100%">
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                </pattern>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
          </div>
        </div>
      </main>

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-blue-600" size={24} />
          Educational Benefits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-blue-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Visualizes <strong>decimal place values</strong> beyond whole numbers.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-emerald-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Connects abstract numbers to <strong>concrete block models</strong>.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-purple-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Builds <strong>number sense</strong> on a continuous number line.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-orange-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Develops <strong>estimation skills</strong> through challenge tasks.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
