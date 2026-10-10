import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Heart, 
  Handshake, 
  UserCheck, 
  Users, 
  Award, 
  BookOpen, 
  RefreshCcw, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  ChevronLeft
} from "lucide-react";

const VALUES = [
  { id: "sharing", title: "Sharing", icon: <Users className="w-6 h-6" />, color: "bg-blue-500", lightColor: "bg-blue-100", textColor: "text-blue-700" },
  { id: "honesty", title: "Honesty", icon: <UserCheck className="w-6 h-6" />, color: "bg-emerald-500", lightColor: "bg-emerald-100", textColor: "text-emerald-700" },
  { id: "respect", title: "Respect", icon: <Handshake className="w-6 h-6" />, color: "bg-amber-500", lightColor: "bg-amber-100", textColor: "text-amber-700" }
];

const SCENARIOS = [
  { id: 1, text: "Giving half of your lunch to a friend who forgot theirs.", valueId: "sharing" },
  { id: 2, text: "Telling the truth about who accidentally broke the vase.", valueId: "honesty" },
  { id: 3, text: "Wait for your turn to speak during a class discussion.", valueId: "respect" },
  { id: 4, text: "Returning a toy you found to the teacher.", valueId: "honesty" },
  { id: 5, text: "Letting others play with your football during break time.", valueId: "sharing" },
  { id: 6, text: "Greeting elders and teachers politely every morning.", valueId: "respect" },
  { id: 7, text: "Admitting you didn't do your homework instead of making an excuse.", valueId: "honesty" },
  { id: 8, text: "Helping a younger student carry their heavy bag.", valueId: "sharing" },
  { id: 9, text: "Listening carefully when someone else is telling a story.", valueId: "respect" }
];

export default function GhanaianValuesSorter() {
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [placedScenarios, setPlacedScenarios] = useState({}); // { scenarioId: valueId }
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const currentScenario = SCENARIOS[currentScenarioIndex];

  const handleDrop = (valueId) => {
    if (showResults) return;

    const isCorrect = currentScenario.valueId === valueId;
    setAttempts(prev => prev + 1);

    if (isCorrect) {
      setFeedback("correct");
      setPlacedScenarios(prev => ({ ...prev, [currentScenario.id]: valueId }));
      
      setTimeout(() => {
        if (currentScenarioIndex < SCENARIOS.length - 1) {
          setCurrentScenarioIndex(prev => prev + 1);
          setFeedback(null);
        } else {
          setShowResults(true);
        }
      }, 1000);
    } else {
      setFeedback("incorrect");
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  const resetGame = () => {
    setCurrentScenarioIndex(0);
    setPlacedScenarios({});
    setFeedback(null);
    setAttempts(0);
    setShowResults(false);
  };

  const progress = ((currentScenarioIndex) / SCENARIOS.length) * 100;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 bg-blue-50/30 min-h-screen font-sans text-slate-800">
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
            <Heart className="text-blue-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Ghanaian Values Sorter</h1>
            <p className="text-slate-500 font-medium">Learn about good character and morals</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm">
            Primary 1–3
          </span>
          <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm flex items-center gap-1">
            <BookOpen size={16} /> 10 min
          </span>
        </div>
      </header>

      {/* 2. How to Use Box */}
      <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-8">
        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
          <HelpCircle className="text-blue-500" size={18} /> How to Play
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          Read the scenario card and decide which value it shows. Click on the correct value circle to sort the card!
        </p>
      </section>

      {!showResults ? (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 4. Live Visual Output Area (Scenario Card) */}
          <div className="lg:col-span-12">
            <div className="mb-4 flex items-center justify-between px-2">
               <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                 Progress: {currentScenarioIndex + 1} / {SCENARIOS.length}
               </span>
               <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-blue-500 transition-all duration-500" 
                   style={{ width: `${progress}%` }}
                 />
               </div>
            </div>
            
            <div className="flex justify-center mb-12">
              <div className={`
                w-full max-w-lg aspect-video bg-white rounded-[2.5rem] shadow-xl border-8 border-blue-50 
                flex items-center justify-center p-8 text-center relative overflow-hidden transition-all duration-300
                ${feedback === 'correct' ? 'border-emerald-100 scale-95 opacity-50' : feedback === 'incorrect' ? 'border-red-100 animate-shake' : 'scale-100'}
              `}>
                <div className="absolute top-4 left-4 text-blue-200">
                  <Heart size={48} strokeWidth={1} />
                </div>
                <p className="text-xl md:text-2xl font-bold text-slate-800 leading-relaxed italic animate-in fade-in slide-in-from-bottom-4 duration-500">
                  "{currentScenario.text}"
                </p>
              </div>
            </div>
          </div>

          {/* 3. Interactive Control Zone (Value Buckets) */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map(value => (
              <button
                key={value.id}
                onClick={() => handleDrop(value.id)}
                className={`
                  group relative flex flex-col items-center p-8 rounded-[3rem] transition-all duration-300 border-4
                  ${value.lightColor} ${value.borderClass || 'border-transparent'}
                  hover:scale-105 active:scale-95 hover:shadow-xl
                  ${feedback === 'correct' && currentScenario.valueId === value.id ? 'ring-4 ring-emerald-400' : ''}
                `}
              >
                <div className={`w-20 h-20 rounded-full ${value.color} text-white flex items-center justify-center mb-4 shadow-lg group-hover:animate-bounce`}>
                  {value.icon}
                </div>
                <h3 className={`text-xl font-black ${value.textColor}`}>{value.title}</h3>
                <span className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Pick this value
                </span>
              </button>
            ))}
          </div>

          {/* 5. Score / Feedback Panel */}
          <div className="lg:col-span-12 mt-8 flex justify-center">
             {feedback === "correct" && (
                <div className="bg-emerald-100 text-emerald-700 px-8 py-3 rounded-full font-bold flex items-center gap-2 animate-in zoom-in duration-300">
                   <CheckCircle2 size={24} /> ✅ Correct Choice!
                </div>
             )}
             {feedback === "incorrect" && (
                <div className="bg-red-100 text-red-700 px-8 py-3 rounded-full font-bold flex items-center gap-2 animate-in zoom-in duration-300">
                   <AlertCircle size={24} /> ❌ Not quite. Think again!
                </div>
             )}
          </div>
        </main>
      ) : (
        /* Results View */
        <main className="flex flex-col items-center py-12 animate-in fade-in zoom-in duration-700">
          <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-white max-w-2xl w-full text-center">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Award className="text-emerald-500" size={56} />
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-2">Wonderful Job!</h2>
            <p className="text-slate-500 font-medium mb-8">You understand the importance of good character.</p>

            <div className="bg-slate-50 p-8 rounded-3xl mb-8 flex items-center justify-center gap-12 border border-slate-100">
               <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 text-center">Scenarios</span>
                  <span className="text-4xl font-black text-slate-900">{SCENARIOS.length}</span>
               </div>
               <div className="w-px h-12 bg-slate-200" />
               <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 text-center">Total Clicks</span>
                  <span className="text-4xl font-black text-slate-900">{attempts}</span>
               </div>
            </div>

            <button
              onClick={resetGame}
              className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
            >
              <RefreshCcw size={24} /> Play Again
            </button>
          </div>
        </main>
      )}

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-blue-600" size={24} />
          Educational Benefits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-blue-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Identifies <strong>positive behaviors</strong> in real-life situations.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-emerald-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Differentiates between core values like <strong>honesty and respect</strong>.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-amber-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Develops <strong>moral reasoning</strong> and ethical decision making.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-purple-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Supports <strong>character building</strong> through self-reflection.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
