import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Settings, 
  RotateCcw, 
  Target, 
  Award, 
  BookOpen, 
  HelpCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  Wrench,
  Construction,
  Hammer
} from "lucide-react";

const MACHINES_DATA = {
  lever: {
    title: "Lever",
    emoji: "⚖️",
    ghanaianExample: "A Fufu Pounding Pestle and Mortar (lever action)",
    concept: "A rigid bar resting on a pivot (fulcrum).",
    color: "bg-blue-50 border-blue-200",
    accent: "text-blue-600",
    parts: ["Fulcrum", "Load", "Effort"],
    animation: "lever"
  },
  pulley: {
    title: "Pulley",
    emoji: "🎡",
    ghanaianExample: "Drawing water from a deep village well",
    concept: "A wheel with a grooved rim around which a cord passes.",
    color: "bg-orange-50 border-orange-200",
    accent: "text-orange-600",
    parts: ["Wheel", "Rope", "Load"],
    animation: "pulley"
  },
  inclined_plane: {
    title: "Inclined Plane",
    emoji: "📐",
    ghanaianExample: "A ramp used to load cocoa sacks onto a truck",
    concept: "A flat surface tilted at an angle.",
    color: "bg-emerald-50 border-emerald-200",
    accent: "text-emerald-600",
    parts: ["Slope", "Height", "Distance"],
    animation: "ramp"
  },
  wheel_axle: {
    title: "Wheel & Axle",
    emoji: "🚲",
    ghanaianExample: "The handle of a traditional 'Kweku Ananse' spinning wheel",
    concept: "A wheel connected to a smaller axle.",
    color: "bg-purple-50 border-purple-200",
    accent: "text-purple-600",
    parts: ["Wheel", "Axle", "Support"],
    animation: "wheel"
  }
};

const QUIZ_QUESTIONS = [
  { question: "Which machine uses a fulcrum to lift a load?", answer: "lever" },
  { question: "Which machine is a flat surface tilted at an angle?", answer: "inclined_plane" },
  { question: "Which machine helps lift buckets of water from a well?", answer: "pulley" },
  { question: "Which machine has a large wheel attached to a small rod?", answer: "wheel_axle" }
];

