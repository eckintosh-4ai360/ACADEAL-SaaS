import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Palette, 
  Grid3X3, 
  Info, 
  RefreshCcw, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  MousePointer2,
  ChevronLeft
} from "lucide-react";

const KENTE_COLORS = [
  { id: "black", hex: "#000000", title: "Black", meaning: "Maturation, intensified spiritual energy." },
  { id: "gold", hex: "#FFD700", title: "Gold", meaning: "Royalty, wealth, high status, glory, spiritual purity." },
  { id: "green", hex: "#008000", title: "Green", meaning: "Vegetation, planting, harvesting, growth, spiritual renewal." },
  { id: "red", hex: "#FF0000", title: "Red", meaning: "Political and spiritual moods; bloodshed; sacrificial rites and death." },
  { id: "blue", hex: "#0000FF", title: "Blue", meaning: "Peacefulness, harmony and love." },
  { id: "maroon", hex: "#800000", title: "Maroon", meaning: "The color of mother earth; associated with healing." },
];

const PATTERN_TYPES = [
  { id: "plain", title: "Plain Stripe", description: "Standard horizontal or vertical bands." },
  { id: "zigzag", title: "Nkyinkyim", description: "Zigzag pattern representing life's journey." },
  { id: "checker", title: "Aberewa", description: "Checkerboard pattern representing wisdom." },
];

