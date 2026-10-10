"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Search, Info, Beaker, Zap, Shield, Microscope, ChevronRight, CheckCircle2, AlertCircle, Award, PlayCircle, Target, Play, ChevronLeft } from "lucide-react";

const ELEMENTS_DATA = [
  { atomicNumber: 1, symbol: "H", name: "Hydrogen", mass: 1.008, group: 1, period: 1, type: "non-metal", uses: "Rocket fuel, water formation, lifting balloons." },
  { atomicNumber: 2, symbol: "He", name: "Helium", mass: 4.003, group: 18, period: 1, type: "non-metal", uses: "Balloons, cooling magnets in MRI machines." },
  { atomicNumber: 3, symbol: "Li", name: "Lithium", mass: 6.941, group: 1, period: 2, type: "metal", uses: "Rechargeable batteries for phones and laptops." },
  { atomicNumber: 4, symbol: "Be", name: "Beryllium", mass: 9.012, group: 2, period: 2, type: "metal", uses: "Aerospace parts, X-ray windows." },
  { atomicNumber: 5, symbol: "B", name: "Boron", mass: 10.81, group: 13, period: 2, type: "metalloid", uses: "Borosilicate glass, pesticides." },
  { atomicNumber: 6, symbol: "C", name: "Carbon", mass: 12.01, group: 14, period: 2, type: "non-metal", uses: "Life forms (Organic chemistry), graphite, diamonds." },
  { atomicNumber: 7, symbol: "N", name: "Nitrogen", mass: 14.01, group: 15, period: 2, type: "non-metal", uses: "Fertilizers, food packaging (preservation)." },
  { atomicNumber: 8, symbol: "O", name: "Oxygen", mass: 16.00, group: 16, period: 2, type: "non-metal", uses: "Respiration, combustion, making steel." },
  { atomicNumber: 9, symbol: "F", name: "Fluorine", mass: 19.00, group: 17, period: 2, type: "non-metal", uses: "Toothpaste (preventing decay), Teflon." },
  { atomicNumber: 10, symbol: "Ne", name: "Neon", mass: 20.18, group: 18, period: 2, type: "non-metal", uses: "Luminous signs, high-voltage indicators." },
  { atomicNumber: 11, symbol: "Na", name: "Sodium", mass: 22.99, group: 1, period: 3, type: "metal", uses: "Table salt, street lamps." },
  { atomicNumber: 12, symbol: "Mg", name: "Magnesium", mass: 24.31, group: 2, period: 3, type: "metal", uses: "Fireworks, lightweight car parts." },
  { atomicNumber: 13, symbol: "Al", name: "Aluminium", mass: 26.98, group: 13, period: 3, type: "metal", uses: "Soda cans, foil, aircraft frames." },
  { atomicNumber: 14, symbol: "Si", name: "Silicon", mass: 28.09, group: 14, period: 3, type: "metalloid", uses: "Computer chips, solar cells, glass." },
  { atomicNumber: 15, symbol: "P", name: "Phosphorus", mass: 30.97, group: 15, period: 3, type: "non-metal", uses: "Matches, fertilizers, DNA structure." },
  { atomicNumber: 16, symbol: "S", name: "Sulphur", mass: 32.06, group: 16, period: 3, type: "non-metal", uses: "Gunpowder, rubber vulcanization." },
  { atomicNumber: 17, symbol: "Cl", name: "Chlorine", mass: 35.45, group: 17, period: 3, type: "non-metal", uses: "Swimming pool disinfectant, bleach." },
  { atomicNumber: 18, symbol: "Ar", name: "Argon", mass: 39.95, group: 18, period: 3, type: "non-metal", uses: "Inside light bulbs to protect filaments." },
  { atomicNumber: 19, symbol: "K", name: "Potassium", mass: 39.10, group: 1, period: 4, type: "metal", uses: "Fertilizers, banana nutrients, soap production." },
  { atomicNumber: 20, symbol: "Ca", name: "Calcium", mass: 40.08, group: 2, period: 4, type: "metal", uses: "Teeth, bones, making cement." },
];

