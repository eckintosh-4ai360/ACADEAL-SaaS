import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// ─── Colour data ─────────────────────────────────────────────────────────────

const PRIMARY_COLOURS = [
  { id: "red",    name: "Red",    hex: "#FF6B6B", emoji: "🪣" },
  { id: "yellow", name: "Yellow", hex: "#FFD93D", emoji: "🪣" },
  { id: "blue",   name: "Blue",   hex: "#4D96FF", emoji: "🪣" },
];

const MIX_RESULTS = {
  "red+yellow":    { name: "Orange",  hex: "#FF9F43", emoji: "🟠", fact: "Red + Yellow = Orange, like a mango!" },
  "yellow+red":    { name: "Orange",  hex: "#FF9F43", emoji: "🟠", fact: "Red + Yellow = Orange, like a mango!" },
  "red+blue":      { name: "Purple",  hex: "#9B5DE5", emoji: "🟣", fact: "Red + Blue = Purple, like an aubergine!" },
  "blue+red":      { name: "Purple",  hex: "#9B5DE5", emoji: "🟣", fact: "Red + Blue = Purple, like an aubergine!" },
  "yellow+blue":   { name: "Green",   hex: "#6BCB77", emoji: "🟢", fact: "Yellow + Blue = Green, like fresh leaves!" },
  "blue+yellow":   { name: "Green",   hex: "#6BCB77", emoji: "🟢", fact: "Yellow + Blue = Green, like fresh leaves!" },
  "red+red":       { name: "Dark Red",   hex: "#C0392B", emoji: "🔴", fact: "Same colour mixed together makes it deeper!" },
  "yellow+yellow": { name: "Bright Yellow", hex: "#F4D03F", emoji: "🟡", fact: "Same colour mixed together makes it richer!" },
  "blue+blue":     { name: "Deep Blue",  hex: "#1A73E8", emoji: "🔵", fact: "Same colour mixed together makes it deeper!" },
};

// All secondary colours for the quiz
const QUIZ_OPTIONS = ["Orange", "Purple", "Green", "Red", "Yellow", "Blue"];

// ─── SVG Mixing Visual ───────────────────────────────────────────────────────

