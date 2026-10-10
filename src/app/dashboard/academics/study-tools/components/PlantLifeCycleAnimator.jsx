import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Sprout, 
  Leaf, 
  Sun, 
  Droplets, 
  RefreshCcw, 
  HelpCircle,
  Award,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ChevronLeft
} from "lucide-react";
import Link from "next/link";

const STAGES = [
  { 
    id: "seed", 
    title: "Seed", 
    description: "A seed is planted in the soil. It needs water and warmth to wake up.",
    icon: "🌰",
    color: "amber",
    elements: { soilLevel: 250, seedY: 280, roots: 0, stem: 0, leaves: 0, flower: 0, fruit: 0 }
  },
  { 
    id: "seedling", 
    title: "Seedling", 
    description: "The seed cracks open! Tiny roots go down, and a small shoot reaches up.",
    icon: "🌱",
    color: "emerald",
    elements: { soilLevel: 250, seedY: 280, roots: 1, stem: 1, leaves: 2, flower: 0, fruit: 0 }
  },
  { 
    id: "plant", 
    title: "Growing Plant", 
    description: "Leaves catch sunlight to make food. The plant grows taller and stronger.",
    icon: "🌿",
    color: "green",
    elements: { soilLevel: 250, seedY: 280, roots: 2, stem: 2, leaves: 6, flower: 0, fruit: 0 }
  },
  { 
    id: "flower", 
    title: "Flower", 
    description: "Beautiful flowers bloom! They attract bees and butterflies.",
    icon: "🌸",
    color: "pink",
    elements: { soilLevel: 250, seedY: 280, roots: 3, stem: 3, leaves: 8, flower: 1, fruit: 0 }
  },
  { 
    id: "fruit", 
    title: "Fruit", 
    description: "The flower turns into a fruit. Inside the fruit are new seeds!",
    icon: "🍎",
    color: "red",
    elements: { soilLevel: 250, seedY: 280, roots: 3, stem: 3, leaves: 8, flower: 0, fruit: 1 }
  }
];

