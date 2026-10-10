import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  RotateCcw, 
  Target, 
  Award, 
  BookOpen, 
  HelpCircle,
  Leaf,
  Bug,
  Bird,
  Skull,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Waves,
  ChevronLeft
} from "lucide-react";

const ORGANISMS = [
  { id: "grass", name: "Grass", type: "producer", emoji: "🌱", color: "bg-emerald-100 border-emerald-300 text-emerald-700" },
  { id: "shrub", name: "Shrub", type: "producer", emoji: "🌿", color: "bg-emerald-200 border-emerald-400 text-emerald-800" },
  { id: "grasshopper", name: "Grasshopper", type: "herbivore", emoji: "🦗", color: "bg-green-100 border-green-300 text-green-700" },
  { id: "rabbit", name: "Rabbit", type: "herbivore", emoji: "🐇", color: "bg-slate-100 border-slate-300 text-slate-700" },
  { id: "frog", name: "Frog", type: "carnivore", emoji: "🐸", color: "bg-lime-100 border-lime-300 text-lime-700" },
  { id: "snake", name: "Snake", type: "carnivore", emoji: "🐍", color: "bg-yellow-100 border-yellow-300 text-yellow-700" },
  { id: "hawk", name: "Hawk", type: "apex", emoji: "🦅", color: "bg-orange-100 border-orange-300 text-orange-700" },
  { id: "lion", name: "Lion", type: "apex", emoji: "🦁", color: "bg-amber-100 border-amber-300 text-amber-700" },
];

const CHAINS = [
  { 
    id: 1, 
    slots: ["producer", "herbivore", "carnivore", "apex"],
    correct: ["grass", "grasshopper", "frog", "hawk"],
    title: "Savannah Grassland Chain"
  },
  { 
    id: 2, 
    slots: ["producer", "herbivore", "carnivore", "apex"],
    correct: ["shrub", "rabbit", "snake", "hawk"],
    title: "Forest Edge Chain"
  }
];

