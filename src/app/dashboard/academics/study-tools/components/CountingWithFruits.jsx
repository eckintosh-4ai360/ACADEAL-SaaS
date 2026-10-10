import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FRUITS = [
  { id: "apple",      emoji: "🍎", name: "Apple",      color: "#FF6B6B" },
  { id: "banana",     emoji: "🍌", name: "Banana",     color: "#FFD93D" },
  { id: "mango",      emoji: "🥭", name: "Mango",      color: "#FF9F43" },
  { id: "orange",     emoji: "🍊", name: "Orange",     color: "#FF6B35" },
  { id: "watermelon", emoji: "🍉", name: "Watermelon", color: "#6BCB77" },
  { id: "grapes",     emoji: "🍇", name: "Grapes",     color: "#9B5DE5" },
  { id: "strawberry", emoji: "🍓", name: "Strawberry", color: "#FF6B6B" },
  { id: "pineapple",  emoji: "🍍", name: "Pineapple",  color: "#FFD93D" },
  { id: "coconut",    emoji: "🥥", name: "Coconut",    color: "#6BCB77" },
  { id: "lemon",      emoji: "🍋", name: "Lemon",      color: "#FFE234" },
];

const NUMBER_WORDS = ["Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten"];

// SVG grid positions for up to 10 fruits (2 rows of 5)
function getFruitPositions(count) {
  const cols = Math.min(count, 5);
  const rows = Math.ceil(count / 5);
  const positions = [];
  for (let i = 0; i < count; i++) {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const xStart = rows === 1 ? (250 - cols * 44) / 2 + 22 : 44;
    positions.push({
      x: xStart + col * 44,
      y: rows === 1 ? 90 : 60 + row * 80,
    });
  }
  return positions;
}

// ─── Fruit SVG Grid ───────────────────────────────────────────────────────────

function FruitGrid({ fruit, count, popIndex }) {
  const positions = getFruitPositions(count);
  return (
    <svg viewBox="0 0 250 180" className="w-full h-full" style={{ maxHeight: 180 }}>
      {/* Background plate */}
      <ellipse cx="125" cy="165" rx="105" ry="12" fill={fruit.color + "33"} />

      {positions.map((pos, i) => (
        <text
          key={i}
          x={pos.x}
          y={pos.y}
          textAnchor="middle"
          fontSize={i === popIndex ? "34" : "28"}
          style={{ transition: "font-size 0.25s ease, opacity 0.3s" }}
          opacity="1"
        >
          {fruit.emoji}
        </text>
      ))}

      {/* Count badge */}
      <circle cx="125" cy="155" r="18" fill={fruit.color} />
      <text x="125" y="161" textAnchor="middle" fontSize="18" fontWeight="900" fill="white" fontFamily="Arial">
        {count}
      </text>
    </svg>
  );
}

// ─── Number Line SVG ─────────────────────────────────────────────────────────

