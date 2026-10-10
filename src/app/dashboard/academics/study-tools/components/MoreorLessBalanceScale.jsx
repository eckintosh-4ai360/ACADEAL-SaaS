import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const WEIGHTS = [
  { id: "apple", emoji: "🍎", name: "Apple", weight: 1, color: "#EF4444" },
  { id: "book",  emoji: "📚", name: "Book",  weight: 2, color: "#3B82F6" },
  { id: "block", emoji: "🧱", name: "Block", weight: 3, color: "#F59E0B" },
];

const MAX_ITEMS_PER_SIDE = 8;
const MAX_WEIGHT_DIFF = 10;

// ─── SVG Balance Scale ───────────────────────────────────────────────────────

function BalanceScaleSVG({ leftItems, rightItems }) {
  // Calculate total weights
  const leftWeight = leftItems.reduce((sum, item) => sum + item.weight, 0);
  const rightWeight = rightItems.reduce((sum, item) => sum + item.weight, 0);
  
  // Calculate tilt angle (-15 to 15 degrees)
  // Max difference that tilts it fully is let's say 6.
  const difference = rightWeight - leftWeight;
  let angle = (difference / 5) * 15;
  // Clamp angle
  if (angle > 18) angle = 18;
  if (angle < -18) angle = -18;

  // Base setup
  const cx = 200;
  const cy = 180;
  const armLength = 120; // 120px to each side of center point

  // The scales pans will hang from the ends of the arm.
  // We need to calculate their Y positions based on the rotation angle.
  const angleRad = (angle * Math.PI) / 180;
  
  // Left pivot points
  const leftPivotX = cx - Math.cos(angleRad) * armLength;
  const leftPivotY = cy - Math.sin(angleRad) * armLength;
  
  // Right pivot points
  const rightPivotX = cx + Math.cos(angleRad) * armLength;
  const rightPivotY = cy + Math.sin(angleRad) * armLength;

  // Pan drop length
  const dropLength = 60;

  return (
    <svg viewBox="0 0 400 300" className="w-full h-full select-none" style={{ minHeight: "250px" }}>
      {/* ── Base & Stand ── */}
      {/* Base */}
      <path d="M 160 280 L 240 280 L 250 295 L 150 295 Z" fill="#94a3b8" />
      <rect x="150" y="295" width="100" height="5" fill="#64748b" rx="2" />
      
      {/* Stand post */}
      <rect x="192" y="160" width="16" height="120" fill="#cbd5e1" rx="4" />
      <rect x="195" y="160" width="10" height="120" fill="#f1f5f9" /> {/* highlight */}

      {/* ── Rotating Arm Group ── */}
      <g style={{ transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${angle}deg)`, transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
        {/* Main arm bar */}
        <rect x={cx - armLength} y={cy - 6} width={armLength * 2} height="12" fill="#FBBF24" rx="6" />
        {/* Arm highlights */}
        <rect x={cx - armLength + 4} y={cy - 4} width={armLength * 2 - 8} height="4" fill="#FDE68A" rx="2" />

        {/* Center pivot pin */}
        <circle cx={cx} cy={cy} r="10" fill="#F59E0B" />
        <circle cx={cx} cy={cy} r="5" fill="#FFFBEB" />

        {/* Left hook */}
        <circle cx={cx - armLength + 10} cy={cy} r="4" fill="#D97706" />
        {/* Right hook */}
        <circle cx={cx + armLength - 10} cy={cy} r="4" fill="#D97706" />
      </g>

      {/* ── Left Pan ── */}
      <g style={{ transform: `translate(0, ${leftPivotY - cy})`, transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
        {/* Strings */}
        <line x1={cx - armLength + 10} y1={cy} x2={cx - armLength - 20} y2={cy + dropLength} stroke="#94a3b8" strokeWidth="2" />
        <line x1={cx - armLength + 10} y1={cy} x2={cx - armLength + 40} y2={cy + dropLength} stroke="#94a3b8" strokeWidth="2" />
        
        {/* Plate */}
        <path d={`M ${cx - armLength - 30} ${cy + dropLength} Q ${cx - armLength + 10} ${cy + dropLength + 20} ${cx - armLength + 50} ${cy + dropLength} Z`} fill="#38bdf8" />
        <ellipse cx={cx - armLength + 10} cy={cy + dropLength - 2} rx="40" ry="8" fill="#bae6fd" />

        {/* Left Items stack (visual representation) */}
        {leftItems.slice(0, MAX_ITEMS_PER_SIDE).map((item, i) => {
          // Stacking logic
          const row = Math.floor(i / 3);
          const col = i % 3;
          const px = (cx - armLength + 10) + (col - 1) * 20;
          const py = (cy + dropLength - 15) - (row * 20);
          return (
            <text key={`l-${i}`} x={px} y={py} textAnchor="middle" fontSize="24" className="animate-in zoom-in duration-300">
              {item.emoji}
            </text>
          );
        })}
      </g>

      {/* ── Right Pan ── */}
      <g style={{ transform: `translate(0, ${rightPivotY - cy})`, transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
        {/* Strings */}
        <line x1={cx + armLength - 10} y1={cy} x2={cx + armLength - 40} y2={cy + dropLength} stroke="#94a3b8" strokeWidth="2" />
        <line x1={cx + armLength - 10} y1={cy} x2={cx + armLength + 20} y2={cy + dropLength} stroke="#94a3b8" strokeWidth="2" />
        
        {/* Plate */}
        <path d={`M ${cx + armLength - 50} ${cy + dropLength} Q ${cx + armLength - 10} ${cy + dropLength + 20} ${cx + armLength + 30} ${cy + dropLength} Z`} fill="#f87171" />
        <ellipse cx={cx + armLength - 10} cy={cy + dropLength - 2} rx="40" ry="8" fill="#fecaca" />

        {/* Right Items stack */}
        {rightItems.slice(0, MAX_ITEMS_PER_SIDE).map((item, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const px = (cx + armLength - 10) + (col - 1) * 20;
          const py = (cy + dropLength - 15) - (row * 20);
          return (
            <text key={`r-${i}`} x={px} y={py} textAnchor="middle" fontSize="24" className="animate-in zoom-in duration-300">
              {item.emoji}
            </text>
          );
        })}
      </g>
    </svg>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────

export default function MoreorLessBalanceScale() {
  const [leftPan, setLeftPan] = useState([]);
  const [rightPan, setRightPan] = useState([]);
  
  const [mode, setMode] = useState("explore"); // "explore" | "quiz"
  const [quizTask, setQuizTask] = useState(null); // { type: "make_heavier" | "make_equal", targetPan: "left" | "right", targetItemCount: 3 }
  const [feedback, setFeedback] = useState(null);

  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);

  // Computed Weights
  const leftWeight = leftPan.reduce((s, i) => s + i.weight, 0);
  const rightWeight = rightPan.reduce((s, i) => s + i.weight, 0);

  // Status text for Explore mode
  const getScaleStatus = () => {
    if (leftWeight === 0 && rightWeight === 0) return "Add things to the scale!";
    if (leftWeight === rightWeight) return "Perfectly balanced! They are EQUAL.";
    if (leftWeight > rightWeight) return "The Left side is HEAVIER!";
    return "The Right side is HEAVIER!";
  };

  // Status Emoji
  const getScaleEmoji = () => {
    if (leftWeight === 0 && rightWeight === 0) return "⚖️";
    if (leftWeight === rightWeight) return "🤝";
    if (leftWeight > rightWeight) return "👈";
    return "👉";
  };

  // Actions
  const addToPan = useCallback((side, itemObj) => {
    setFeedback(null);
    if (side === "left") {
      setLeftPan(prev => prev.length < MAX_ITEMS_PER_SIDE ? [...prev, itemObj] : prev);
    } else {
      setRightPan(prev => prev.length < MAX_ITEMS_PER_SIDE ? [...prev, itemObj] : prev);
    }
  }, []);

  const clearPans = useCallback(() => {
    setLeftPan([]);
    setRightPan([]);
    setFeedback(null);
  }, []);

  // Quiz Logic
  const startQuiz = useCallback(() => {
    clearPans();
    
    // Pick random target task
    const types = ["equal", "left_heavy", "right_heavy"];
    const taskType = types[Math.floor(Math.random() * types.length)];
    
    // Pre-fill one side to give them a baseline
    const baseItem = WEIGHTS[Math.floor(Math.random() * WEIGHTS.length)];
    const baseCount = Math.floor(Math.random() * 3) + 1;
    const baseItemsArr = Array(baseCount).fill(baseItem);
    
    // We put the baseline on the left pan (usually) to make it easier
    setLeftPan(baseItemsArr);
    
    setQuizTask({ type: taskType, baseWeight: baseItem.weight * baseCount });
    setMode("quiz");
    setFeedback(null);
  }, [clearPans]);

  const checkQuizAnswer = useCallback(() => {
    if (!quizTask) return;
    setAttempts(a => a + 1);

    let isCorrect = false;

    if (quizTask.type === "equal" && leftWeight === rightWeight && leftWeight > 0) {
      isCorrect = true;
    } else if (quizTask.type === "left_heavy" && leftWeight > rightWeight && rightWeight > 0) {
      isCorrect = true;
    } else if (quizTask.type === "right_heavy" && rightWeight > leftWeight && leftWeight > 0) {
      isCorrect = true;
    }

    if (isCorrect) {
      setScore(s => s + 1);
      setFeedback("correct");
    } else {
      setFeedback("wrong");
    }
  }, [quizTask, leftWeight, rightWeight]);


  const fullReset = useCallback(() => {
    clearPans();
    setMode("explore");
    setQuizTask(null);
    setScore(0);
    setAttempts(0);
  }, [clearPans]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 p-3 sm:p-6 font-sans">
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
          <span className="text-5xl">⚖️</span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">KG 1–2</span>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">⏱ 8 min</span>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-100">🔢 Numeracy / Math</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-800">More or Less Balance Scale</h1>
            <p className="text-sm text-gray-500 mt-0.5">Which side is heavier? Let's balance the scale!</p>
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
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-bold text-blue-800 mb-1">👋 How to Play</p>
          <ul className="text-sm text-blue-900 space-y-1">
            <li>🍎 Tap an item below a pan to drop it in. Watch the scale tilt!</li>
            <li>⬇️ The <strong>HEAVIER</strong> side (has more weight) goes down towards the ground.</li>
            <li>⚖️ If both sides weigh the same, they are <strong>EQUAL</strong> and sit flat.</li>
            <li>🎯 Press <strong>"Give me a puzzle"</strong> to test your balancing skills!</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* ── LEFT: Scale Visual Area ── */}
          <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col">
            
            {/* Status Display */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center mb-2">
              <p className="text-3xl mb-1">{getScaleEmoji()}</p>
              <p className="font-bold text-gray-700" style={{ color: leftWeight > rightWeight ? "#3b82f6" : rightWeight > leftWeight ? "#ef4444" : "#f59e0b" }}>
                {getScaleStatus()}
              </p>
              {/* Dev/Debug weights (Remove if too complex for kids, but helpful for teaching) */}
              <div className="flex justify-center gap-12 mt-1 text-xs font-bold text-gray-400">
                <span>L: {leftWeight}</span>
                <span>R: {rightWeight}</span>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <BalanceScaleSVG leftItems={leftPan} rightItems={rightPan} />
            </div>

            <button onClick={clearPans} className="mt-4 w-full h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 font-semibold text-sm hover:bg-gray-100 transition-colors uppercase tracking-wider">
               🧹 Empty Both Pans
            </button>
          </div>

          {/* ── RIGHT: Controls & Quiz Area ── */}
          <div className="flex flex-col gap-4">
            
            {/* Item Adders */}
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Add items to the scale</p>
              
              <div className="flex gap-4">
                {/* Left Adders */}
                <div className="flex-1 space-y-2 border-r border-gray-100 pr-4">
                  <p className="text-center text-sm font-bold text-blue-500 bg-blue-50 py-1 rounded-md mb-2">Left Pan</p>
                  {WEIGHTS.map(w => (
                    <button key={`add-l-${w.id}`} 
                      onClick={() => addToPan("left", w)}
                      disabled={leftPan.length >= MAX_ITEMS_PER_SIDE}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-200 active:scale-95 disabled:opacity-50 transition-all font-semibold"
                    >
                      <span className="text-xl">{w.emoji}</span>
                      <span className="text-gray-500 text-xs text-right">Add</span>
                    </button>
                  ))}
                </div>

                {/* Right Adders */}
                <div className="flex-1 space-y-2 pl-4">
                  <p className="text-center text-sm font-bold text-red-500 bg-red-50 py-1 rounded-md mb-2">Right Pan</p>
                  {WEIGHTS.map(w => (
                    <button key={`add-r-${w.id}`} 
                      onClick={() => addToPan("right", w)}
                      disabled={rightPan.length >= MAX_ITEMS_PER_SIDE}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-gray-200 hover:bg-red-50 hover:border-red-200 active:scale-95 disabled:opacity-50 transition-all font-semibold"
                    >
                      <span className="text-xl">{w.emoji}</span>
                      <span className="text-gray-500 text-xs text-right">Add</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quiz Panel */}
            <div className="bg-white rounded-2xl shadow-lg p-5 flex-1 flex flex-col justify-center text-center">
              {mode === "explore" ? (
                <div className="py-2">
                  <p className="text-5xl mb-3">🤔</p>
                  <button onClick={startQuiz} className="w-full h-14 rounded-xl bg-purple-500 text-white font-bold text-lg hover:bg-purple-600 shadow-md active:scale-95 transition-all">
                    🎯 Give me a puzzle!
                  </button>
                </div>
              ) : (
                <div className="flex flex-col h-full space-y-3">
                  <p className="text-xs font-bold text-purple-500 uppercase tracking-wide">Your Goal</p>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 my-2">
                    <p className="text-lg font-black text-purple-900">
                      {quizTask.type === "equal" && "Make both sides EQUAL! ⚖️"}
                      {quizTask.type === "left_heavy" && "Make the LEFT pan HEAVIER! 👈"}
                      {quizTask.type === "right_heavy" && "Make the RIGHT pan HEAVIER! 👉"}
                    </p>
                    <p className="text-sm text-purple-700 mt-1">Add items to finish the job!</p>
                  </div>

                  {feedback && (
                    <div className={`p-3 rounded-xl font-bold text-sm ${feedback === "correct" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                      {feedback === "correct" ? "🎉 Wonderful! You solved it!" : "❌ Not quite! Look at the scale..."}
                    </div>
                  )}

                  <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                    <button onClick={() => { setMode("explore"); setFeedback(null); clearPans(); }} className="h-12 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold hover:bg-gray-100 transition-colors">
                      End Quiz
                    </button>
                    {feedback === "correct" ? (
                      <button onClick={startQuiz} className="h-12 rounded-xl bg-purple-500 text-white text-sm font-bold hover:bg-purple-600 transition-colors shadow-sm">
                        Next Problem ➡️
                      </button>
                    ) : (
                       <button onClick={checkQuizAnswer} disabled={leftWeight===0 && rightWeight===0} className="h-12 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 shadow-sm transition-colors disabled:opacity-50">
                        ✅ Check Answer
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* ── EDUCATIONAL FOOTER ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">📘 Learning Benefits</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Teaches comparative concepts: heavier, lighter, equal</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Visualizes basic algebra and balancing equations</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Connects physical object weight to numerical values</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Develops problem-solving and critical thinking skills</li>
          </ul>
        </div>
        
        <button onClick={fullReset} className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-xs font-semibold hover:bg-gray-100 transition-colors">
          🔄 Reset Score
        </button>

      </div>
    </div>
  );
}