export default function KentePatternBuilder() {
  const [selectedColor, setSelectedColor] = useState(KENTE_COLORS[1]); // Default Gold
  const [grid, setGrid] = useState(Array(10).fill(null).map(() => Array(10).fill("#FFD700")));
  const [activePattern, setActivePattern] = useState("plain");
  const [showInfo, setShowInfo] = useState(true);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState(null);

  const handleCellClick = (row, col) => {
    const newGrid = [...grid];
    newGrid[row] = [...newGrid[row]];
    newGrid[row][col] = selectedColor.hex;
    setGrid(newGrid);
  };

  const applyPattern = (type) => {
    setActivePattern(type);
    const newGrid = Array(10).fill(null).map((_, r) => 
      Array(10).fill(null).map((_, c) => {
        if (type === "zigzag") {
          return (r + c) % 2 === 0 ? selectedColor.hex : "#000";
        }
        if (type === "checker") {
          return (Math.floor(r/2) + Math.floor(c/2)) % 2 === 0 ? selectedColor.hex : "#000";
        }
        return selectedColor.hex; // plain
      })
    );
    setGrid(newGrid);
  };

  const resetGrid = () => {
    setGrid(Array(10).fill(null).map(() => Array(10).fill("#FFD700")));
    setScore(0);
    setAttempts(0);
    setFeedback(null);
  };

  const checkPattern = () => {
    setAttempts(prev => prev + 1);
    // Educational check: ensure more than 2 colors are used
    const uniqueColors = new Set(grid.flat()).size;
    if (uniqueColors >= 3) {
      setScore(prev => prev + 10);
      setFeedback("correct");
    } else {
      setFeedback("hint");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
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
          <div className="bg-amber-100 p-4 rounded-2xl">
            <Palette className="text-amber-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Kente Pattern Builder</h1>
            <p className="text-slate-500 font-medium">Design your own royal Ghanaian cloth</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm">
            Primary 1–3
          </span>
          <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm flex items-center gap-1">
            <Grid3X3 size={16} /> 12 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Tools & Information */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* 2. How to Use Box */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Info className="text-blue-500" size={18} /> How to Weave
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Pick a colour and click on the grid to weave your pattern. Each colour has a special meaning in our culture!
            </p>
          </section>

          {/* 3. Interactive Control Zone (Color Palette) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Select Thread Colour</h3>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {KENTE_COLORS.map(color => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color)}
                  className={`
                    group relative aspect-square rounded-2xl transition-all duration-300 border-4
                    ${selectedColor.id === color.id ? 'border-amber-400 scale-105 shadow-md' : 'border-transparent hover:border-slate-200'}
                  `}
                  style={{ backgroundColor: color.hex }}
                  title={color.title}
                >
                  {selectedColor.id === color.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <CheckCircle2 className={color.id === 'black' || color.id === 'maroon' || color.id === 'blue' || color.id === 'red' ? "text-white" : "text-black"} size={20} />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[80px]">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedColor.hex }} />
                {selectedColor.title}
              </h4>
              <p className="text-xs text-slate-600 italic leading-relaxed">
                "{selectedColor.meaning}"
              </p>
            </div>
          </div>

          {/* Pattern Types */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Patterns</h3>
            <div className="space-y-3">
              {PATTERN_TYPES.map(pattern => (
                <button
                  key={pattern.id}
                  onClick={() => applyPattern(pattern.id)}
                  className={`
                    w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all
                    ${activePattern === pattern.id ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-slate-100 hover:bg-slate-50 text-slate-600'}
                  `}
                >
                  <div className="text-left">
                    <span className="font-bold text-sm block">{pattern.title}</span>
                    <span className="text-[10px] opacity-70">{pattern.description}</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Visual Output Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* 4. Live Visual Output Area (The Kente Cloth) */}
          <div className="bg-white rounded-[3rem] shadow-xl border-8 border-slate-200 flex-grow relative overflow-hidden flex flex-col p-8 items-center justify-center">
            
            <div className="text-center mb-6">
               <span className="px-4 py-1 bg-slate-100 border border-slate-200 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 Royal Loom View
               </span>
            </div>

            <div className="relative p-4 bg-slate-800 rounded-lg shadow-2xl">
               <div className="grid grid-cols-10 gap-0.5 border-4 border-slate-700 bg-slate-700 overflow-hidden shadow-inner cursor-crosshair">
                 {grid.map((row, rIndex) => (
                   row.map((cell, cIndex) => (
                     <div
                       key={`${rIndex}-${cIndex}`}
                       onClick={() => handleCellClick(rIndex, cIndex)}
                       className="w-8 h-8 md:w-10 md:h-10 transition-all duration-200 hover:opacity-80 relative group"
                       style={{ backgroundColor: cell }}
                     >
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white" />
                     </div>
                   ))
                 ))}
               </div>
               
               {/* Loom Details */}
               <div className="absolute -left-4 top-0 bottom-0 w-1.5 bg-slate-600 rounded-full shadow-lg" />
               <div className="absolute -right-4 top-0 bottom-0 w-1.5 bg-slate-600 rounded-full shadow-lg" />
            </div>

            <div className="mt-8 flex gap-4">
               <button 
                onClick={resetGrid}
                className="flex items-center gap-2 px-6 py-2 rounded-full border-2 border-slate-100 text-slate-400 hover:bg-slate-50 hover:border-slate-200 transition-all font-bold text-sm"
               >
                 <RefreshCcw size={16} /> Reset Cloth
               </button>
               <button 
                onClick={checkPattern}
                className="flex items-center gap-2 px-8 py-3 rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-lg transition-all font-bold group"
               >
                 <Sparkles size={18} className="group-hover:rotate-12 transition-transform" /> Check Pattern
               </button>
            </div>
          </div>

          {/* 5. Score / Feedback Panel */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Complexity</span>
                  <span className="text-2xl font-black text-slate-900">{score} pts</span>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Strokes</span>
                  <span className="text-2xl font-black text-slate-900">{attempts}</span>
                </div>
              </div>

              {feedback === "correct" && (
                <div className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl flex items-center gap-3 border border-emerald-100 animate-in zoom-in duration-300">
                  <CheckCircle2 size={24} />
                  <div>
                    <span className="font-bold block text-sm leading-none">Beautiful! ✅</span>
                    <span className="text-[10px] opacity-80">You've used multiple colours with deep meanings.</span>
                  </div>
                </div>
              )}

              {feedback === "hint" && (
                <div className="bg-amber-50 text-amber-700 px-6 py-3 rounded-2xl flex items-center gap-3 border border-amber-100 animate-in zoom-in duration-300">
                  <Info size={24} />
                  <div>
                    <span className="font-bold block text-sm leading-none">Keep Weaving 💡</span>
                    <span className="text-[10px] opacity-80">Try adding at least 3 different colours for a royal look.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-amber-600" size={24} />
          Educational Benefits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-amber-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Explores the <strong>cultural symbolism</strong> of different colours in Kente.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-blue-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Develops <strong>pattern recognition</strong> and spatial awareness.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-emerald-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Introduces traditional <strong>Adinkra-inspired design</strong> concepts.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-red-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Encourages <strong>artistic expression</strong> rooted in West African heritage.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