function NumberLine({ count }) {
  return (
    <svg viewBox="0 0 280 50" className="w-full" style={{ height: 50 }}>
      <line x1="10" y1="25" x2="270" y2="25" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
      {[...Array(11)].map((_, n) => {
        const x = 10 + n * 26;
        const active = n <= count;
        return (
          <g key={n}>
            <circle cx={x} cy={25} r={n === count ? 11 : 8}
              fill={active ? (n === count ? FRUITS[Math.max(0,count-1)]?.color || "#4D96FF" : "#dbeafe") : "#f1f5f9"}
              stroke={active ? (FRUITS[Math.max(0,count-1)]?.color || "#4D96FF") : "#e2e8f0"}
              strokeWidth="2"
              style={{ transition: "all 0.3s" }}
            />
            <text x={x} y={29} textAnchor="middle" fontSize={n === count ? "9" : "8"}
              fontWeight={n === count ? "900" : "600"}
              fill={active ? (n === count ? "white" : "#3b82f6") : "#94a3b8"}
              fontFamily="Arial"
            >
              {n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CountingWithFruits() {
  const [selectedFruit, setSelectedFruit] = useState(FRUITS[0]);
  const [count, setCount]                 = useState(0);
  const [popIndex, setPopIndex]           = useState(null);
  const [quizTarget, setQuizTarget]       = useState(null);
  const [quizAnswer, setQuizAnswer]       = useState(null);
  const [feedback, setFeedback]           = useState(null);
  const [score, setScore]                 = useState(0);
  const [attempts, setAttempts]           = useState(0);

  // Generate a new quiz round
  const newQuiz = useCallback(() => {
    const target = Math.floor(Math.random() * 9) + 2;   // 2–10
    setQuizTarget(target);
    setCount(0);
    setQuizAnswer(null);
    setFeedback(null);
    // Pick a random fruit
    setSelectedFruit(FRUITS[Math.floor(Math.random() * FRUITS.length)]);
  }, []);

  // Add one fruit
  const addFruit = useCallback(() => {
    if (count >= 10) return;
    const next = count + 1;
    setCount(next);
    setPopIndex(count);          // newest item pops
    setTimeout(() => setPopIndex(null), 300);
    setFeedback(null);
  }, [count]);

  // Remove one fruit
  const removeFruit = useCallback(() => {
    if (count === 0) return;
    setCount(c => c - 1);
    setFeedback(null);
  }, [count]);

  const checkAnswer = useCallback(() => {
    if (quizTarget === null) return;
    setAttempts(a => a + 1);
    if (count === quizTarget) {
      setScore(s => s + 1);
      setFeedback("correct");
    } else {
      setFeedback("wrong");
    }
  }, [count, quizTarget]);

  const reset = useCallback(() => {
    setCount(0);
    setFeedback(null);
    setQuizTarget(null);
    setQuizAnswer(null);
  }, []);

  const fullReset = useCallback(() => {
    reset();
    setScore(0);
    setAttempts(0);
  }, [reset]);

  const isFreePlay = quizTarget === null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-green-50 to-blue-50 p-3 sm:p-6 font-sans">
      {/* ── BACK BUTTON ── */}
      <div className="max-w-2xl mx-auto mb-4">
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">

        {/* ── HEADER ── */}
        <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <span className="text-5xl">🍎</span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">Nursery</span>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">⏱ 6 min</span>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-600 border border-yellow-100">🔢 Numeracy / Math</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-800">Counting with Fruits</h1>
            <p className="text-sm text-gray-500 mt-0.5">Tap fruits to count from 1 to 10!</p>
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
        <div className="bg-yellow-100 border border-yellow-300 rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-bold text-yellow-800 mb-1">👋 How to Play</p>
          <ul className="text-sm text-yellow-900 space-y-1">
            <li>🍎 Press the <strong>big + button</strong> to add a fruit and count along!</li>
            <li>🎯 Press <strong>"Give Me a Challenge!"</strong> and count to the right number.</li>
            <li>✅ When you&apos;re ready, press <strong>Check My Answer</strong>.</li>
          </ul>
        </div>

        {/* ── FRUIT PICKER ── */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Choose your fruit</p>
          <div className="flex flex-wrap gap-2">
            {FRUITS.map(f => (
              <button
                key={f.id}
                onClick={() => { setSelectedFruit(f); setCount(0); setFeedback(null); }}
                style={selectedFruit.id === f.id ? { backgroundColor: f.color, boxShadow: `0 0 0 3px ${f.color}55` } : {}}
                className={`text-2xl h-12 w-12 rounded-xl border-2 transition-all duration-200 hover:scale-110 active:scale-95 ${
                  selectedFruit.id === f.id ? "border-transparent scale-110" : "border-gray-200 bg-gray-50"
                }`}
              >
                {f.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* ── LIVE VISUAL ── */}
        <div className="bg-white rounded-2xl shadow-lg p-5">
          {/* Quiz target banner */}
          {quizTarget !== null && (
            <div
              className="mb-3 p-3 rounded-xl text-center text-sm font-bold"
              style={{ backgroundColor: selectedFruit.color + "22", color: selectedFruit.color }}
            >
              🎯 Count <span className="text-3xl font-black">{quizTarget}</span> {selectedFruit.name}s!
              {" "}({NUMBER_WORDS[quizTarget]})
            </div>
          )}

          {/* Big count display */}
          <div className="text-center mb-2">
            <span
              className="text-7xl font-black transition-all duration-300"
              style={{ color: selectedFruit.color }}
            >
              {count}
            </span>
            <p className="text-base font-semibold text-gray-400 mt-1">{NUMBER_WORDS[count]}</p>
          </div>

          {/* SVG fruit grid */}
          <div className="h-44 mx-auto" style={{ maxWidth: 280 }}>
            {count > 0 ? (
              <FruitGrid fruit={selectedFruit} count={count} popIndex={popIndex} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300 text-sm italic">
                Press + to add {selectedFruit.name}s
              </div>
            )}
          </div>

          {/* Number line */}
          <div className="mt-3 px-2">
            <NumberLine count={count} />
          </div>

          {/* +/- controls */}
          <div className="flex items-center justify-center gap-4 mt-5">
            <button
              onClick={removeFruit}
              disabled={count === 0}
              className="w-16 h-16 rounded-full border-2 border-gray-200 bg-gray-50 text-3xl font-black text-gray-500 hover:bg-gray-100 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-sm"
            >
              −
            </button>

            <button
              onClick={addFruit}
              disabled={count >= (quizTarget ?? 10)}
              style={{ backgroundColor: count < (quizTarget ?? 10) ? selectedFruit.color : "#d1d5db" }}
              className="w-24 h-24 rounded-full text-5xl text-white font-black shadow-lg hover:opacity-90 transition-all duration-150 disabled:cursor-not-allowed active:scale-95"
            >
              +
            </button>

            <button
              onClick={reset}
              className="w-16 h-16 rounded-full border-2 border-gray-200 bg-gray-50 text-xl text-gray-500 hover:bg-gray-100 transition-all duration-150 active:scale-95 shadow-sm"
            >
              🔄
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            {count >= 10 ? "That's 10! Great counting! 🎉" : `${(quizTarget ?? 10) - count} more to go`}
          </p>
        </div>

        {/* ── FEEDBACK / QUIZ PANEL ── */}
        <div className="bg-white rounded-2xl shadow-lg p-5 space-y-3">
          {isFreePlay ? (
            <button
              onClick={newQuiz}
              className="w-full h-14 rounded-xl font-bold text-white text-base transition-all duration-200 hover:opacity-90 active:scale-95 shadow-md"
              style={{ backgroundColor: selectedFruit.color }}
            >
              🎯 Give Me a Challenge!
            </button>
          ) : (
            <>
              <button
                onClick={checkAnswer}
                className="w-full h-14 rounded-xl bg-green-500 text-white font-bold text-base hover:bg-green-600 transition-colors active:scale-95 shadow-md"
              >
                ✅ Check My Answer
              </button>

              {feedback && (
                <div className={`p-4 rounded-xl text-center font-semibold ${feedback === "correct" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  {feedback === "correct" ? (
                    <><span className="text-3xl">🎉</span><br />
                    Correct! You counted <strong>{quizTarget}</strong> {selectedFruit.name}s! That&apos;s <strong>{NUMBER_WORDS[quizTarget]}</strong>!</>
                  ) : (
                    <><span className="text-2xl">🤔</span><br />
                    You have <strong>{count}</strong> but we need <strong>{quizTarget}</strong>. {count < quizTarget ? "Add more!" : "Remove some!"}</>
                  )}
                </div>
              )}

              {feedback === "correct" && (
                <button
                  onClick={newQuiz}
                  className="w-full h-12 rounded-xl font-bold text-white text-sm active:scale-95 hover:opacity-90"
                  style={{ backgroundColor: selectedFruit.color }}
                >
                  🎯 Next Challenge!
                </button>
              )}

              <button
                onClick={reset}
                className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold hover:bg-gray-100 transition-colors"
              >
                ← Back to Free Play
              </button>
            </>
          )}
        </div>

        {/* ── EDUCATIONAL FOOTER ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">📘 Learning Benefits</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Builds one-to-one correspondence between objects and numbers</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Introduces number words 1–10 in English (One, Two…)</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Number line builds early understanding of quantity order</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Uses familiar Ghanaian fruits to make learning contextual</li>
          </ul>
        </div>

        <button
          onClick={fullReset}
          className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-xs font-semibold hover:bg-gray-100 transition-colors"
        >
          🔄 Start Over (reset score)
        </button>

      </div>
    </div>
  );
}