function MixingBowlSVG({ colour1, colour2, result, isPulsing }) {
  const c1 = colour1 ? colour1.hex : "#e2e8f0";
  const c2 = colour2 ? colour2.hex : "#e2e8f0";
  const rHex = result ? result.hex : "#f8fafc";

  return (
    <svg viewBox="0 0 300 220" className="w-full h-full" style={{ maxHeight: 220 }}>
      {/* ── Colour 1 bucket ── */}
      <g>
        <ellipse cx="60" cy="50" rx="35" ry="15" fill={c1} opacity="0.3" />
        <rect x="25" y="50" width="70" height="65" rx="8" fill={c1} />
        <ellipse cx="60" cy="50" rx="35" ry="15" fill={c1} />
        {colour1 && (
          <text x="60" y="88" textAnchor="middle" fontSize="11" fontWeight="700" fill="white" fontFamily="Arial">
            {colour1.name}
          </text>
        )}
        {/* Handle */}
        <path d="M 25 65 Q 10 65 10 80 Q 10 95 25 95" stroke={c1} strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>

      {/* ── Colour 2 bucket ── */}
      <g>
        <ellipse cx="240" cy="50" rx="35" ry="15" fill={c2} opacity="0.3" />
        <rect x="205" y="50" width="70" height="65" rx="8" fill={c2} />
        <ellipse cx="240" cy="50" rx="35" ry="15" fill={c2} />
        {colour2 && (
          <text x="240" y="88" textAnchor="middle" fontSize="11" fontWeight="700" fill="white" fontFamily="Arial">
            {colour2.name}
          </text>
        )}
        {/* Handle */}
        <path d="M 275 65 Q 290 65 290 80 Q 290 95 275 95" stroke={c2} strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>

      {/* ── Drip arrows when both chosen ── */}
      {colour1 && colour2 && (
        <>
          <path d="M 80 115 Q 130 130 145 145" stroke={c1} strokeWidth="3" fill="none" strokeDasharray="5,3" markerEnd="url(#arr)" />
          <path d="M 220 115 Q 170 130 155 145" stroke={c2} strokeWidth="3" fill="none" strokeDasharray="5,3" markerEnd="url(#arr2)" />
          <defs>
            <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={c1} />
            </marker>
            <marker id="arr2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={c2} />
            </marker>
          </defs>
        </>
      )}

      {/* ── Mixing bowl ── */}
      <ellipse cx="150" cy="152" rx="55" ry="20" fill="#dbeafe" />
      <path d="M 95 152 Q 95 205 150 205 Q 205 205 205 152 Z" fill={rHex} className={isPulsing ? "transition-all duration-700" : "transition-all duration-500"} />
      <ellipse cx="150" cy="152" rx="55" ry="20" fill={rHex} stroke="#93c5fd" strokeWidth="2" className="transition-all duration-500" />

      {/* Bowl label */}
      {result && (
        <text x="150" y="186" textAnchor="middle" fontSize="13" fontWeight="800" fill="white" fontFamily="Arial" stroke="#0005" strokeWidth="3" paintOrder="stroke">
          {result.name}
        </text>
      )}
      {!colour1 && !colour2 && (
        <text x="150" y="187" textAnchor="middle" fontSize="11" fill="#94a3b8" fontFamily="Arial">
          mixing bowl
        </text>
      )}

      {/* Plus sign between buckets */}
      {colour1 && !colour2 && (
        <text x="150" y="90" textAnchor="middle" fontSize="28" fill="#cbd5e1">+?</text>
      )}
      {colour1 && colour2 && (
        <text x="150" y="90" textAnchor="middle" fontSize="22" fill="#94a3b8">+</text>
      )}
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ColourMixingExplorer() {
  const [colour1, setColour1] = useState(null);
  const [colour2, setColour2] = useState(null);
  const [score, setScore]     = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState(null); // null | "correct" | "wrong"
  const [quizAnswer, setQuizAnswer] = useState("");
  const [isPulsing, setIsPulsing]   = useState(false);
  const [history, setHistory]       = useState([]); // [{label, hex}]

  const mixKey = colour1 && colour2 ? `${colour1.id}+${colour2.id}` : null;
  const result = mixKey ? MIX_RESULTS[mixKey] || null : null;

  // Trigger pulse animation when result changes
  useEffect(() => {
    if (result) {
      setIsPulsing(true);
      setFeedback(null);
      setQuizAnswer("");
      const t = setTimeout(() => setIsPulsing(false), 700);
      return () => clearTimeout(t);
    }
  }, [mixKey]);

  const pickColour = useCallback((colour, slot) => {
    if (slot === 1) setColour1(colour);
    else setColour2(colour);
    setFeedback(null);
    setQuizAnswer("");
  }, []);

  const checkAnswer = useCallback(() => {
    if (!result || !quizAnswer) return;
    setAttempts(a => a + 1);
    if (quizAnswer === result.name) {
      setScore(s => s + 1);
      setFeedback("correct");
      // add to history
      setHistory(h => [...h.slice(-4), { label: `${colour1.name} + ${colour2.name}`, name: result.name, hex: result.hex }]);
    } else {
      setFeedback("wrong");
    }
  }, [result, quizAnswer, colour1, colour2]);

  const reset = useCallback(() => {
    setColour1(null);
    setColour2(null);
    setFeedback(null);
    setQuizAnswer("");
  }, []);

  const fullReset = useCallback(() => {
    reset();
    setScore(0);
    setAttempts(0);
    setHistory([]);
  }, [reset]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-yellow-50 to-green-50 p-3 sm:p-6 font-sans">
      {/* ── BACK BUTTON ── */}
      <div className="max-w-3xl mx-auto mb-4">
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
      </div>

      <div className="max-w-3xl mx-auto space-y-4">

        {/* ── HEADER ── */}
        <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <span className="text-5xl">🎨</span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">Nursery</span>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-pink-50 text-pink-600 border border-pink-100">⏱ 7 min</span>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-600 border border-purple-100">🎨 Creative Arts</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-800">Colour Mixing Explorer</h1>
            <p className="text-sm text-gray-500 mt-0.5">Mix two colours and discover what you get!</p>
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
            <li>🖱️ <strong>Pick Colour 1</strong> from the big coloured buttons, then <strong>pick Colour 2</strong>.</li>
            <li>🎨 Watch the mixing bowl fill with the <strong>new colour!</strong></li>
            <li>✏️ Guess the colour's name and press <strong>Check My Answer</strong>.</li>
          </ul>
        </div>

        {/* ── CONTROL ZONE ── */}
        <div className="bg-white rounded-2xl shadow-lg p-5 space-y-5">
          {/* Colour pickers */}
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map(slot => {
              const selected = slot === 1 ? colour1 : colour2;
              return (
                <div key={slot}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                    {slot === 1 ? "🪣 Colour 1" : "🪣 Colour 2"}
                  </p>
                  <div className="flex flex-col gap-2">
                    {PRIMARY_COLOURS.map(c => (
                      <button
                        key={c.id}
                        onClick={() => pickColour(c, slot)}
                        style={{
                          backgroundColor: c.hex,
                          boxShadow: selected?.id === c.id ? `0 0 0 3px white, 0 0 0 5px ${c.hex}` : undefined,
                        }}
                        className={`h-12 rounded-xl text-white font-bold text-base transition-all duration-200 hover:scale-105 active:scale-95 ${selected?.id === c.id ? "ring-2 ring-offset-2 scale-105" : ""}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reset mix */}
          <button
            onClick={reset}
            className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            🔄 Clear Mix
          </button>
        </div>

        {/* ── LIVE VISUAL ── */}
        <div className={`bg-white rounded-2xl shadow-lg p-5 transition-all duration-300 ${isPulsing ? "ring-4 ring-yellow-300" : ""}`}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">🖌️ Mixing Bowl</p>
          <div className="h-52">
            <MixingBowlSVG colour1={colour1} colour2={colour2} result={result} isPulsing={isPulsing} />
          </div>
          {result && (
            <div
              className="mt-3 p-3 rounded-xl text-center text-sm font-semibold transition-all duration-300"
              style={{ backgroundColor: result.hex + "22", color: result.hex }}
            >
              {result.emoji} {result.fact}
            </div>
          )}
        </div>

        {/* ── QUIZ PANEL ── */}
        {result && (
          <div className="bg-white rounded-2xl shadow-lg p-5 space-y-3">
            <p className="text-sm font-bold text-gray-700">
              🤔 What colour did you make?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {QUIZ_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => { setQuizAnswer(opt); setFeedback(null); }}
                  className={`h-11 rounded-xl border-2 text-sm font-bold transition-all duration-150 hover:scale-105 active:scale-95 ${
                    quizAnswer === opt
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "bg-gray-50 border-gray-200 text-gray-700"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <button
              onClick={checkAnswer}
              disabled={!quizAnswer}
              className="w-full h-11 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ✅ Check My Answer
            </button>

            {feedback && (
              <div className={`p-3 rounded-xl text-center text-sm font-semibold ${feedback === "correct" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {feedback === "correct"
                  ? `✅ Correct! ${colour1.name} + ${colour2.name} = ${result.name}! ${result.emoji}`
                  : `❌ Not quite! Hint: Think of a ${result.name.toLowerCase()} fruit or vegetable.`}
              </div>
            )}

            {feedback === "correct" && (
              <button
                onClick={reset}
                className="w-full h-10 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 transition-colors"
              >
                🎨 Mix Again!
              </button>
            )}
          </div>
        )}

        {/* ── COMBINATIONS HISTORY ── */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">🏆 Colours You've Discovered</p>
            <div className="flex flex-wrap gap-2">
              {history.map((h, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-700">
                  <span className="w-4 h-4 rounded-full inline-block shrink-0" style={{ backgroundColor: h.hex }} />
                  {h.label} → {h.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── EDUCATIONAL FOOTER ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">📘 Learning Benefits</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Introduces the three primary colours and their names</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Builds early understanding of secondary colour creation</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Encourages prediction and hypothesis ("What will I get?")</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Connects colours to real-world objects and fruits in Ghana</li>
          </ul>
        </div>

        {/* Full reset */}
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
