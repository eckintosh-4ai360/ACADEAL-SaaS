import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Library, 
  Timer, 
  CheckCircle2, 
  XCircle, 
  RefreshCcw, 
  Award, 
  Zap,
  BookOpen,
  ArrowRight,
  Star,
  ChevronLeft
} from "lucide-react";

const SIGHT_WORDS = [
  "the", "and", "she", "was", "for", "on", "are", "as", "with", "his", 
  "they", "at", "be", "this", "have", "from", "or", "one", "had", "by", 
  "word", "but", "not", "what", "all", "were", "we", "when", "your", "can",
  "said", "there", "use", "an", "each", "which", "she", "do", "how", "their"
];

const ROUNDS_COUNT = 3;
const WORDS_PER_ROUND = 5;

export default function SightWordFlashCards() {
  const [gameState, setGameState] = useState("start"); // start, playing, summary
  const [currentRound, setCurrentRound] = useState(1);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [roundStats, setRoundStats] = useState([]);
  const [roundWords, setRoundWords] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Prepare words for the session (randomized)
  const startNewGame = useCallback(() => {
    setGameState("playing");
    setCurrentRound(1);
    setCurrentWordIndex(0);
    setScore(0);
    setTimer(0);
    setRoundStats([]);
    
    // Pick unique words for the whole session
    const shuffled = [...SIGHT_WORDS].sort(() => Math.random() - 0.5);
    setRoundWords(shuffled.slice(0, ROUNDS_COUNT * WORDS_PER_ROUND));
  }, []);

  // Timer logic
  useEffect(() => {
    let interval;
    if (gameState === "playing") {
      interval = setInterval(() => {
        setTimer(prev => prev + 0.1);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  const currentWord = useMemo(() => {
    const globalIndex = (currentRound - 1) * WORDS_PER_ROUND + currentWordIndex;
    return roundWords[globalIndex];
  }, [currentRound, currentWordIndex, roundWords]);

  const handleResponse = (correct) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    if (correct) setScore(prev => prev + 1);

    setTimeout(() => {
      const nextWordIndex = currentWordIndex + 1;
      
      if (nextWordIndex < WORDS_PER_ROUND) {
        setCurrentWordIndex(nextWordIndex);
      } else {
        // Round Finished
        const roundTime = timer; // Simplified: actually we want time per round
        const lastRoundStats = { round: currentRound, time: roundTime.toFixed(1), score: correct ? 1 : 0 }; 
        // Note: score tracking here is simplified for the round summary
        
        if (currentRound < ROUNDS_COUNT) {
          setRoundStats(prev => [...prev, { round: currentRound, time: timer.toFixed(1) }]);
          setCurrentRound(prev => prev + 1);
          setCurrentWordIndex(0);
          setTimer(0);
        } else {
          setRoundStats(prev => [...prev, { round: currentRound, time: timer.toFixed(1) }]);
          setGameState("summary");
        }
      }
      setIsAnimating(false);
    }, 300);
  };

  const averageTime = useMemo(() => {
    if (roundStats.length === 0) return 0;
    const total = roundStats.reduce((acc, curr) => acc + parseFloat(curr.time), 0);
    return (total / roundStats.length).toFixed(1);
  }, [roundStats]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 bg-orange-50/30 min-h-screen font-sans text-slate-800">
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
            <Library className="text-orange-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Sight Word Flash Cards</h1>
            <p className="text-slate-500 font-medium">Read common words quickly and accurately</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm">
            Primary 1–3
          </span>
          <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm flex items-center gap-1">
            <Timer size={16} /> 10 min
          </span>
        </div>
      </header>

      {gameState === "start" && (
        <main className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in duration-500">
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-white text-center max-w-lg w-full">
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Star className="text-orange-500 fill-orange-200" size={48} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4">Ready to Read?</h2>
            
            {/* 2. How to Use Box */}
            <div className="bg-slate-50 p-6 rounded-2xl mb-8 text-left border border-slate-100">
              <p className="text-slate-600 font-medium leading-relaxed">
                Read the word out loud as fast as you can. Tap "Check" if you get it right, or "Try Again" if you need more practice!
              </p>
            </div>

            <button
              onClick={startNewGame}
              className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 group"
            >
              Start Level 1
              <ArrowRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </main>
      )}

      {gameState === "playing" && (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
          {/* Stats Bar */}
          <div className="lg:col-span-12 flex flex-wrap items-center justify-between bg-white px-8 py-4 rounded-2xl shadow-sm border border-slate-100 gap-4">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Round</span>
                <span className="text-xl font-bold text-slate-900">{currentRound} / {ROUNDS_COUNT}</span>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                <span className="text-xl font-bold text-slate-900">{currentWordIndex + 1} / {WORDS_PER_ROUND}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-slate-900 text-orange-400 px-6 py-2 rounded-xl border-2 border-slate-800 flex items-center gap-3">
                 <Timer size={20} className="animate-pulse" />
                 <span className="text-2xl font-mono font-black">{timer.toFixed(1)}s</span>
              </div>
              <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl font-black flex items-center gap-2">
                 <Zap size={18} />
                 <span>Score: {score}</span>
              </div>
            </div>
          </div>

          {/* 4. Live Visual Output Area (Flash Card) */}
          <div className="lg:col-span-12 flex justify-center py-4">
            <div className={`
              w-full max-w-xl aspect-[3/2] bg-white rounded-[3rem] shadow-2xl border-[12px] border-orange-50 
              flex items-center justify-center p-8 text-center relative overflow-hidden transition-all duration-300
              ${isAnimating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'}
            `}>
              {/* Card Background Patterns */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <svg width="100%" height="100%">
                  <pattern id="dotPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="currentColor" />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#dotPattern)" />
                </svg>
              </div>

              <h2 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tight lowercase select-none">
                {currentWord}
              </h2>
            </div>
          </div>

          {/* 3. Interactive Control Zone */}
          <div className="lg:col-span-12 flex justify-center gap-4 md:gap-8 pb-8">
            <button
               onClick={() => handleResponse(false)}
               className="flex-1 max-w-[200px] h-20 bg-white border-4 border-slate-100 text-slate-400 rounded-3xl font-black text-lg hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
               <RefreshCcw size={24} />
               Skip
            </button>
            <button
               onClick={() => handleResponse(true)}
               className="flex-1 max-w-[300px] h-20 bg-emerald-500 text-white rounded-3xl font-black text-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-3 group"
            >
               <CheckCircle2 size={32} className="group-hover:scale-110 transition-transform" />
               I Got It!
            </button>
          </div>
        </main>
      )}

      {gameState === "summary" && (
        <main className="flex flex-col items-center py-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
           <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-white max-w-2xl w-full text-center">
              <Award className="text-orange-500 mx-auto mb-6" size={80} strokeWidth={1} />
              <h2 className="text-4xl font-black text-slate-900 mb-2">Game Complete!</h2>
              <p className="text-slate-500 font-medium mb-8">You showed great reading fluency today.</p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="bg-emerald-50 p-6 rounded-3xl">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Total Score</span>
                    <span className="text-4xl font-black text-emerald-900">{score} / {ROUNDS_COUNT * WORDS_PER_ROUND}</span>
                 </div>
                 <div className="bg-blue-50 p-6 rounded-3xl">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Avg. Speed</span>
                    <span className="text-4xl font-black text-blue-900">{averageTime}s</span>
                 </div>
              </div>

              <div className="space-y-3 mb-10">
                 <h3 className="text-left font-black text-slate-400 uppercase text-xs tracking-wider px-2">Round Summary</h3>
                 {roundStats.map((stat, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <span className="font-bold text-slate-700">Round {stat.round}</span>
                       <span className="font-mono font-bold text-slate-500">{stat.time}s</span>
                    </div>
                 ))}
              </div>

              <button
                onClick={startNewGame}
                className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-xl hover:bg-slate-800 shadow-xl transition-all"
              >
                Play Again
              </button>
           </div>
        </main>
      )}

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-orange-600" size={24} />
          Educational Benefits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-orange-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Automates recognition of <strong>high-frequency words</strong>.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Improves <strong>reading speed</strong> and decoding stamina.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-blue-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Develops <strong>visual memory</strong> for non-decodable words.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-purple-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Builds <strong>self-confidence</strong> through objective scoring.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
