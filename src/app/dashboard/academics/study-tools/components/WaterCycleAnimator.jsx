import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  CloudRain, 
  Sun, 
  Waves, 
  ArrowUp, 
  Cloud, 
  RotateCcw, 
  Target, 
  Award, 
  BookOpen, 
  HelpCircle,
  Clock,
  Wind,
  ChevronLeft
} from "lucide-react";

export default function WaterCycleAnimator() {
  const [activeStage, setActiveStage] = useState(null); // 'evaporation', 'condensation', 'precipitation', 'collection'
  const [quizMode, setQuizMode] = useState(false);
  const [quizTarget, setQuizTarget] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const stages = useMemo(() => [
    {
      id: "evaporation",
      title: "Evaporation",
      icon: <Sun className="text-orange-500" size={24} />,
      color: "bg-orange-100 border-orange-200 text-orange-700",
      description: "Heat from the sun turns water into invisible gas called water vapour.",
      animation: "steam"
    },
    {
      id: "condensation",
      title: "Condensation",
      icon: <Cloud className="text-slate-400" size={24} />,
      color: "bg-slate-100 border-slate-200 text-slate-700",
      description: "Water vapour cools down and turns back into tiny liquid water droplets, forming clouds.",
      animation: "cloud"
    },
    {
      id: "precipitation",
      title: "Precipitation",
      icon: <CloudRain className="text-blue-500" size={24} />,
      color: "bg-blue-100 border-blue-200 text-blue-700",
      description: "Water falls back to Earth as rain, snow, or hail when clouds get too heavy.",
      animation: "rain"
    },
    {
      id: "collection",
      title: "Collection",
      icon: <Waves className="text-cyan-600" size={24} />,
      color: "bg-cyan-100 border-cyan-200 text-cyan-700",
      description: "Water gathers in oceans, rivers, and lakes, ready to start the cycle again.",
      animation: "water"
    }
  ], []);

  const handleStageClick = (id) => {
    if (quizMode) {
      setFeedback(null);
      if (id === quizTarget.id) {
        setFeedback("correct");
        setScore(prev => prev + 10);
        setAttempts(prev => prev + 1);
        setActiveStage(id);
      } else {
        setFeedback("incorrect");
        setAttempts(prev => prev + 1);
      }
    } else {
      setActiveStage(id);
    }
  };

  const startQuiz = () => {
    const randomStage = stages[Math.floor(Math.random() * stages.length)];
    setQuizTarget(randomStage);
    setQuizMode(true);
    setFeedback(null);
    setActiveStage(null);
  };

  const nextChallenge = () => {
    const randomStage = stages[Math.floor(Math.random() * stages.length)];
    setQuizTarget(randomStage);
    setFeedback(null);
    setActiveStage(null);
  };

  const reset = () => {
    setActiveStage(null);
    setQuizMode(false);
    setQuizTarget(null);
    setFeedback(null);
    setScore(0);
    setAttempts(0);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-blue-50/20 min-h-screen font-sans text-slate-800">
      {/* ── BACK BUTTON ── */}
      <div className="mb-4">
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
      </div>

      {/* 1. Header */}
      <header className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-2xl">
            <CloudRain className="text-blue-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Water Cycle Animator</h1>
            <p className="text-slate-500 font-medium">Explore the journey of water through Earth and Sky</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm">
            Primary 4–6
          </span>
          <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm flex items-center gap-1">
            <Clock size={16} /> 12 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls and Info */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* 2. "How to Use" box */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <HelpCircle className="text-blue-500" size={18} /> How to Use
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Click on each label to see how water moves. In Quiz mode, try to find the correct stage based on its description!
            </p>
          </section>

          {/* 3. Interactive Control Zone */}
          <div className="flex flex-col gap-4">
            {stages.map((stage) => (
              <button
                key={stage.id}
                onClick={() => handleStageClick(stage.id)}
                className={`
                  p-5 rounded-2xl border-2 transition-all text-left flex items-center justify-between gap-4
                  ${activeStage === stage.id ? 'scale-[1.02] shadow-md z-10' : 'hover:border-blue-200 opacity-90'}
                  ${activeStage === stage.id ? stage.color : 'bg-white border-slate-100'}
                `}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${activeStage === stage.id ? 'bg-white/50' : 'bg-slate-50'}`}>
                    {stage.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">{stage.id}</h3>
                    <p className="font-black text-lg">{stage.title}</p>
                  </div>
                </div>
                {activeStage === stage.id && <ArrowUp className="rotate-90 text-blue-500" />}
              </button>
            ))}
          </div>

          <div className="mt-auto flex gap-4">
            <button 
              onClick={reset}
              className="flex-1 py-3 rounded-xl border-2 border-slate-100 text-slate-400 hover:bg-slate-50 transition-all font-bold text-sm flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> Reset
            </button>
            <button 
              onClick={quizMode ? () => setQuizMode(false) : startQuiz}
              className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${quizMode ? 'bg-orange-100 text-orange-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {quizMode ? <RotateCcw size={16} /> : <Target size={16} />}
              {quizMode ? 'Exit Quiz' : 'Take Quiz'}
            </button>
          </div>
        </div>

        {/* Right Column: Visual Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* 4. Live Visual Output Area */}
          <div className="bg-white rounded-[3rem] shadow-xl border-8 border-slate-50 p-6 relative overflow-hidden min-h-[500px] flex flex-col items-center justify-center">
            
            <svg viewBox="0 0 400 400" className="w-full h-full max-w-lg">
              {/* Background Sky */}
              <rect width="400" height="400" fill="#F0F9FF" rx="40" />
              
              {/* The Sun */}
              <circle cx="340" cy="60" r="30" fill="#FDBA74" className={activeStage === 'evaporation' ? 'animate-pulse' : ''} />
              <circle cx="340" cy="60" r="20" fill="#F97316" />

              {/* Mountains / Land */}
              <path d="M0 400 L0 300 Q100 250 200 300 T400 300 L400 400 Z" fill="#E2E8F0" />
              
              {/* Water Body */}
              <path d="M0 400 L0 320 Q200 300 400 320 L400 400 Z" fill="#BFDBFE" />
              <path d="M0 400 L0 340 Q200 320 400 340 L400 400 Z" fill="#60A5FA" />

              {/* Clouds */}
              <g className={`transition-all duration-1000 ${activeStage === 'condensation' || activeStage === 'precipitation' ? 'opacity-100 translate-y-0' : 'opacity-40 -translate-y-4'}`}>
                <circle cx="100" cy="80" r="25" fill="white" />
                <circle cx="130" cy="80" r="35" fill="white" />
                <circle cx="160" cy="80" r="25" fill="white" />
              </g>

              {/* Evaporation Animation */}
              {activeStage === 'evaporation' && (
                <g className="animate-bounce">
                  <path d="M250 280 Q260 260 250 240" fill="none" stroke="#FDBA74" strokeWidth="2" strokeDasharray="4 2" />
                  <path d="M280 270 Q290 250 280 230" fill="none" stroke="#FDBA74" strokeWidth="2" strokeDasharray="4 2" />
                  <path d="M220 270 Q230 250 220 230" fill="none" stroke="#FDBA74" strokeWidth="2" strokeDasharray="4 2" />
                </g>
              )}

              {/* Precipitation Animation */}
              {activeStage === 'precipitation' && (
                <g>
                  {[...Array(8)].map((_, i) => (
                    <line 
                      key={i}
                      x1={80 + i * 20} y1="120" x2={80 + i * 20} y2="150"
                      stroke="#60A5FA" strokeWidth="2" strokeLinecap="round"
                      className="animate-pulse"
                    />
                  ))}
                </g>
              )}

              {/* Collection Animation */}
              {activeStage === 'collection' && (
                <g>
                   <path d="M40 300 Q100 350 200 320 T360 330" fill="none" stroke="#2563EB" strokeWidth="3" strokeDasharray="5 5" className="animate-pulse" />
                </g>
              )}

              {/* Labels on SVG */}
              <text x="310" y="110" className="text-[10px] uppercase font-black fill-orange-400">Heat</text>
              <text x="250" y="220" className={`text-[12px] font-black uppercase transition-all ${activeStage === 'evaporation' ? 'fill-orange-600' : 'fill-slate-300'}`}>Evaporation</text>
              <text x="130" y="50" className={`text-[12px] font-black uppercase transition-all ${activeStage === 'condensation' ? 'fill-slate-600' : 'fill-slate-300'}`}>Condensation</text>
              <text x="80" y="180" className={`text-[12px] font-black uppercase transition-all ${activeStage === 'precipitation' ? 'fill-blue-600' : 'fill-slate-300'}`}>Precipitation</text>
              <text x="200" y="370" className={`text-[12px] font-black uppercase transition-all ${activeStage === 'collection' ? 'fill-cyan-600' : 'fill-slate-300'}`}>Collection</text>
            </svg>

            {/* Stage Description Overlay */}
            {activeStage && (
              <div className="absolute inset-x-10 bottom-10 bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-slate-100 shadow-xl animate-in fade-in slide-in-from-bottom-5">
                <div className="flex items-center gap-4 mb-3">
                  <div className={`p-2 rounded-lg ${stages.find(s => s.id === activeStage).color}`}>
                    {stages.find(s => s.id === activeStage).icon}
                  </div>
                  <h4 className="text-xl font-black text-slate-800">{stages.find(s => s.id === activeStage).title}</h4>
                </div>
                <p className="text-slate-600 font-medium leading-relaxed">
                  {stages.find(s => s.id === activeStage).description}
                </p>
              </div>
            )}
          </div>

          {/* 5. Score / Feedback Panel */}
          {quizMode && (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-orange-200 animate-in slide-in-from-right-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <p className="text-xs font-black text-orange-400 uppercase tracking-widest mb-1">Challenge Mode</p>
                  <p className="text-xl font-bold text-slate-700 leading-snug">
                    Can you find the stage where: <br/>
                    <span className="text-slate-900 font-black italic">"{quizTarget.description}"</span>
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {feedback === 'correct' ? (
                    <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100 animate-in zoom-in">
                      <Award size={32} />
                      <div>
                        <p className="font-bold">Excellent! ✅</p>
                        <button onClick={nextChallenge} className="text-xs underline hover:text-emerald-900 font-bold tracking-tight">Next Stage</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                       <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase">Click the matching button</p>
                       <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-blue-500 animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {feedback === 'incorrect' && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl text-center text-sm font-bold animate-in shake-2">
                  ❌ Not quite! Review the descriptions and try again.
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center text-xs font-black text-slate-400 tracking-widest uppercase">
                <div className="flex gap-4">
                  <span>Score: {score}</span>
                  <span>Attempts: {attempts}</span>
                </div>
                {attempts > 0 && <span className="text-slate-300">Accuracy: {Math.round((score / (attempts * 10)) * 100)}%</span>}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-blue-600" size={24} />
          Educational Value
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-blue-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Understand <strong>cycle dependency</strong> — how each stage leads to the next.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-orange-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Recognise the <strong>Sun's role</strong> as the primary energy source for water movement.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-slate-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Differentiate between <strong>liquid and vapour</strong> states in nature.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-emerald-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Build <strong>geography vocabulary</strong> with terms like Precipitation and Collection.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