export default function PlantLifeCycleAnimator() {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizSequence, setQuizSequence] = useState([]);
  const [quizTargetIndex, setQuizTargetIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [sunlight, setSunlight] = useState(false);
  const [watered, setWatered] = useState(false);

  const currentStage = STAGES[currentStageIndex];
  
  // Environment effects for visual delight
  useEffect(() => {
    if (sunlight) {
      const timer = setTimeout(() => setSunlight(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [sunlight]);

  useEffect(() => {
    if (watered) {
      const timer = setTimeout(() => setWatered(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [watered]);

  const handleStageClick = (index) => {
    if (isQuizMode) {
      setAttempts(prev => prev + 1);
      // In quiz mode, we expect clicking the stages in correct order
      if (index === quizSequence[quizTargetIndex]) {
        setFeedback("correct");
        setCurrentStageIndex(index);
        
        setTimeout(() => {
          if (quizTargetIndex < STAGES.length - 1) {
            setQuizTargetIndex(prev => prev + 1);
            setFeedback(null);
          } else {
            setFeedback("completed");
          }
        }, 1000);

      } else {
        setFeedback("incorrect");
        setTimeout(() => setFeedback(null), 2000);
      }
    } else {
      // Free exploration mode
      setCurrentStageIndex(index);
      setFeedback(null);
      
      // Auto-trigger environment effects if moving forward
      if (index > currentStageIndex) {
        setWatered(true);
        setTimeout(() => setSunlight(true), 500);
      }
    }
  };

  const startQuiz = useCallback(() => {
    setIsQuizMode(true);
    // Sequence is 0, 1, 2, 3, 4
    setQuizSequence([0, 1, 2, 3, 4]);
    setQuizTargetIndex(0);
    setCurrentStageIndex(0); // Reset visual to seed
    setFeedback(null);
    setAttempts(0);
  }, []);

  const resetExplorer = () => {
    setIsQuizMode(false);
    setCurrentStageIndex(0);
    setFeedback(null);
    setAttempts(0);
  };

  // Helper function to get color classes safely based on stage
  const getColorClasses = (colorName) => {
    const map = {
      'amber': 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 ring-amber-400',
      'emerald': 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 ring-emerald-400',
      'green': 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200 ring-green-400',
      'pink': 'bg-pink-100 text-pink-800 border-pink-300 hover:bg-pink-200 ring-pink-400',
      'red': 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200 ring-red-400'
    };
    return map[colorName] || 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 ring-slate-400';
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 bg-green-50/30 min-h-screen font-sans text-slate-800">
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
          <div className="bg-green-100 p-4 rounded-2xl">
            <Sprout className="text-green-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Plant Life Cycle Animator</h1>
            <p className="text-slate-500 font-medium">Watch how a tiny seed grows into a plant</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm">
            Primary 1–3
          </span>
          <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm flex items-center gap-1">
            <Leaf size={16} /> 12 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Information */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* 2. How to Use Box */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Sprout className="text-green-500" size={18} /> How to Play
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Click the stages below to see the plant grow. Read about what happens at each step of its life!
            </p>
          </section>

          {/* 3. Interactive Control Zone (Stages Pipeline) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Growth Stages</h3>
              
              {!isQuizMode && (
                <div className="flex gap-2">
                  <button onClick={() => setSunlight(true)} className="p-2 bg-yellow-50 text-yellow-500 rounded-lg hover:bg-yellow-100 transition-colors" title="Give Sunlight">
                    <Sun size={20} />
                  </button>
                  <button onClick={() => setWatered(true)} className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition-colors" title="Give Water">
                    <Droplets size={20} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 relative">
              {/* Connecting Line */}
              <div className="absolute left-6 top-6 bottom-6 w-1 bg-slate-100 rounded-full -z-0" />
              
              {STAGES.map((stage, index) => {
                const isActive = currentStageIndex === index;
                const isPassed = currentStageIndex > index;
                const isTarget = isQuizMode && quizTargetIndex === index;
                
                return (
                  <button
                    key={stage.id}
                    onClick={() => handleStageClick(index)}
                    className={`
                      relative z-10 flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 text-left w-full
                      ${isActive ? 'bg-slate-50 shadow-sm ring-1 ring-slate-200 scale-105 ml-2' : 'hover:bg-slate-50/50'}
                      ${isQuizMode && !isPassed && !isActive && !isTarget ? 'opacity-50 cursor-pointer' : ''}
                      ${isQuizMode && isTarget ? 'animate-pulse ring-2 ring-orange-400 ring-offset-2' : ''}
                    `}
                  >
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-sm shrink-0 transition-colors
                      ${isActive || isPassed ? getColorClasses(stage.color) : 'bg-white text-slate-300 border-2 border-slate-100'}
                    `}>
                      {isPassed && isQuizMode ? <CheckCircle2 size={24} /> : stage.icon}
                    </div>
                    <div>
                      <h4 className={`font-bold transition-colors ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                        {index + 1}. {stage.title}
                      </h4>
                      {isActive && !isQuizMode && (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed pr-2 animate-in fade-in slide-in-from-left-2 duration-500">
                          {stage.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Score / Quiz Panel */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            {!isQuizMode ? (
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-2">Test Your Knowledge</h3>
                <p className="text-sm text-slate-500 mb-6">Can you put the growth stages in the correct order?</p>
                <button
                  onClick={startQuiz}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
                >
                  <Award size={20} />
                  Start Life Cycle Quiz
                </button>
              </div>
            ) : (
              <div className="animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between mb-4">
                   <h3 className="font-black text-orange-600 uppercase text-xs tracking-widest flex items-center gap-1">
                      <HelpCircle size={14} /> Knowledge Quiz
                   </h3>
                   <span className="text-xs font-bold text-slate-400">Mistakes: {attempts - quizTargetIndex}</span>
                </div>

                {feedback === "completed" ? (
                  <div className="bg-emerald-50 border-2 border-emerald-500 p-6 rounded-2xl text-center shadow-lg shadow-emerald-50">
                    <div className="inline-block bg-emerald-500 text-white p-3 rounded-full mb-3 animate-bounce">
                      <Award size={32} />
                    </div>
                    <h4 className="text-emerald-900 font-bold text-xl mb-1">Brilliant! ✅</h4>
                    <p className="text-emerald-700 text-sm mb-4">You know how plants grow!</p>
                    <button
                      onClick={resetExplorer}
                      className="bg-emerald-600 text-white w-full py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
                    >
                      Explore Again
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="bg-orange-50 border-2 border-orange-100 p-4 rounded-2xl mb-4">
                      <p className="text-sm font-medium text-slate-600 mb-1">What comes next?</p>
                      <p className="text-lg font-black text-orange-900">
                        Click Stage {quizTargetIndex + 1}
                      </p>
                    </div>

                    {feedback === "incorrect" && (
                      <div className="text-red-600 font-bold text-sm bg-red-50 p-2 rounded-lg animate-shake mb-4 flex items-center justify-center gap-2">
                        <AlertCircle size={16} /> Not quite right. Try again!
                      </div>
                    )}

                    <button
                      onClick={resetExplorer}
                      className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs"
                    >
                      Exit Quiz
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Visual Output Area */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* 4. Live Visual Output Area (The Canvas/SVG) */}
          <div className="bg-sky-50 rounded-[3rem] shadow-xl border-8 border-white flex-grow relative overflow-hidden flex flex-col items-center justify-end min-h-[500px]">
            
            {/* Environment Effects Layer */}
            <div className={`absolute inset-0 bg-yellow-300/20 mix-blend-overlay transition-opacity duration-1000 ${sunlight ? 'opacity-100' : 'opacity-0'}`} />
            
            {/* Sun & Clouds */}
            <div className={`absolute top-8 right-8 text-yellow-400 transition-all duration-1000 ${sunlight ? 'scale-125 rotate-45' : 'scale-100'}`}>
               <Sun size={80} fill="currentColor" opacity={sunlight ? 1 : 0.5} />
            </div>
            
            {/* Rain Drops */}
            {watered && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(10)].map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute w-1 h-4 bg-blue-400/60 rounded-full animate-rain"
                    style={{
                      left: `${10 + Math.random() * 80}%`,
                      animationDuration: `${0.5 + Math.random() * 0.5}s`,
                      animationDelay: `${Math.random() * 0.2}s`
                    }}
                  />
                ))}
              </div>
            )}

            {/* Title Label */}
            <div className="absolute top-8 left-8 bg-white/80 backdrop-blur p-4 rounded-2xl border border-white shadow-sm z-20 transition-all duration-300 transform">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Current Stage</span>
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                {currentStage.icon} {currentStage.title}
              </h2>
            </div>

            {/* Stage Info Tooltip near the plant */}
            {!isQuizMode && (
               <div className="absolute bottom-40 right-8 bg-white/90 backdrop-blur p-4 rounded-2xl border border-white shadow-lg z-20 max-w-[200px] animate-in fade-in slide-in-from-right-4 duration-700">
                 <p className="text-sm font-medium text-slate-700 leading-snug">
                   {currentStage.description}
                 </p>
               </div>
            )}

            {/* Procedural SVGs based on state */}
            <svg viewBox="0 0 400 500" className="w-full h-full drop-shadow-2xl z-10 transition-all duration-1000 ease-in-out">
              
              <defs>
                <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5A2B" />
                  <stop offset="100%" stopColor="#5C3A21" />
                </linearGradient>
                <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#bae6fd" stopOpacity="0" />
                  <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* Background gradient bridging to soil */}
              <rect x="0" y="0" width="400" height="400" fill="url(#sky)" />

              {/* The Soil */}
              <path d="M 0,350 Q 100,340 200,350 T 400,340 L 400,500 L 0,500 Z" fill="url(#soil)" />
              
              {/* Soil Details (pebbles) */}
              <circle cx="50" cy="400" r="4" fill="#4a2e1b" opacity="0.5" />
              <circle cx="150" cy="420" r="6" fill="#4a2e1b" opacity="0.5" />
              <circle cx="300" cy="380" r="3" fill="#4a2e1b" opacity="0.5" />
              <circle cx="350" cy="460" r="5" fill="#4a2e1b" opacity="0.5" />

              <g id="plant-group" transform="translate(200, 350)" style={{ transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                
                {/* 1. Roots (grow downwards) */}
                {currentStage.elements.roots > 0 && (
                  <path 
                    d="M 0,0 Q -20,30 -10,70 M 0,0 Q 20,40 15,80 M 0,0 Q 0,40 0,90 M -5,20 Q -40,40 -30,60 M 5,30 Q 30,50 35,70" 
                    stroke="#D2B48C" 
                    strokeWidth="3" 
                    fill="none" 
                    strokeLinecap="round"
                    style={{
                      strokeDasharray: 200,
                      strokeDashoffset: currentStage.elements.roots < 3 ? (currentStage.elements.roots === 1 ? 150 : 80) : 0,
                      transition: 'stroke-dashoffset 1.5s ease-in-out'
                    }}
                  />
                )}

                {/* 2. Stem (grows upwards) */}
                {currentStage.elements.stem > 0 && (
                  <path 
                    d={`M 0,0 L 0,-${currentStage.elements.stem === 1 ? 50 : currentStage.elements.stem === 2 ? 150 : 200}`} 
                    stroke="#4ade80" 
                    strokeWidth="8" 
                    fill="none" 
                    strokeLinecap="round"
                    style={{ transition: 'all 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                  />
                )}

                {/* 3. Leaves (appear in pairs) */}
                <g style={{ transition: 'all 1s ease-in-out', opacity: currentStage.elements.leaves > 0 ? 1 : 0 }}>
                  {currentStage.elements.leaves >= 2 && (
                    <>
                      <path d="M 0,-40 Q -30,-60 -50,-40 Q -30,-30 0,-40" fill="#22c55e" />
                      <path d="M 0,-45 Q 30,-65 50,-45 Q 30,-35 0,-45" fill="#22c55e" />
                    </>
                  )}
                  {currentStage.elements.leaves >= 4 && (
                    <>
                      <path d="M 0,-100 Q -40,-120 -60,-90 Q -30,-80 0,-100" fill="#22c55e" />
                      <path d="M 0,-110 Q 40,-130 60,-100 Q 30,-90 0,-110" fill="#22c55e" transform="rotate(-10 0 -110)" />
                    </>
                  )}
                  {currentStage.elements.leaves >= 6 && (
                    <>
                      <path d="M 0,-160 Q -30,-170 -45,-150 Q -20,-140 0,-160" fill="#16a34a" />
                      <path d="M 0,-150 Q 30,-160 45,-140 Q 20,-130 0,-150" fill="#16a34a" />
                    </>
                  )}
                </g>

                {/* The Seed (changes position and shape) */}
                <g transform={`translate(0, ${currentStageIndex === 0 ? 20 : 0})`} style={{ transition: 'all 1s ease-in-out' }}>
                   {currentStageIndex === 0 && (
                     <ellipse cx="0" cy="0" rx="15" ry="10" fill="#a16207" />
                   )}
                   {currentStageIndex === 1 && (
                     <>
                       <path d="M -12,0 C -12,-8 0,-12 0,0 Z" fill="#ca8a04" />
                       <path d="M 12,0 C 12,-8 0,-12 0,0 Z" fill="#a16207" />
                     </>
                   )}
                </g>

                {/* 4. Flower (blooms at the top) */}
                <g 
                  transform={`translate(0, -210) scale(${currentStage.elements.flower > 0 ? 1 : 0})`} 
                  style={{ transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                  className={currentStage.elements.flower > 0 ? 'animate-pulse' : ''}
                >
                  <circle cx="0" cy="-20" r="15" fill="#fbcfe8" />
                  <circle cx="20" cy="-5" r="15" fill="#fbcfe8" />
                  <circle cx="12" cy="15" r="15" fill="#fbcfe8" />
                  <circle cx="-12" cy="15" r="15" fill="#fbcfe8" />
                  <circle cx="-20" cy="-5" r="15" fill="#fbcfe8" />
                  <circle cx="0" cy="0" r="10" fill="#fcd34d" />
                </g>

                {/* 5. Fruit (replaces flower) */}
                <g 
                  transform={`translate(0, -200) scale(${currentStage.elements.fruit > 0 ? 1 : 0})`} 
                  style={{ transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s' }}
                >
                  <circle cx="0" cy="0" r="25" fill="#ef4444" />
                  <path d="M -5,-23 Q 0,-35 10,-30" stroke="#16a34a" strokeWidth="3" fill="none" />
                  <path d="M 0,-25 Q 15,-30 20,-15 Q 5,-10 0,-25" fill="#22c55e" />
                  {/* Highlight */}
                  <ellipse cx="-8" cy="-8" rx="5" ry="8" fill="#fca5a5" transform="rotate(-30 -8 -8)" />
                </g>

              </g>
            </svg>
            
            <style jsx>{`
              @keyframes rain {
                0% { transform: translateY(-100px); opacity: 0; }
                50% { opacity: 1; }
                100% { transform: translateY(600px); opacity: 0; }
              }
              .animate-rain {
                animation-name: rain;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
              }
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
              }
              .animate-shake {
                animation: shake 0.2s ease-in-out 0s 2;
              }
            `}</style>
          </div>
        </div>
      </main>

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-green-600" size={24} />
          Educational Benefits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-amber-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Understand the <strong>chronological order</strong> of plant life stages.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-emerald-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Learn basic <strong>plant anatomy</strong> vocabulary (roots, stem, leaves).</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-pink-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Recognize the role of <strong>flowers and fruits</strong> in reproduction.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-blue-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Appreciate <strong>environmental needs</strong> like sunlight and water.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