export default function SimpleMachinesExplorer() {
  const [activeTab, setActiveTab] = useState("lever");
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [leverAnimation, setLeverAnimation] = useState(0); // 0 to 100 for lever position

  const currentMachine = MACHINES_DATA[activeTab];
  const currentQuestion = QUIZ_QUESTIONS[currentQuestionIndex];

  // Lever interaction helper
  const handleLeverSlide = (e) => {
    setLeverAnimation(parseInt(e.target.value));
  };

  const handleQuizAnswer = (machineKey) => {
    setAttempts(prev => prev + 1);
    if (machineKey === currentQuestion.answer) {
      setFeedback("correct");
      setScore(prev => prev + 10);
      setTimeout(() => {
        if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setFeedback(null);
        } else {
          setFeedback("completed");
        }
      }, 2000);
    } else {
      setFeedback("incorrect");
    }
  };

  const resetQuiz = () => {
    setShowQuiz(false);
    setCurrentQuestionIndex(0);
    setScore(0);
    setAttempts(0);
    setFeedback(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
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
            <Settings className="text-blue-600 animate-spin-slow" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Simple Machines Explorer</h1>
            <p className="text-slate-500 font-medium tracking-tight">Discover the mechanical tools that make work easier!</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full border border-blue-200">
            Primary 4–6
          </span>
          <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1">
            <Clock size={16} /> 15 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Menu and Controls */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* 2. "How to Use" box */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <HelpCircle className="text-blue-500" size={18} /> How to Explore
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              1. Tap a machine type below to see it in action.<br/>
              2. Use the controls to animate the machine.<br/>
              3. Take the Quiz to test your knowledge!
            </p>
          </section>

          {/* 3. Interactive Control Zone: Machine Tabs */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 grid grid-cols-2 gap-3">
            {Object.entries(MACHINES_DATA).map(([key, data]) => (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setShowQuiz(false); }}
                className={`
                  p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2
                  ${activeTab === key && !showQuiz ? 'bg-blue-50 border-blue-400 ring-4 ring-blue-100 shadow-md' : 'bg-slate-50 border-transparent hover:border-slate-200'}
                `}
              >
                <span className="text-3xl">{data.emoji}</span>
                <span className="text-xs font-black uppercase tracking-widest text-slate-600">{data.title}</span>
              </button>
            ))}
            <button 
              onClick={() => setShowQuiz(true)}
              className={`
                col-span-2 p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 font-black uppercase tracking-[0.2em] text-xs
                ${showQuiz ? 'bg-orange-500 text-white border-orange-600 ring-4 ring-orange-100 shadow-lg' : 'bg-slate-800 text-white hover:bg-slate-700'}
              `}
            >
              <Target size={18} /> Knowledge Quiz
            </button>
          </div>

          {/* Machine Details Section */}
          {!showQuiz && (
            <div className={`p-6 rounded-3xl border shadow-sm transition-all duration-500 ${currentMachine.color}`}>
               <h3 className={`text-xl font-black mb-2 ${currentMachine.accent}`}>{currentMachine.title}</h3>
               <p className="text-sm font-bold text-slate-700 mb-4">{currentMachine.concept}</p>
               <div className="bg-white/60 p-4 rounded-2xl border border-white">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Everyday Example</span>
                  <p className="text-xs font-medium text-slate-600 italic">"{currentMachine.ghanaianExample}"</p>
               </div>
            </div>
          )}

          {/* Quiz Score Tracker */}
          {showQuiz && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
               <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Question {currentQuestionIndex + 1}/{QUIZ_QUESTIONS.length}</span>
                  <span className="text-xl font-black text-orange-600">{score} pts</span>
               </div>
               <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 transition-all duration-500" 
                    style={{ width: `${((currentQuestionIndex + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
                  />
               </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Visual Output Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-[3rem] shadow-xl border-8 border-slate-50 p-6 md:p-10 relative overflow-hidden min-h-[500px] flex flex-col items-center justify-center">
            
            {!showQuiz ? (
              <>
                {/* 4. Live Visual Area: Machine Animation */}
                <div className="w-full flex-1 flex flex-col items-center justify-center">
                  <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center bg-slate-50/50 rounded-full border-4 border-dashed border-slate-100">
                    <svg viewBox="0 0 400 400" className="w-full h-full">
                      {/* LEVER ANIMATION */}
                      {activeTab === 'lever' && (
                        <g transform="translate(200, 200)">
                          <path d="M -50 0 L 0 50 L 50 0 Z" fill="#64748b" /> {/* Fulcrum */}
                          <g transform={`rotate(${(leverAnimation - 50) * 0.4})`}>
                            <rect x="-150" y="-10" width="300" height="20" rx="10" fill="#3b82f6" /> {/* Lever Bar */}
                            <rect x="-140" y="-50" width="40" height="40" rx="8" fill="#f59e0b" /> {/* Load */}
                            <text x="-120" y="-25" textAnchor="middle" className="text-[10px] font-bold fill-white">LOAD</text>
                            <circle cx="120" cy="-20" r="15" fill="#ef4444" className="animate-pulse" /> {/* Effort Point */}
                          </g>
                          <text x="0" y="80" textAnchor="middle" className="text-xs font-black fill-slate-400 uppercase tracking-widest">Pivot Point (Fulcrum)</text>
                        </g>
                      )}

                      {/* PULLEY ANIMATION */}
                      {activeTab === 'pulley' && (
                        <g transform="translate(200, 150)">
                          <rect x="-60" y="-100" width="120" height="20" fill="#94a3b8" /> {/* Support */}
                          <circle cx="0" cy="0" r="40" fill="#f97316" stroke="#ea580c" strokeWidth="4" /> {/* Pulley Wheel */}
                          <line x1="-40" y1="0" x2="-40" y2={100 + leverAnimation/2} stroke="#cbd5e1" strokeWidth="4" />
                          <line x1="40" y1="0" x2="40" y2={150 - leverAnimation/2} stroke="#cbd5e1" strokeWidth="4" />
                          <circle cx="-40" cy={100 + leverAnimation/2} r="20" fill="#64748b" /> {/* Weight */}
                          <text x="-40" y={105 + leverAnimation/2} textAnchor="middle" className="text-[8px] font-bold fill-white">LOAD</text>
                        </g>
                      )}

                      {/* INCLINED PLANE */}
                      {activeTab === 'inclined_plane' && (
                        <g transform="translate(100, 300)">
                           <path d="M 0 0 L 250 0 L 250 -150 Z" fill="#10b981" /> {/* Ramp */}
                           <g transform={`translate(${leverAnimation * 2.5}, ${-leverAnimation * 1.5})`}>
                             <rect x="-20" y="-40" width="40" height="40" rx="4" fill="#64748b" /> {/* Box */}
                           </g>
                        </g>
                      )}

                      {/* WHEEL AND AXLE */}
                      {activeTab === 'wheel_axle' && (
                        <g transform="translate(200, 200)">
                           <circle cx="0" cy="0" r="100" fill="#a855f7" stroke="#9333ea" strokeWidth="8" strokeDasharray="20 10" className="animate-spin-slow" />
                           <circle cx="0" cy="0" r="20" fill="#64748b" /> {/* Axle */}
                           <rect x="-5" y="-100" width="10" height="20" fill="#9333ea" /> {/* Handle */}
                        </g>
                      )}
                    </svg>
                  </div>
                </div>

                {/* Animation Control */}
                <div className="w-full max-w-sm mt-8">
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Apply Force (Effort)</span>
                    <span className="text-xs font-bold text-blue-600">{leverAnimation}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={leverAnimation}
                    onChange={handleLeverSlide}
                    className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-bold uppercase">
                    <span>Rest</span>
                    <span>Max Effort</span>
                  </div>
                </div>
              </>
            ) : (
              /* QUIZ VIEW */
              <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center">
                {feedback === 'completed' ? (
                  <div className="animate-in zoom-in duration-500 flex flex-col items-center">
                    <Award size={100} className="text-orange-500 mb-6" />
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Mechanical Master!</h2>
                    <p className="text-slate-600 mb-8 max-w-xs">You've identified all simple machines correctly.</p>
                    <div className="bg-orange-50 rounded-3xl p-6 border-2 border-orange-100 flex items-center gap-10">
                       <div className="text-center">
                          <p className="text-[10px] font-black uppercase text-orange-400 mb-1">Score</p>
                          <p className="text-3xl font-black text-orange-600">{score}</p>
                       </div>
                       <div className="text-center">
                          <p className="text-[10px] font-black uppercase text-orange-400 mb-1">Efficiency</p>
                          <p className="text-3xl font-black">{Math.round((QUIZ_QUESTIONS.length / attempts) * 100)}%</p>
                       </div>
                    </div>
                    <button onClick={resetQuiz} className="mt-10 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all">Repeat Discovery</button>
                  </div>
                ) : (
                  <div className="w-full max-w-md">
                    <div className="bg-orange-50 p-8 rounded-[2rem] border-4 border-orange-100 mb-10">
                       <HelpCircle size={32} className="mx-auto text-orange-400 mb-4" />
                       <p className="text-xl md:text-2xl font-black text-slate-800 leading-tight">"{currentQuestion.question}"</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {Object.keys(MACHINES_DATA).map((key) => (
                        <button
                          key={key}
                          onClick={() => handleQuizAnswer(key)}
                          className={`
                            p-4 rounded-2xl border-2 font-black uppercase text-xs tracking-widest transition-all
                            ${feedback === 'incorrect' ? 'animate-shake' : ''}
                            bg-white border-slate-100 hover:border-orange-300 hover:shadow-md active:scale-95
                          `}
                        >
                          {MACHINES_DATA[key].emoji} {MACHINES_DATA[key].title}
                        </button>
                      ))}
                    </div>

                    {feedback === 'correct' && (
                      <div className="mt-8 text-emerald-600 font-black animate-bounce flex items-center justify-center gap-2">
                        <CheckCircle2 size={24} /> BINGO! WELL DONE!
                      </div>
                    )}
                    {feedback === 'incorrect' && (
                      <div className="mt-8 text-red-600 font-black flex items-center justify-center gap-2">
                        <XCircle size={24} /> OOPS! TRY ANOTHER ONE.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-blue-600" size={24} />
          Learning Benefits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
               <Construction size={14} className="text-blue-600" />
            </div>
            <p className="text-slate-600 text-sm">Understand the relationship between <strong>Force</strong>, <strong>Effort</strong>, and <strong>Work</strong>.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
               <Hammer size={14} className="text-orange-600" />
            </div>
            <p className="text-slate-600 text-sm">Identify <strong>Simple Machines</strong> in Ghanaian technology and construction.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
               <Wrench size={14} className="text-emerald-600" />
            </div>
            <p className="text-slate-600 text-sm">Learn how tools provide <strong>mechanical advantage</strong> to make tasks easier.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
               <RotateCcw size={14} className="text-purple-600" />
            </div>
            <p className="text-slate-600 text-sm">Practice <strong>analytical thinking</strong> to solve physical engineering problems.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
