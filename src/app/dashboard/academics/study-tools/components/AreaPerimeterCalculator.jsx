import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Square, 
  Maximize2, 
  RotateCcw, 
  Target, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  MousePointer2,
  Ruler
} from "lucide-react";

export default function AreaPerimeterCalculator() {
  const [width, setWidth] = useState(5);
  const [height, setHeight] = useState(4);
  const [gameMode, setGameMode] = useState(false);
  const [targetValue, setTargetValue] = useState(null);
  const [challengeType, setChallengeType] = useState('area'); // 'area' or 'perimeter'
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);

  const area = useMemo(() => width * height, [width, height]);
  const perimeter = useMemo(() => 2 * (width + height), [width, height]);

  const generateTarget = useCallback(() => {
    const type = Math.random() > 0.5 ? 'area' : 'perimeter';
    setChallengeType(type);
    
    let target;
    if (type === 'area') {
      // Area between 4 and 60
      target = Math.floor(Math.random() * (60 - 4 + 1)) + 4;
    } else {
      // Perimeter between 10 and 32
      target = (Math.floor(Math.random() * (16 - 5 + 1)) + 5) * 2;
    }
    
    setTargetValue(target);
    setFeedback(null);
  }, []);

  const handleModeToggle = () => {
    if (!gameMode) {
      generateTarget();
    }
    setGameMode(!gameMode);
    setFeedback(null);
  };

  const checkResult = () => {
    setAttempts(prev => prev + 1);
    const current = challengeType === 'area' ? area : perimeter;
    
    if (current === targetValue) {
      setFeedback("correct");
      setScore(prev => prev + 10);
    } else {
      setFeedback("incorrect");
    }
  };

  const resetGame = () => {
    setWidth(5);
    setHeight(4);
    setFeedback(null);
    if (gameMode) generateTarget();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-orange-50/20 min-h-screen font-sans text-slate-800">
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
          <div className="bg-orange-100 p-4 rounded-2xl">
            <Maximize2 className="text-orange-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Area & Perimeter Calculator</h1>
            <p className="text-slate-500 font-medium">Resize shapes to explore geometry</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm">
            Primary 4–6
          </span>
          <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm flex items-center gap-1">
            <Ruler size={16} /> 15 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* 2. "How to Use" box */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <BookOpen className="text-orange-500" size={18} /> How to Use
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Use the sliders to change the width and height of the rectangle. Watch how the <strong>Area</strong> and <strong>Perimeter</strong> change instantly!
            </p>
          </section>

          {/* 3. Interactive Control Zone */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-black text-slate-400 uppercase tracking-widest text-xs">Width (Horizontal)</span>
                  <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center font-bold">{width}</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="1" value={width} 
                  onChange={(e) => setWidth(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-black text-slate-400 uppercase tracking-widest text-xs">Height (Vertical)</span>
                  <span className="bg-orange-100 text-orange-700 w-8 h-8 rounded-full flex items-center justify-center font-bold">{height}</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="1" value={height} 
                  onChange={(e) => setHeight(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-600"
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex gap-4">
              <button 
                onClick={resetGame}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-slate-100 text-slate-500 hover:bg-slate-50 transition-all font-bold text-sm"
              >
                <RotateCcw size={16} /> Reset
              </button>
              <button 
                onClick={handleModeToggle}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${gameMode ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              >
                {gameMode ? <RotateCcw size={16} /> : <Target size={16} />}
                {gameMode ? 'Exit Challenge' : 'Play Challenge'}
              </button>
            </div>
          </div>

          {/* Formula Display */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Geometry Formulas</h3>
             <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                   <p className="text-xs font-bold text-blue-700 mb-1 leading-none">Area (Inside Space)</p>
                   <p className="text-lg font-black text-blue-900 leading-none">Width × Height</p>
                   <p className="text-[10px] text-blue-600 mt-2 italic">{width} × {height} = {area} sq units</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                   <p className="text-xs font-bold text-orange-700 mb-1 leading-none">Perimeter (Outside Edge)</p>
                   <p className="text-lg font-black text-orange-900 leading-none">2 × (W + H)</p>
                   <p className="text-[10px] text-orange-600 mt-2 italic">2 × ({width} + {height}) = {perimeter} units</p>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Visual area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* 4. Live Visual Output Area */}
          <div className="bg-white rounded-[3rem] shadow-xl border-8 border-slate-50 p-8 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
            
            {/* Grid Container */}
            <div className="relative border-4 border-slate-800 bg-slate-50 shadow-2xl rounded-sm">
               {/* 10x10 Background Grid */}
               <div className="grid grid-cols-10 grid-rows-10 w-[300px] h-[300px] md:w-[400px] md:h-[400px]">
                 {[...Array(100)].map((_, i) => (
                   <div key={i} className="border-[0.5px] border-slate-200" />
                 ))}
               </div>

               {/* The Dynamic Rectangle */}
               <div 
                 className="absolute top-0 left-0 bg-orange-400/40 border-4 border-orange-500 transition-all duration-300 ease-out shadow-lg flex items-center justify-center overflow-hidden"
                 style={{ 
                   width: `${(width / 10) * 100}%`, 
                   height: `${(height / 10) * 100}%`,
                 }}
               >
                 <div className="text-orange-900 font-black text-2xl drop-shadow-sm opacity-50">
                    {area}
                 </div>
                 
                 {/* Internal squares for area visual */}
                 <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${width}, 1fr)`, gridTemplateRows: `repeat(${height}, 1fr)` }}>
                    {[...Array(area)].map((_, i) => (
                      <div key={i} className="border border-orange-500/20" />
                    ))}
                 </div>
               </div>

               {/* Width Label */}
               <div 
                className="absolute -top-8 left-0 flex items-center justify-center transition-all duration-300"
                style={{ width: `${(width / 10) * 100}%` }}
               >
                  <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-md">
                    W = {width}
                  </div>
               </div>

               {/* Height Label */}
               <div 
                className="absolute -left-12 top-0 flex items-center justify-center transition-all duration-300 transform -rotate-90 origin-right"
                style={{ top: `${((height / 2) / 10) * 100}%` }}
               >
                  <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-md">
                    H = {height}
                  </div>
               </div>
            </div>

            <div className="mt-12 flex gap-8">
               <div className="text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Area</span>
                  <div className="text-4xl font-black text-blue-600">{area} <span className="text-xs uppercase">units²</span></div>
               </div>
               <div className="w-px h-12 bg-slate-200" />
               <div className="text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Perimeter</span>
                  <div className="text-4xl font-black text-orange-600">{perimeter} <span className="text-xs uppercase">units</span></div>
               </div>
            </div>
          </div>

          {/* 5. Score / Feedback Panel */}
          {gameMode && (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-orange-200 animate-in slide-in-from-bottom-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                   <h3 className="text-sm font-black text-orange-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                     <Target size={14} /> Resize to Match
                   </h3>
                   <p className="text-2xl font-black text-slate-900">
                     Make a rectangle with an {challengeType} of <span className="text-orange-600">{targetValue}</span>
                   </p>
                </div>

                <div className="flex items-center gap-4">
                   {feedback === 'correct' ? (
                      <div className="bg-emerald-100 text-emerald-700 px-6 py-3 rounded-2xl flex items-center gap-3 border border-emerald-200 animate-in zoom-in">
                         <Award size={32} />
                         <div>
                            <span className="font-bold block">Excellent! ✅</span>
                            <button onClick={generateTarget} className="text-xs underline hover:text-emerald-900">Next Challenge</button>
                         </div>
                      </div>
                   ) : (
                      <button 
                        onClick={checkResult}
                        className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 shadow-xl transition-all active:scale-95"
                      >
                         Check Result
                      </button>
                   )}
                </div>
              </div>

              {feedback === 'incorrect' && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl text-center text-sm font-bold animate-in fade-in">
                  ❌ Not yet! Current {challengeType} is {challengeType === 'area' ? area : perimeter}. Keep resizing!
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-orange-600" size={24} />
          Educational Benefits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-blue-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Visually demonstrates the <strong>relationship</strong> between dimensions and area.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-orange-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Reinforces <strong>perimeter computation</strong> as the sum of all sides.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-emerald-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Builds <strong>geometric intuition</strong> through hands-on manipulation.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-purple-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Applies mathematical <strong>formulas</strong> to concrete visual models.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