export default function PeriodicTableElementFinder() {
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedElement, setSelectedElement] = useState(ELEMENTS_DATA[0]);
  const [filter, setFilter] = useState("all"); 
  const [quizElement, setQuizElement] = useState(null);
  const [feedback, setFeedback] = useState({ type: null, message: "" });
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const startNewQuiz = useCallback(() => {
    const randomIdx = Math.floor(Math.random() * ELEMENTS_DATA.length);
    setQuizElement(ELEMENTS_DATA[randomIdx]);
    setFeedback({ type: null, message: "Find this element on the table!" });
  }, []);

  useEffect(() => {
    if (hasStarted) {
      startNewQuiz();
    }
  }, [hasStarted, startNewQuiz]);

  const handleElementClick = (element) => {
    setSelectedElement(element);
    
    if (quizElement) {
      setAttempts(prev => prev + 1);
      if (element.atomicNumber === quizElement.atomicNumber) {
        setScore(prev => prev + 1);
        setFeedback({ type: "success", message: `✅ Correct! ${element.name} has atomic number ${element.atomicNumber}.` });
        setTimeout(startNewQuiz, 2000);
      } else {
        setFeedback({ 
          type: "error", 
          message: `❌ Try Again! That was ${element.name}. Hint: Look for atomic number ${quizElement.atomicNumber}.` 
        });
      }
    }
  };

  const filteredElements = useMemo(() => {
    if (filter === "all") return ELEMENTS_DATA;
    return ELEMENTS_DATA.filter(e => e.type === filter);
  }, [filter]);

  const getGridPosition = (el) => {
    const colStart = el.group > 2 ? el.group - 10 : el.group;
    const rowStart = el.period;
    return { gridColumnStart: colStart, gridRowStart: rowStart };
  };

  if (!hasStarted) {
    return (
      <div className="w-full max-w-4xl mx-auto rounded-[2rem] shadow-2xl bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-950 text-white font-sans border-4 border-indigo-400/30 flex flex-col items-center justify-center p-8 md:p-12 text-center min-h-[600px] relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <svg width="100%" height="100%">
            <circle cx="15%" cy="20%" r="60" fill="none" stroke="white" strokeWidth="4" />
            <path d="M 85% 20% L 95% 45% L 75% 45% Z" fill="none" stroke="white" strokeWidth="4" />
            <rect x="80%" y="70%" width="80" height="80" transform="rotate(25 80% 70%)" fill="none" stroke="white" strokeWidth="4" />
          </svg>
        </div>
        
        <div className="z-10 bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] border border-white/10 shadow-2xl max-w-2xl w-full">
          <div className="text-8xl md:text-9xl mb-6 drop-shadow-2xl">🧪</div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-indigo-300">
            Periodic Element Finder
          </h1>
          <p className="text-lg md:text-xl text-indigo-100 font-medium mb-8 max-w-lg mx-auto leading-relaxed">
             Explore the first 20 elements, discover their uses, and master the periodic table with interactive filters and quiz challenges!
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 mb-10 text-xs md:text-sm font-bold">
            <div className="bg-indigo-950/60 px-4 py-2 rounded-full flex items-center gap-2 border border-indigo-500 shadow-inner">
              <Award className="text-yellow-400" size={18} /> JHS 1–3
            </div>
            <div className="bg-indigo-950/60 px-4 py-2 rounded-full flex items-center gap-2 border border-indigo-500 shadow-inner">
              <PlayCircle className="text-emerald-400" size={18} /> 20 Min
            </div>
            <div className="bg-indigo-950/60 px-4 py-2 rounded-full flex items-center gap-2 border border-indigo-500 shadow-inner">
              <Target className="text-pink-400" size={18} /> Chemistry
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => setHasStarted(true)} 
            className="bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white px-12 py-6 rounded-full text-2xl font-black shadow-lg transition-all w-full md:w-auto mx-auto flex items-center justify-center gap-3 mt-4"
          >
            ▶️ PLAY NOW
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-purple-500/30">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-400 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      {/* Header Section */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl animate-bounce">🧪</span>
            <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent uppercase tracking-tight">
              Periodic Explorer
            </h1>
          </div>
          <p className="text-slate-400 text-sm md:text-base max-w-lg">
            Master the first 20 elements of the Ghana NaCCA Science curriculum.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-4 py-1.5 bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 rounded-full text-xs font-bold uppercase tracking-widest">
            JHS 1–3
          </span>
          <span className="px-4 py-1.5 bg-teal-900/50 text-teal-300 border border-teal-700/50 rounded-full text-xs font-bold flex items-center gap-2">
            <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
            20 MINS
          </span>
        </div>
      </header>

      {/* How to Use Box */}
      <section className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-6 mb-8 flex gap-4 items-start shadow-xl">
        <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
          <Info size={24} />
        </div>
        <div>
          <h3 className="font-bold text-indigo-200 mb-1 leading-none">How to Use</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            1. Select a filter to highlight specific categories. 
            2. Click an element to reveal its secrets and properties. 
            3. Use the quiz task to test your knowledge of atomic numbers!
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Interactive Control & Table Zone */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Controls */}
          <div className="flex flex-wrap gap-2 items-center bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
            <span className="text-xs font-bold text-slate-500 px-2 uppercase tracking-widest">Filter:</span>
            {[
              { id: "all", label: "All Elements", color: "hover:bg-slate-700" },
              { id: "metal", label: "Metals", color: "hover:bg-blue-600 bg-blue-900/40 text-blue-300" },
              { id: "non-metal", label: "Non-Metals", color: "hover:bg-emerald-600 bg-emerald-900/40 text-emerald-300" },
              { id: "metalloid", label: "Metalloids", color: "hover:bg-amber-600 bg-amber-900/40 text-amber-300" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 border border-transparent
                  ${filter === btn.id ? "bg-white text-slate-950 scale-105 shadow-lg ring-2 ring-white/20" : `bg-slate-800 text-slate-400 ${btn.color}`}
                `}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Table Area (Horizontal Scroll for Mobile) */}
          <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <div 
              className="grid gap-2 select-none min-w-[500px]"
              style={{ 
                gridTemplateColumns: "repeat(8, minmax(60px, 1fr))",
                gridAutoRows: "minmax(60px, 1fr)"
              }}
            >
              {ELEMENTS_DATA.map((el) => {
                const isFiltered = filter === "all" || el.type === filter;
                const isSelected = selectedElement?.atomicNumber === el.atomicNumber;
                const isQuizTarget = quizElement?.atomicNumber === el.atomicNumber;

                return (
                  <button
                    key={el.atomicNumber}
                    onClick={() => handleElementClick(el)}
                    style={getGridPosition(el)}
                    className={`relative p-2 rounded-lg border-2 flex flex-col items-center justify-between transition-all duration-300 h-[70px] md:h-[80px] group
                      ${isFiltered ? "opacity-100 scale-100" : "opacity-20 grayscale scale-95"}
                      ${isSelected ? "border-white bg-slate-700 ring-4 ring-white/10 z-10" : "border-transparent bg-slate-900/80 hover:bg-slate-800"}
                      ${isQuizTarget && attempts > 3 ? "animate-pulse ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]" : ""}
                    `}
                  >
                    <span className="absolute top-1 left-2 text-[10px] font-bold text-slate-500 group-hover:text-slate-300 transition-colors">
                      {el.atomicNumber}
                    </span>
                    <span className={`text-xl md:text-2xl font-black mt-1 ${isFiltered ? (el.type === 'metal' ? 'text-blue-400' : el.type === 'non-metal' ? 'text-emerald-400' : 'text-amber-400') : 'text-slate-600'}`}>
                      {el.symbol}
                    </span>
                    <span className="text-[9px] md:text-[10px] font-medium text-slate-400 truncate w-full text-center">
                      {el.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar / Detail Panel */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Detailed Info Card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl border border-slate-800 p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity translate-x-12 -translate-y-8">
              <Beaker size={140} className="text-purple-400" />
            </div>

            <div className="relative">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h4 className="text-xs font-bold text-teal-400 uppercase tracking-[0.2em] mb-1">Detailed Analysis</h4>
                  <h2 className="text-4xl font-extrabold text-white">{selectedElement.name}</h2>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-slate-300 leading-none">{selectedElement.symbol}</div>
                  <div className="text-xs font-bold text-slate-500 mt-1 uppercase">Symbol</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Atomic No.</p>
                  <p className="text-2xl font-black text-white">{selectedElement.atomicNumber}</p>
                </div>
                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Atomic Mass</p>
                  <p className="text-2xl font-black text-white">{selectedElement.mass}</p>
                </div>
                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Group</p>
                  <p className="text-xl font-bold text-white tracking-tight">{selectedElement.group}</p>
                </div>
                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Category</p>
                  <p className={`text-sm font-black uppercase ${selectedElement.type === 'metal' ? 'text-blue-400' : selectedElement.type === 'non-metal' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {selectedElement.type}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Common Uses</span>
                </div>
                <p className="text-indigo-100/80 text-sm leading-relaxed italic">
                  &quot;{selectedElement.uses}&quot;
                </p>
              </div>
            </div>
          </div>

          {/* Quiz / Score Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
             <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-xl text-white">Knowledge Check</h3>
                <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-xs font-bold font-mono text-teal-400 border border-slate-700">
                  SCORE: {score.toString().padStart(2, '0')}
                </div>
             </div>

             <div className="space-y-4">
                <div className="bg-slate-800/50 p-4 rounded-2xl text-center border-2 border-dashed border-slate-700">
                   <p className="text-xs text-slate-500 font-bold uppercase mb-2">Identify this Element:</p>
                   <p className="text-2xl font-black text-white mb-1 uppercase tracking-widest">{quizElement?.name}</p>
                   <p className="text-[10px] text-teal-500 font-bold">Atomic Number: ???</p>
                </div>

                {feedback.type && (
                  <div className={`p-4 rounded-2xl flex items-start gap-3 transition-all animate-in slide-in-from-bottom-2 duration-500
                    ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}
                  `}>
                    {feedback.type === 'success' ? <CheckCircle2 className="shrink-0" size={20} /> : <AlertCircle className="shrink-0" size={20} />}
                    <p className="text-xs font-semibold leading-snug">{feedback.message}</p>
                  </div>
                )}

                <button 
                  onClick={startNewQuiz}
                  className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all hover:bg-slate-200 active:scale-[0.98] shadow-[0_10px_20px_-10px_rgba(255,255,255,0.2)]"
                >
                  Skip Question
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Educational Value Footer */}
      <footer className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-8 bg-slate-900/30 rounded-[2.5rem] border border-slate-800/50">
        <div className="flex flex-col gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
            <Microscope size={24} />
          </div>
          <h5 className="font-bold text-slate-200">Atomic Theory</h5>
          <p className="text-xs text-slate-500 leading-relaxed">Understanding atomic number and mass as defining characteristics of matter.</p>
        </div>
        <div className="flex flex-col gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-all duration-300">
            <Shield size={24} />
          </div>
          <h5 className="font-bold text-slate-200">Classification</h5>
          <p className="text-xs text-slate-500 leading-relaxed">Differentiating between metals and non-metals based on shared properties.</p>
        </div>
        <div className="flex flex-col gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
            <Zap size={24} />
          </div>
          <h5 className="font-bold text-slate-200">Real-World Logic</h5>
          <p className="text-xs text-slate-500 leading-relaxed">Connecting chemical elements to everyday uses in technology and medicine.</p>
        </div>
        <div className="flex flex-col gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
            <Search size={24} />
          </div>
          <h5 className="font-bold text-slate-200">Visual Patterning</h5>
          <p className="text-xs text-slate-500 leading-relaxed">Using the grid layout to internalize the organization of the periodic table.</p>
        </div>
      </footer>
    </div>
  );
}