export default function FoodChainBuilder() {
  const [currentChainIndex, setCurrentChainIndex] = useState(0);
  const [selectedOrganism, setSelectedOrganism] = useState(null);
  const [placedOrganisms, setPlacedOrganisms] = useState([null, null, null, null]);
  const [feedback, setFeedback] = useState(null); // 'correct', 'incorrect'
  const [incorrectSlots, setIncorrectSlots] = useState([]);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [isGameWon, setIsGameWon] = useState(false);

  const currentChain = CHAINS[currentChainIndex];

  const handleOrganismClick = (organism) => {
    setSelectedOrganism(organism);
    setFeedback(null);
    setIncorrectSlots([]);
  };

  const handleSlotClick = (index) => {
    if (!selectedOrganism) return;
    
    const newPlaced = [...placedOrganisms];
    newPlaced[index] = selectedOrganism;
    setPlacedOrganisms(newPlaced);
    setSelectedOrganism(null);
    setFeedback(null);
    setIncorrectSlots([]);
  };

  const removeOrganism = (index) => {
    const newPlaced = [...placedOrganisms];
    newPlaced[index] = null;
    setPlacedOrganisms(newPlaced);
    setFeedback(null);
    setIncorrectSlots([]);
  };

  const checkAnswer = () => {
    setAttempts(prev => prev + 1);
    const newIncorrectSlots = [];
    let isCorrect = true;

    placedOrganisms.forEach((placed, index) => {
      if (!placed || placed.id !== currentChain.correct[index]) {
        isCorrect = false;
        newIncorrectSlots.push(index);
      }
    });

    if (isCorrect) {
      setFeedback("correct");
      setScore(prev => prev + 20);
      if (currentChainIndex < CHAINS.length - 1) {
        setTimeout(() => {
          setCurrentChainIndex(prev => prev + 1);
          setPlacedOrganisms([null, null, null, null]);
          setFeedback(null);
        }, 2000);
      } else {
        setIsGameWon(true);
      }
    } else {
      setFeedback("incorrect");
      setIncorrectSlots(newIncorrectSlots);
      // Reset incorrect slots after animation
      setTimeout(() => setIncorrectSlots([]), 1000);
    }
  };

  const reset = () => {
    setCurrentChainIndex(0);
    setPlacedOrganisms([null, null, null, null]);
    setFeedback(null);
    setIncorrectSlots([]);
    setScore(0);
    setAttempts(0);
    setIsGameWon(false);
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
            <Zap className="text-emerald-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Food Chain Builder</h1>
            <p className="text-slate-500 font-medium tracking-tight">Connect the energy flow from plants to predators</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm">
            Primary 4–6
          </span>
          <span className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full border border-orange-200 shadow-sm flex items-center gap-1">
            <Clock size={16} /> 15 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Organism Bank */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* 2. "How to Use" box */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <HelpCircle className="text-emerald-500" size={18} /> How to Build
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              1. Tap an organism from the bank below.<br/>
              2. Tap a slot in the chain where it belongs.<br/>
              3. Press "Check My Answer" to see if the energy flows correctly!
            </p>
          </section>

          {/* 3. Interactive Control Zone: Organism Bank */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Organism Bank</h3>
            <div className="grid grid-cols-2 gap-3">
              {ORGANISMS.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleOrganismClick(org)}
                  className={`
                    p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1
                    ${selectedOrganism?.id === org.id ? 'border-emerald-500 bg-emerald-50 scale-105 shadow-md ring-4 ring-emerald-100' : 'border-slate-50 bg-slate-50 hover:border-emerald-200'}
                  `}
                >
                  <span className="text-3xl">{org.emoji}</span>
                  <span className="text-xs font-bold text-slate-700">{org.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Score & Controls */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
             <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Your Score</span>
                <span className="text-2xl font-black text-emerald-600 tracking-tighter">{score} pts</span>
             </div>
             <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${(currentChainIndex / CHAINS.length) * 100}%` }}
                />
             </div>
             <div className="flex gap-2 mt-2">
                <button onClick={reset} className="flex-1 py-3 rounded-xl border-2 border-slate-100 text-slate-400 hover:bg-slate-50 transition-all font-bold text-xs flex items-center justify-center gap-2">
                  <RotateCcw size={14} /> Reset
                </button>
                <button 
                  onClick={checkAnswer}
                  disabled={placedOrganisms.includes(null) || feedback === 'correct'}
                  className={`flex-[2] py-3 rounded-xl font-bold text-sm shadow-lg transition-all ${placedOrganisms.includes(null) ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : feedback === 'correct' ? 'bg-emerald-500 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'}`}
                >
                  Check My Answer
                </button>
             </div>
          </div>
        </div>

        {/* Right Column: Life Visual Output Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-[3rem] shadow-xl border-8 border-slate-50 p-6 md:p-10 relative overflow-hidden min-h-[500px] flex flex-col items-center justify-center">
            
            <div className="w-full text-center mb-10">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] block mb-2">Build This Chain</span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{currentChain.title}</h2>
            </div>

            {/* Food Chain SVG / Boxes Layout */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full">
              {currentChain.slots.map((slotType, index) => (
                <div key={index} className="flex flex-col md:flex-row items-center gap-4">
                  {/* Slot */}
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{slotType}</span>
                    <button
                      onClick={() => handleSlotClick(index)}
                      className={`
                        w-24 h-24 md:w-32 md:h-32 rounded-3xl border-4 transition-all flex flex-col items-center justify-center relative group
                        ${placedOrganisms[index] ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-200 hover:border-emerald-300'}
                        ${incorrectSlots.includes(index) ? 'animate-shake border-red-500 ring-4 ring-red-100' : ''}
                        ${feedback === 'correct' ? 'border-emerald-500 shadow-emerald-50' : ''}
                      `}
                    >
                      {placedOrganisms[index] ? (
                        <>
                          <span className="text-4xl md:text-5xl">{placedOrganisms[index].emoji}</span>
                          <span className="text-[10px] font-bold text-slate-600 mt-2">{placedOrganisms[index].name}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeOrganism(index); }}
                            className="absolute -top-2 -right-2 bg-slate-100 text-slate-400 w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <div className="text-slate-200 flex flex-col items-center">
                          <Target size={32} />
                          <span className="text-[10px] font-bold mt-2">Place Here</span>
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Arrow between slots */}
                  {index < currentChain.slots.length - 1 && (
                    <div className="flex flex-col items-center justify-center">
                       <ArrowRight className={`text-slate-200 hidden md:block ${feedback === 'correct' ? 'text-emerald-500' : ''}`} size={32} />
                       <ArrowRight className={`text-slate-200 block md:hidden rotate-90 ${feedback === 'correct' ? 'text-emerald-500' : ''}`} size={32} />
                       <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">Energy Transfer</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Background SVG Decoration */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03] z-0">
               <svg width="100%" height="100%">
                  <pattern id="leaf-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M20 5c-3.31 0-6 2.69-6 6 0 2.21 1.25 4.12 3.08 5.09L20 20l2.92-3.91C24.75 15.12 26 13.21 26 11c0-3.31-2.69-6-6-6z" fill="#059669" />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#leaf-pattern)" />
               </svg>
            </div>

            {/* Feedback Message */}
            <div className="mt-12 h-16 w-full flex items-center justify-center">
              {feedback === 'correct' && (
                <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl border border-emerald-100 animate-bounce">
                  <CheckCircle2 size={24} />
                  <span className="font-bold">Excellent! Energy is flowing perfectly!</span>
                </div>
              )}
              {feedback === 'incorrect' && (
                <div className="flex items-center gap-3 bg-red-50 text-red-700 px-6 py-3 rounded-2xl border border-red-100 animate-shake">
                  <XCircle size={24} />
                  <span className="font-bold text-sm">Not quite. Hint: Check the trophic levels!</span>
                </div>
              )}
            </div>

            {isGameWon && (
              <div className="absolute inset-0 bg-emerald-600/95 flex flex-col items-center justify-center text-white p-10 z-20 animate-in fade-in duration-500">
                <Award size={100} className="mb-6 animate-pulse" />
                <h2 className="text-4xl font-black mb-2 tracking-tighter text-center">Ecology Master!</h2>
                <p className="text-emerald-100 text-lg text-center mb-8 font-medium">You successfully built all food chains!</p>
                <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                  <div className="bg-emerald-700/50 p-4 rounded-3xl border border-emerald-500 text-center">
                    <p className="text-xs uppercase font-black text-emerald-300 tracking-widest mb-1">Score</p>
                    <p className="text-3xl font-black">{score}</p>
                  </div>
                  <div className="bg-emerald-700/50 p-4 rounded-3xl border border-emerald-500 text-center">
                    <p className="text-xs uppercase font-black text-emerald-300 tracking-widest mb-1">Tries</p>
                    <p className="text-3xl font-black">{attempts}</p>
                  </div>
                </div>
                <button 
                  onClick={reset}
                  className="mt-10 bg-white text-emerald-600 px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-900/20 active:scale-95 transition-all"
                >
                  Play Experience Again
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-emerald-600" size={24} />
          Educational Value (Science)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-emerald-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm italic leading-snug">Understand <strong>trophic levels</strong>: from Producers to Apex Predators.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-blue-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm italic leading-snug">Learn about <strong>energy flow</strong> through different ecosystems.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-orange-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm italic leading-snug">Discover <strong>feeding relationships</strong> between Ghanaian organisms.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-purple-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm italic leading-snug">Identify <strong>producers</strong> as the source of all food energy.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
