import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// ─── Number Line Character & Data ──────────────────────────────────────────────

const MAX_NUMBER = 20;

const CHARACTERS = [
  { id: "frog",   emoji: "🐸", name: "Frog",   color: "#6BCB77", action: "hop" },
  { id: "rabbit", emoji: "🐰", name: "Rabbit", color: "#9B5DE5", action: "jump" },
  { id: "monkey", emoji: "🐒", name: "Monkey", color: "#FF9F43", action: "swing" },
];

// ─── SVG Number Line ─────────────────────────────────────────────────────────

function NumberLineSVG({ position, character, pathHistory }) {
  // Config
  const width = 800; // wide enough for 20 points
  const height = 180;
  const padding = 40;
  const step = (width - padding * 2) / MAX_NUMBER;

  const getX = (num) => padding + num * step;
  const baseY = 120;

  // Generate jumping arc path from history
  const buildPath = () => {
    if (pathHistory.length < 2) return "";
    let d = "";
    for (let i = 1; i < pathHistory.length; i++) {
      const prev = pathHistory[i - 1];
      const curr = pathHistory[i];
      const startX = getX(prev);
      const endX = getX(curr);
      
      const dist = Math.abs(curr - prev);
      const midX = (startX + endX) / 2;
      const arcHeight = 40 + (dist * 10); // jump higher for bigger leaps
      const midY = baseY - arcHeight;

      if (i === 1) d += `M ${startX} ${baseY} `;
      d += `Q ${midX} ${midY} ${endX} ${baseY} `;
    }
    return d;
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none" style={{ minWidth: "600px" }}>
      {/* ── Background decoration ── */}
      <rect x="0" y="0" width={width} height={height} fill="#f8fafc" rx="16" />
      <path d={`M 0 140 Q 200 130 400 145 T 800 140 L 800 180 L 0 180 Z`} fill="#dcfce7" />

      {/* ── Grass tufts ── */}
      {[2, 7, 12, 18].map(n => (
        <path key={n} d={`M ${getX(n)-10} 140 Q ${getX(n)} 120 ${getX(n)+10} 140`} stroke="#86efac" strokeWidth="3" fill="none" />
      ))}

      {/* ── Arc Path (Trail) ── */}
      <path d={buildPath()} stroke={character.color} strokeWidth="4" strokeDasharray="6,6" fill="none" opacity="0.6" />

      {/* ── Main Line ── */}
      <line x1={padding - 20} y1={baseY} x2={width - padding + 20} y2={baseY} stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />

      {/* ── Tick Marks & Numbers ── */}
      {[...Array(MAX_NUMBER + 1)].map((_, n) => {
        const x = getX(n);
        const isActive = n <= position;
        const isCurrent = n === position;
        const isMultipleOf5 = n % 5 === 0;

        return (
          <g key={n} style={{ transition: "all 0.3s" }}>
            <line x1={x} y1={baseY - 8} x2={x} y2={baseY + 8} stroke={isActive ? character.color : "#94a3b8"} strokeWidth={isMultipleOf5 ? "4" : "3"} />
            
            <circle cx={x} cy={baseY} r={isCurrent ? 14 : isMultipleOf5 ? 6 : 4} 
              fill={isActive ? character.color : "white"} 
              stroke={isActive ? character.color : "#94a3b8"} 
              strokeWidth="2" 
            />

            <text x={x} y={baseY + 28} 
              textAnchor="middle" 
              fontSize={isCurrent ? "20" : isMultipleOf5 ? "16" : "14"} 
              fontWeight={isCurrent ? "900" : isMultipleOf5 ? "700" : "600"}
              fill={isCurrent ? character.color : isActive ? "#475569" : "#94a3b8"}
              fontFamily="Arial"
            >
              {n}
            </text>
          </g>
        );
      })}

      {/* ── Character Avatar ── */}
      <g style={{ transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)", transform: `translate(${getX(position)}px, ${baseY - 30}px)` }}>
        <circle cx="0" cy="0" r="22" fill="white" stroke={character.color} strokeWidth="3" />
        <text x="0" y="8" textAnchor="middle" fontSize="26">{character.emoji}</text>
      </g>
    </svg>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────

export default function NumberLineAdventures() {
  const [position, setPosition] = useState(0);
  const [character, setCharacter] = useState(CHARACTERS[0]);
  const [pathHistory, setPathHistory] = useState([0]); // tracks jumps for drawing arcs
  
  const [mode, setMode] = useState("explore"); // "explore" | "quiz"
  const [quizQuestion, setQuizQuestion] = useState(null); // { start, op: "+|-", amount, target }
  const [feedback, setFeedback] = useState(null);

  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);

  // Math operations
  const hop = useCallback((amount) => {
    setPosition(prev => {
      const next = Math.max(0, Math.min(MAX_NUMBER, prev + amount));
      if (next !== prev) {
        setPathHistory(h => [...h.slice(-4), next]); // keep last 5 points for the arc trail
      }
      return next;
    });
    setFeedback(null);
  }, []);

  const jumpTo = useCallback((num) => {
    if (num >= 0 && num <= MAX_NUMBER && num !== position) {
      setPosition(num);
      setPathHistory([num]); // clear trail on direct jump
      setFeedback(null);
    }
  }, [position]);

  // Quiz Logic
  const startQuiz = useCallback(() => {
    // Generate an addition or subtraction question
    const isAddition = Math.random() > 0.5;
    let start, amount, target;

    if (isAddition) {
      start = Math.floor(Math.random() * 15);      // 0 to 14
      amount = Math.floor(Math.random() * 5) + 1;  // 1 to 5
      target = start + amount;
    } else {
      start = Math.floor(Math.random() * 15) + 5;  // 5 to 19
      amount = Math.floor(Math.random() * Math.min(5, start)) + 1;
      target = start - amount;
    }

    setQuizQuestion({ start, op: isAddition ? "+" : "-", amount, target });
    jumpTo(start);
    setMode("quiz");
    setFeedback(null);
  }, [jumpTo]);

  const checkQuizAnswer = useCallback(() => {
    if (!quizQuestion) return;
    setAttempts(a => a + 1);
    
    if (position === quizQuestion.target) {
      setScore(s => s + 1);
      setFeedback("correct");
    } else {
      setFeedback("wrong");
    }
  }, [position, quizQuestion]);

  const resetAll = useCallback(() => {
    setPosition(0);
    setPathHistory([0]);
    setMode("explore");
    setQuizQuestion(null);
    setFeedback(null);
    setScore(0);
    setAttempts(0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-3 sm:p-6 font-sans">
      {/* ── BACK BUTTON ── */}
      <div className="max-w-4xl mx-auto mb-4">
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
      </div>

      <div className="max-w-4xl mx-auto space-y-4">

        {/* ── HEADER ── */}
        <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <span className="text-5xl">📏</span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">KG 1–2</span>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">⏱ 10 min</span>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-100">🔢 Numeracy / Math</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-800">Number Line Adventures</h1>
            <p className="text-sm text-gray-500 mt-0.5">Make your animal jump forward (+) and backward (−) on the line.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <div className="text-center bg-green-50 border border-green-200 rounded-xl px-4 py-2">
              <p className="text-[10px] text-green-600 font-semibold uppercase">Score</p>
              <p className="text-2xl font-black text-green-700">{score}</p>
            </div>
            <div className="text-center bg-orange-50 border border-orange-200 rounded-xl px-4 py-2">
              <p className="text-[10px] text-orange-600 font-semibold uppercase">Tries</p>
              <p className="text-2xl font-black text-orange-700">{attempts}</p>
            </div>
          </div>
        </div>

        {/* ── HOW TO USE ── */}
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-bold text-purple-800 mb-1">👋 How to Play</p>
          <ul className="text-sm text-purple-900 space-y-1">
            <li>🐸 Press <strong>+1 or +2</strong> to jump forward. That is addition!</li>
            <li>🐰 Press <strong>−1 or −2</strong> to jump backward. That is subtraction!</li>
            <li>🎯 Press <strong>"Give me a Math Problem"</strong> to see if you can solve the equation.</li>
          </ul>
        </div>

        {/* ── NUMBER LINE VISUAL ── */}
        <div className="bg-white rounded-2xl shadow-lg p-5 overflow-x-auto relative">
          
          {/* Character select (top edge) */}
          <div className="absolute top-4 left-4 flex gap-1 z-10">
            {CHARACTERS.map(c => (
              <button key={c.id} onClick={() => setCharacter(c)}
                className={`w-9 h-9 rounded-full text-lg shadow-sm border-2 transition-transform ${character.id === c.id ? "scale-110" : "bg-gray-50 border-transparent hover:scale-105"}`}
                style={character.id === c.id ? { borderColor: c.color, backgroundColor: c.color + "22" } : {}}
              >
                {c.emoji}
              </button>
            ))}
          </div>

          {/* Current position banner (top right) */}
          <div className="absolute top-4 right-4 z-10 text-center">
            <span className="text-xs font-bold text-gray-400 uppercase block">Current Number</span>
            <span className="text-4xl font-black" style={{ color: character.color }}>{position}</span>
          </div>

          <div className="w-[800px] mx-auto mt-10">
            <NumberLineSVG position={position} character={character} pathHistory={pathHistory} />
          </div>
        </div>

        {/* ── CONTROL ZONE & QUIZ ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Controls */}
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 text-center">Hop Controls</p>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Backwards (Sub) */}
              <div className="space-y-2">
                <button onClick={() => hop(-1)} disabled={position <= 0}
                  className="w-full h-14 rounded-xl font-black text-xl bg-orange-100 text-orange-700 border-2 border-orange-200 hover:bg-orange-200 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all">
                  − 1
                </button>
                <button onClick={() => hop(-2)} disabled={position <= 1}
                  className="w-full h-12 rounded-xl font-bold text-lg bg-orange-50 text-orange-600 border-2 border-orange-100 hover:bg-orange-100 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all">
                  − 2
                </button>
                <button onClick={() => hop(-5)} disabled={position <= 4}
                  className="w-full h-10 rounded-xl font-bold text-sm bg-orange-50 text-orange-500 hover:bg-orange-100 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all">
                  − 5
                </button>
              </div>

              {/* Forwards (Add) */}
              <div className="space-y-2">
                <button onClick={() => hop(1)} disabled={position >= MAX_NUMBER}
                  className="w-full h-14 rounded-xl font-black text-xl bg-green-100 text-green-700 border-2 border-green-200 hover:bg-green-200 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all">
                  + 1
                </button>
                <button onClick={() => hop(2)} disabled={position >= MAX_NUMBER - 1}
                  className="w-full h-12 rounded-xl font-bold text-lg bg-green-50 text-green-600 border-2 border-green-100 hover:bg-green-100 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all">
                  + 2
                </button>
                <button onClick={() => hop(5)} disabled={position >= MAX_NUMBER - 4}
                  className="w-full h-10 rounded-xl font-bold text-sm bg-green-50 text-green-500 hover:bg-green-100 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all">
                  + 5
                </button>
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
               <button onClick={() => jumpTo(0)} className="flex-1 py-2 rounded-lg bg-gray-50 text-gray-500 font-semibold text-sm hover:bg-gray-100">
                 Reset to 0
               </button>
               <button onClick={() => jumpTo(10)} className="flex-1 py-2 rounded-lg bg-gray-50 text-gray-500 font-semibold text-sm hover:bg-gray-100">
                 Jump to 10
               </button>
            </div>
          </div>

          {/* Quiz Panel */}
          <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col justify-center text-center">
            {mode === "explore" ? (
              <div className="py-6">
                <p className="text-6xl mb-4 text-gray-200 font-black">? + ?</p>
                <button onClick={startQuiz} className="w-full h-14 rounded-xl bg-blue-500 text-white font-bold text-lg hover:bg-blue-600 shadow-md active:scale-95 transition-all">
                  📝 Give me a Math Problem!
                </button>
              </div>
            ) : (
              <div className="flex flex-col h-full space-y-4">
                <p className="text-xs font-bold text-blue-500 uppercase tracking-wide">Solve the equation</p>
                
                {/* Equation Display */}
                <div className="flex items-center justify-center gap-3 text-5xl font-black">
                  <span className="text-gray-700">{quizQuestion.start}</span>
                  <span className={quizQuestion.op === "+" ? "text-green-500" : "text-orange-500"}>{quizQuestion.op}</span>
                  <span className="text-gray-700">{quizQuestion.amount}</span>
                  <span className="text-gray-400">=</span>
                  <span className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    feedback === "correct" ? "bg-green-100 text-green-700 border-2 border-green-400" 
                    : "bg-blue-50 text-blue-600 border-2 border-dashed border-blue-300"
                  }`}>
                    {feedback === "correct" ? position : "?"}
                  </span>
                </div>

                <p className="text-sm text-gray-500">Use the hop controls to move {quizQuestion.amount} steps {quizQuestion.op === "+" ? "forward" : "backward"}!</p>

                {/* Feedback */}
                {feedback && (
                  <div className={`p-3 rounded-xl font-bold text-sm ${feedback === "correct" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                    {feedback === "correct" ? "🎉 Excellent! You solved it!" : `❌ Not quite! You are on ${position}.`}
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-auto pt-2 grid grid-cols-2 gap-2">
                  <button onClick={() => { setMode("explore"); setFeedback(null); }} className="h-12 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold hover:bg-gray-100 transition-colors">
                    End Quiz
                  </button>
                  {feedback === "correct" ? (
                    <button onClick={startQuiz} className="h-12 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 transition-colors shadow-sm">
                      Next Problem ➡️
                    </button>
                  ) : (
                     <button onClick={checkQuizAnswer} className="h-12 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 shadow-sm transition-colors disabled:opacity-50">
                      ✅ Check Answer
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── EDUCATIONAL FOOTER ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">📘 Learning Benefits</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Visually connects counting forward with addition (+)</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Visually connects counting backward with subtraction (−)</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Helps children visualize jumping by chunks (hop 2, hop 5)</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Number line 0–20 is foundational for primary school maths</li>
          </ul>
        </div>

        <button onClick={resetAll} className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-xs font-semibold hover:bg-gray-100 transition-colors">
          🔄 Reset Everything
        </button>

      </div>
    </div>
  );
}
