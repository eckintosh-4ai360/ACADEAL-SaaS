import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Sprout, 
  Trash2, 
  Shovel, 
  Waves, 
  Scissors, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Check, 
  X,
  ArrowRight,
  ChevronLeft
} from "lucide-react";

export default function CropProductionCycle() {
  // --- State Configuration ---
  const [activeStage, setActiveStage] = useState(0);
  const [selectedTool, setSelectedTool] = useState(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [progress, setProgress] = useState([false, false, false, false]);

  const STAGES = [
    {
      id: "preparation",
      title: "Land Preparation",
      description: "Clearing the land and loosening the soil for planting.",
      correctTool: "Cutlass/Hoe",
      hint: "Think about what you need to clear tall grass and turn the soil.",
      visualColor: "#8B4513" // Earth/Soil
    },
    {
      id: "planting",
      title: "Planting",
      description: "Placing seeds or seedlings into the prepared soil at the right depth.",
      correctTool: "Garden Fork",
      hint: "You need something to make small holes or loosen specific spots.",
      visualColor: "#228B22" // Forest Green
    },
    {
      id: "weeding",
      title: "Weeding",
      description: "Removing unwanted plants that compete with your crops for nutrients.",
      correctTool: "Hand Hoe",
      hint: "A smaller tool for precise removal of weeds near the crop.",
      visualColor: "#32CD32" // Lime Green
    },
    {
      id: "harvesting",
      title: "Harvesting",
      description: "Gathering the mature crops from the field.",
      correctTool: "Sickle/Knife",
      hint: "You need something sharp to cut the stems or gather the fruit.",
      visualColor: "#FFD700" // Gold/Mature Output
    }
  ];

  const TOOLS = [
    { id: "hoe", name: "Cutlass/Hoe", icon: Shovel, description: "Used for clearing and digging." },
    { id: "fork", name: "Garden Fork", icon: Sprout, description: "Used for breaking up soil." },
    { id: "handhoe", name: "Hand Hoe", icon: Trash2, description: "Small tool for weeding." },
    { id: "sickle", name: "Sickle/Knife", icon: Scissors, description: "Sharp tool for cutting crops." },
    { id: "watering", name: "Watering Can", icon: Waves, description: "For irrigation." }
  ];

  // --- Logic ---
  const handleCheckAnswer = () => {
    if (!selectedTool) {
      setFeedback({ type: "error", message: "Please select a tool first!" });
      return;
    }

    setAttempts(a => a + 1);
    const currentStage = STAGES[activeStage];
    
    if (selectedTool === currentStage.correctTool) {
      setFeedback({ type: "success", message: "✅ Excellent! That's the correct tool for this stage." });
      const newProgress = [...progress];
      newProgress[activeStage] = true;
      setProgress(newProgress);
      if (!progress[activeStage]) {
        setScore(s => s + 1);
      }
    } else {
      setFeedback({ type: "error", message: `❌ Not quite. ${currentStage.hint}` });
    }
  };

  const nextStage = () => {
    if (activeStage < STAGES.length - 1) {
      setActiveStage(activeStage + 1);
      setSelectedTool(null);
      setFeedback({ type: "", message: "" });
    }
  };

  const resetGame = () => {
    setActiveStage(0);
    setSelectedTool(null);
    setScore(0);
    setAttempts(0);
    setFeedback({ type: "", message: "" });
    setProgress([false, false, false, false]);
  };

  // --- Visuals ---
  const SoilVisual = () => {
    const stage = activeStage;
    return (
      <svg viewBox="0 0 400 200" className="w-full h-full rounded-xl bg-sky-50 transition-all duration-500">
        {/* Background Sky */}
        <rect x="0" y="0" width="400" height="120" fill="#E0F2FE" />
        
        {/* Ground */}
        <rect x="0" y="120" width="400" height="80" fill={STAGES[stage].visualColor} opacity="0.8" />
        
        {/* Dynamic Elements based on Stage */}
        {stage === 0 && ( // Land Prep: Rocks and messy grass
          <g>
            <path d="M 50 120 L 60 100 L 70 120" fill="#4ade80" />
            <path d="M 150 120 L 165 90 L 180 120" fill="#4ade80" />
            <circle cx="250" cy="130" r="10" fill="#94a3b8" />
            <circle cx="320" cy="140" r="15" fill="#64748b" />
          </g>
        )}
        
        {stage === 1 && ( // Planting: Neat soil with holes
          <g>
             <ellipse cx="100" cy="140" rx="15" ry="5" fill="#451a03" />
             <ellipse cx="200" cy="140" rx="15" ry="5" fill="#451a03" />
             <ellipse cx="300" cy="140" rx="15" ry="5" fill="#451a03" />
             {progress[1] && <circle cx="200" cy="135" r="4" fill="#fbbf24" />}
          </g>
        )}
        
        {stage === 2 && ( // Weeding: Growing crops with small weeds
          <g>
            <path d="M 100 120 Q 100 80 120 70" fill="none" stroke="#22c55e" strokeWidth="4" />
            <path d="M 200 120 Q 200 80 220 70" fill="none" stroke="#22c55e" strokeWidth="4" />
            <path d="M 300 120 Q 300 80 320 70" fill="none" stroke="#22c55e" strokeWidth="4" />
            {!progress[2] && (
               <path d="M 180 120 L 185 110 L 190 120" fill="#ef4444" />
            )}
          </g>
        )}
        
        {stage === 3 && ( // Harvesting: Large mature plants
          <g>
            <path d="M 100 120 Q 100 40 130 50" fill="none" stroke="#166534" strokeWidth="6" />
            <circle cx="130" cy="50" r="12" fill="#eab308" />
            <path d="M 200 120 Q 200 40 230 50" fill="none" stroke="#166534" strokeWidth="6" />
            <circle cx="230" cy="50" r="12" fill="#eab308" />
            <path d="M 300 120 Q 300 40 330 50" fill="none" stroke="#166534" strokeWidth="6" />
            <circle cx="330" cy="50" r="12" fill="#eab308" />
          </g>
        )}

        {/* Selected Tool floating animation */}
        {selectedTool && (
          <g className="animate-bounce">
            <rect x="320" y="40" width="40" height="40" rx="8" fill="white" stroke="#3b82f6" strokeWidth="2" />
            <text x="340" y="65" textAnchor="middle" fontSize="20">🛠️</text>
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 bg-slate-50 min-h-screen font-sans text-slate-900">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      {/* 1. Header */}
      <header className="bg-white rounded-3xl p-6 shadow-lg mb-6 border-t-8 border-teal-700 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10">
          <Sprout size={150} />
        </div>
        <div className="relative z-10 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <span className="text-5xl bg-teal-100 p-3 rounded-2xl shadow-inner">🌾</span>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Crop Production Cycle</h1>
              <p className="text-teal-700 font-medium italic">Master the art of farming from land to table.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
            <span className="bg-teal-700 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">JHS 1–3</span>
            <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
              ⏱️ 18 MINS
            </span>
          </div>
        </div>
      </header>

      {/* 2. How to Use */}
      <div className="bg-white rounded-2xl p-5 mb-6 shadow-md border border-slate-100 flex gap-4 items-start">
        <div className="bg-amber-100 p-2 rounded-lg text-amber-700">
          <Info size={24} />
        </div>
        <div>
          <h2 className="font-bold text-slate-800 mb-1">How to Play</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Navigate through the 4 stages of farming. For each stage, study the task description and 
            <strong className="text-teal-700 ml-1">select the correct farm tool</strong> from the toolkit to complete the work!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 3. Interactive Control Zone & Visuals */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Stage Progress Bar */}
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            {STAGES.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setActiveStage(idx)}
                className={`relative flex flex-col items-center gap-1 transition-all ${idx <= activeStage ? 'opacity-100' : 'opacity-40'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-all
                  ${idx === activeStage ? 'bg-teal-600 text-white scale-110' : 
                    progress[idx] ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                >
                  {progress[idx] ? <Check size={18} /> : idx + 1}
                </div>
                <span className="text-[10px] uppercase font-black text-slate-400 hidden sm:block tracking-tighter">
                  {s.title.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>

          {/* Visual Output Area */}
          <div className="bg-white p-4 rounded-3xl shadow-xl border-4 border-white aspect-video relative">
            <SoilVisual />
            <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-teal-100">
              <h3 className="text-lg font-black text-teal-800 flex items-center gap-2">
                Stage {activeStage + 1}: {STAGES[activeStage].title}
              </h3>
              <p className="text-slate-600 text-sm italic">{STAGES[activeStage].description}</p>
            </div>
          </div>

          {/* Tools Selection */}
          <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl">
            <h3 className="text-white font-bold text-xs uppercase tracking-[0.2em] mb-4 text-center">Farm Toolkit</h3>
            <div className="grid grid-cols-5 gap-3">
              {TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isSelected = selectedTool === tool.name;
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setSelectedTool(tool.name);
                      setFeedback({ type: "", message: "" });
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all h-24 
                      ${isSelected ? 'bg-teal-500 text-white scale-105 shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    <Icon size={28} />
                    <span className="text-[10px] font-bold text-center leading-tight">{tool.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5. Score / Feedback Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-teal-800 rounded-3xl p-6 shadow-xl text-white flex flex-col h-full">
            <div className="flex justify-between items-center mb-8 border-b border-teal-700 pb-4">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase opacity-60 px-1 italic">Score</p>
                <p className="text-4xl font-black">{score}</p>
              </div>
              <div className="text-center border-l border-teal-700 pl-4">
                <p className="text-[10px] font-bold uppercase opacity-60">Attempts</p>
                <p className="text-4xl font-black">{attempts}</p>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest opacity-60">Status</label>
              
              <div className={`p-4 rounded-2xl border min-h-[100px] flex items-center justify-center text-center font-bold text-sm transition-all
                ${feedback.type === 'success' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 animate-pulse' : 
                  feedback.type === 'error' ? 'bg-rose-500/20 border-rose-400 text-rose-100' : 'bg-teal-900/50 border-teal-700 text-teal-300 italic opacity-50'}`}
              >
                {feedback.message || "Select a tool and click verify logic..."}
              </div>

              {feedback.type !== 'success' && (
                <button
                  onClick={handleCheckAnswer}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-teal-950 h-14 rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 group"
                >
                  <CheckCircle2 size={24} className="group-hover:scale-110" /> Verify Logic
                </button>
              )}

              {feedback.type === 'success' && activeStage < STAGES.length - 1 && (
                <button
                  onClick={nextStage}
                  className="w-full bg-white text-teal-900 h-14 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-2 animate-bounce transition-all hover:bg-teal-50"
                >
                  Next Stage <ArrowRight size={24} />
                </button>
              )}

              {progress[STAGES.length - 1] && (
                <button
                  onClick={resetGame}
                  className="w-full bg-teal-600 text-white h-14 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-2 transition-all hover:bg-teal-500"
                >
                   Restart Cycle 🔄
                </button>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-teal-700">
               <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
                  <AlertCircle size={14} />
                  <span>JHS Career Tech Focus</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Educational Value Footer */}
      <footer className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Cycle Awareness", desc: "Understand chronological steps in food production.", color: "border-teal-400" },
          { label: "Tool Matching", desc: "Identify specific farm tools for professional tasks.", color: "border-emerald-400" },
          { label: "Critical Thinking", desc: "Analyze farm constraints like weeding and spacing.", color: "border-amber-400" },
          { label: "Real-Life Application", desc: "Learn principles of Ghanaian agriculture.", color: "border-sky-400" }
        ].map((item, i) => (
          <div key={i} className={`bg-white p-4 rounded-xl border-l-4 shadow-sm ${item.color}`}>
            <h4 className="font-black text-slate-800 text-xs uppercase mb-1">{item.label}</h4>
            <p className="text-slate-500 text-[10px] leading-tight font-medium">{item.desc}</p>
          </div>
        ))}
      </footer>

      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
}
