import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// ─── Body part data ───────────────────────────────────────────────────────────

const BODY_PARTS = [
  { id: "head",         name: "Head",         emoji: "🧠", color: "#FF6B6B", fact: "Your head holds your brain, eyes, ears, nose and mouth!",    cx: 125, cy: 52,  r: 32 },
  { id: "eyes",         name: "Eyes",          emoji: "👁️", color: "#4D96FF", fact: "You have TWO eyes to help you see everything around you!",    cx: 125, cy: 46,  r: 14 },
  { id: "nose",         name: "Nose",          emoji: "👃", color: "#FF9F43", fact: "Your nose has two holes called nostrils to help you breathe!", cx: 125, cy: 54,  r: 10 },
  { id: "mouth",        name: "Mouth",         emoji: "👄", color: "#FF6B6B", fact: "Your mouth has teeth and a tongue to help you eat and talk!",  cx: 125, cy: 63,  r: 10 },
  { id: "ears",         name: "Ears",          emoji: "👂", color: "#FFD93D", fact: "You have two ears — one on each side of your head to hear!",   cx: 92,  cy: 52,  r: 10 },
  { id: "neck",         name: "Neck",          emoji: "🦒", color: "#6BCB77", fact: "Your neck connects your head to your body and lets you turn!",  cx: 125, cy: 95,  r: 10 },
  { id: "shoulders",    name: "Shoulders",     emoji: "💪", color: "#9B5DE5", fact: "Shoulders connect your arms to your body — you have two!",     cx: 125, cy: 115, r: 14 },
  { id: "chest",        name: "Chest",         emoji: "❤️", color: "#FF6B6B", fact: "Inside your chest is your heart and lungs — very important!",  cx: 125, cy: 135, r: 16 },
  { id: "tummy",        name: "Tummy",         emoji: "🫃", color: "#FFD93D", fact: "Your tummy (stomach) helps digest the food you eat!",            cx: 125, cy: 160, r: 16 },
  { id: "hands",        name: "Hands",         emoji: "🖐️", color: "#4D96FF", fact: "You have two hands with 5 fingers each — that's 10 fingers!",  cx: 125, cy: 160, r: 12 },
  { id: "arms",         name: "Arms",          emoji: "💪", color: "#6BCB77", fact: "Your two arms have an elbow in the middle that helps you bend!", cx: 80,  cy: 145, r: 12 },
  { id: "legs",         name: "Legs",          emoji: "🦵", color: "#FF9F43", fact: "Your two legs have a knee in the middle to help you walk!",     cx: 112, cy: 205, r: 14 },
  { id: "feet",         name: "Feet",          emoji: "🦶", color: "#9B5DE5", fact: "You have two feet with 5 toes each — perfect for running!",    cx: 112, cy: 235, r: 12 },
  { id: "knees",        name: "Knees",         emoji: "🦵", color: "#6BCB77", fact: "Your knees are the joints in the middle of your legs!",         cx: 112, cy: 218, r: 10 },
  { id: "hair",         name: "Hair",          emoji: "💇", color: "#FF9F43", fact: "Hair grows on top of your head and protects it from the sun!",  cx: 125, cy: 22,  r: 16 },
];

// Selectable quiz parts (same as main but only the most visible ones for kids)
const QUIZ_PARTS = BODY_PARTS.filter(b =>
  ["head","eyes","nose","mouth","ears","shoulders","chest","tummy","arms","legs","feet","hair"].includes(b.id)
);

// ─── SVG Body Figure ─────────────────────────────────────────────────────────

function BodyFigureSVG({ activePart, hoveredPart, onClickPart, quizTarget }) {
  const highlightId = quizTarget ?? activePart?.id ?? null;

  const isGlow = (id) => id === highlightId;
  const partColor = (id) => {
    const p = BODY_PARTS.find(b => b.id === id);
    return p ? p.color : "#94a3b8";
  };

  return (
    <svg viewBox="0 0 250 270" className="w-full h-full select-none" style={{ maxHeight: 270 }}>
      {/* ── Static body shapes ── */}
      {/* Hair */}
      <ellipse cx="125" cy="24" rx="33" ry="18" fill={isGlow("hair") ? partColor("hair") : "#FBBF24"} opacity={isGlow("hair") ? 1 : 0.85} className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("hair")} />

      {/* Head */}
      <ellipse cx="125" cy="54" rx="30" ry="32" fill={isGlow("head") ? partColor("head") : "#FBBF2480"} stroke={isGlow("head") ? partColor("head") : "#F59E0B"} strokeWidth={isGlow("head") ? "3" : "2"} className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("head")} />

      {/* Eyes */}
      <g className="cursor-pointer" onClick={() => onClickPart("eyes")}>
        <circle cx="113" cy="47" r="5" fill={isGlow("eyes") ? "#4D96FF" : "white"} stroke="#4D96FF" strokeWidth="2" className="transition-all duration-300" />
        <circle cx="137" cy="47" r="5" fill={isGlow("eyes") ? "#4D96FF" : "white"} stroke="#4D96FF" strokeWidth="2" className="transition-all duration-300" />
        <circle cx="114" cy="47" r="2" fill="#1e293b" />
        <circle cx="138" cy="47" r="2" fill="#1e293b" />
      </g>

      {/* Nose */}
      <ellipse cx="125" cy="55" rx="4" ry="5" fill={isGlow("nose") ? partColor("nose") : "#FED7AA"} stroke={isGlow("nose") ? partColor("nose") : "#F97316"} strokeWidth="1.5" className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("nose")} />

      {/* Mouth */}
      <path d="M 115 64 Q 125 72 135 64" stroke={isGlow("mouth") ? partColor("mouth") : "#EF4444"} strokeWidth="2.5" fill="none" strokeLinecap="round" className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("mouth")} />

      {/* Left ear */}
      <ellipse cx="94" cy="53" rx="7" ry="10" fill={isGlow("ears") ? partColor("ears") : "#FBBF2480"} stroke={isGlow("ears") ? partColor("ears") : "#F59E0B"} strokeWidth={isGlow("ears") ? "3" : "1.5"} className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("ears")} />
      {/* Right ear */}
      <ellipse cx="156" cy="53" rx="7" ry="10" fill={isGlow("ears") ? partColor("ears") : "#FBBF2480"} stroke={isGlow("ears") ? partColor("ears") : "#F59E0B"} strokeWidth={isGlow("ears") ? "3" : "1.5"} className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("ears")} />

      {/* Neck */}
      <rect x="117" y="84" width="16" height="20" rx="4" fill={isGlow("neck") ? partColor("neck") : "#FBBF2480"} stroke={isGlow("neck") ? partColor("neck") : "#F59E0B"} strokeWidth={isGlow("neck") ? "2" : "1"} className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("neck")} />

      {/* Body torso */}
      <rect x="95" y="103" width="60" height="70" rx="12" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="2" />

      {/* Shoulders overlay */}
      <rect x="88" y="100" width="74" height="22" rx="10" fill={isGlow("shoulders") ? partColor("shoulders") : "#C4B5FD"} stroke={isGlow("shoulders") ? partColor("shoulders") : "#8B5CF6"} strokeWidth={isGlow("shoulders") ? "3" : "1.5"} className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("shoulders")} />

      {/* Chest */}
      <ellipse cx="125" cy="128" rx="22" ry="18" fill={isGlow("chest") ? partColor("chest") : "#FEE2E280"} stroke={isGlow("chest") ? partColor("chest") : "#F87171"} strokeWidth={isGlow("chest") ? "3" : "1.5"} className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("chest")} />
      {/* Heart icon */}
      <text x="125" y="133" textAnchor="middle" fontSize="14">❤️</text>

      {/* Tummy */}
      <ellipse cx="125" cy="155" rx="18" ry="14" fill={isGlow("tummy") ? partColor("tummy") : "#FEF3C780"} stroke={isGlow("tummy") ? partColor("tummy") : "#F59E0B"} strokeWidth={isGlow("tummy") ? "3" : "1.5"} className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("tummy")} />
      {/* Belly button */}
      <circle cx="125" cy="159" r="2.5" fill="#F59E0B" opacity="0.7" />

      {/* Left arm */}
      <path d="M 95 110 Q 68 120 60 150" stroke={isGlow("arms") ? partColor("arms") : "#93C5FD"} strokeWidth={isGlow("arms") ? "16" : "13"} strokeLinecap="round" fill="none" className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("arms")} />
      {/* Right arm */}
      <path d="M 155 110 Q 182 120 190 150" stroke={isGlow("arms") ? partColor("arms") : "#93C5FD"} strokeWidth={isGlow("arms") ? "16" : "13"} strokeLinecap="round" fill="none" className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("arms")} />

      {/* Left hand */}
      <circle cx="57" cy="155" r="10" fill={isGlow("hands") ? partColor("hands") : "#FBBF24"} stroke={isGlow("hands") ? partColor("hands") : "#F59E0B"} strokeWidth={isGlow("hands") ? "3" : "1.5"} className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("hands")} />
      {/* Right hand */}
      <circle cx="193" cy="155" r="10" fill={isGlow("hands") ? partColor("hands") : "#FBBF24"} stroke={isGlow("hands") ? partColor("hands") : "#F59E0B"} strokeWidth={isGlow("hands") ? "3" : "1.5"} className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("hands")} />

      {/* Left leg */}
      <path d="M 110 172 L 100 220" stroke={isGlow("legs") ? partColor("legs") : "#93C5FD"} strokeWidth={isGlow("legs") ? "18" : "15"} strokeLinecap="round" fill="none" className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("legs")} />
      {/* Right leg */}
      <path d="M 140 172 L 150 220" stroke={isGlow("legs") ? partColor("legs") : "#93C5FD"} strokeWidth={isGlow("legs") ? "18" : "15"} strokeLinecap="round" fill="none" className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("legs")} />

      {/* Knees */}
      <circle cx="103" cy="205" r="8" fill={isGlow("knees") ? partColor("knees") : "#BFDBFE"} stroke={isGlow("knees") ? partColor("knees") : "#60A5FA"} strokeWidth={isGlow("knees") ? "3" : "1.5"} className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("knees")} />
      <circle cx="147" cy="205" r="8" fill={isGlow("knees") ? partColor("knees") : "#BFDBFE"} stroke={isGlow("knees") ? partColor("knees") : "#60A5FA"} strokeWidth={isGlow("knees") ? "3" : "1.5"} className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("knees")} />

      {/* Left foot */}
      <ellipse cx="97" cy="231" rx="14" ry="8" fill={isGlow("feet") ? partColor("feet") : "#FBBF24"} stroke={isGlow("feet") ? partColor("feet") : "#F59E0B"} strokeWidth={isGlow("feet") ? "3" : "1.5"} className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("feet")} />
      {/* Right foot */}
      <ellipse cx="153" cy="231" rx="14" ry="8" fill={isGlow("feet") ? partColor("feet") : "#FBBF24"} stroke={isGlow("feet") ? partColor("feet") : "#F59E0B"} strokeWidth={isGlow("feet") ? "3" : "1.5"} className="transition-all duration-300 cursor-pointer" onClick={() => onClickPart("feet")} />

      {/* Pulse ring on highlighted part */}
      {highlightId && (() => {
        const p = BODY_PARTS.find(b => b.id === highlightId);
        if (!p) return null;
        return (
          <circle cx={p.cx} cy={p.cy} r={(p.r || 14) + 8} fill="none"
            stroke={p.color} strokeWidth="2.5" opacity="0.5"
            style={{ animation: "pulse 1.2s infinite" }}
          />
        );
      })()}

      <style>{`@keyframes pulse { 0%,100%{opacity:.5;r:22px} 50%{opacity:.15;r:28px} }`}</style>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MyBodyPartsPuzzle() {
  const [activePart, setActivePart] = useState(null);
  const [mode, setMode]             = useState("explore");   // "explore" | "quiz"
  const [quizPart, setQuizPart]     = useState(null);
  const [feedback, setFeedback]     = useState(null);        // null | "correct" | "wrong"
  const [wrongGuess, setWrongGuess] = useState(null);
  const [score, setScore]           = useState(0);
  const [attempts, setAttempts]     = useState(0);
  const [learned, setLearned]       = useState([]);

  const startQuiz = useCallback(() => {
    const available = QUIZ_PARTS.filter(p => true);
    const next = available[Math.floor(Math.random() * available.length)];
    setQuizPart(next);
    setFeedback(null);
    setWrongGuess(null);
    setActivePart(null);
    setMode("quiz");
  }, []);

  const handleClickPart = useCallback((id) => {
    if (mode === "explore") {
      const p = BODY_PARTS.find(b => b.id === id);
      setActivePart(p || null);
      setLearned(prev => prev.includes(id) ? prev : [...prev, id]);
    } else if (mode === "quiz" && quizPart) {
      setAttempts(a => a + 1);
      if (id === quizPart.id) {
        setScore(s => s + 1);
        setFeedback("correct");
        setActivePart(quizPart);
        setLearned(prev => prev.includes(id) ? prev : [...prev, id]);
      } else {
        const wrong = BODY_PARTS.find(b => b.id === id);
        setWrongGuess(wrong?.name || id);
        setFeedback("wrong");
      }
    }
  }, [mode, quizPart]);

  const nextQuiz = useCallback(() => {
    startQuiz();
  }, [startQuiz]);

  const exitQuiz = useCallback(() => {
    setMode("explore");
    setQuizPart(null);
    setFeedback(null);
    setActivePart(null);
  }, []);

  const fullReset = useCallback(() => {
    setActivePart(null);
    setMode("explore");
    setQuizPart(null);
    setFeedback(null);
    setScore(0);
    setAttempts(0);
    setLearned([]);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 p-3 sm:p-6 font-sans">
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
          <span className="text-5xl">🧩</span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">Nursery</span>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">⏱ 8 min</span>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-100">🌍 Our World & People</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-800">My Body Parts Puzzle</h1>
            <p className="text-sm text-gray-500 mt-0.5">Tap body parts to learn their names!</p>
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
            <li>👆 <strong>Click any part</strong> of the body to see its name and a fun fact!</li>
            <li>🎯 Press <strong>"Quiz Me!"</strong> to test yourself — tap the correct body part.</li>
            <li>⭐ Learn all {QUIZ_PARTS.length} body parts and become a body expert!</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* ── LEFT: Body SVG ── */}
          <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-col items-center">
            {mode === "quiz" && quizPart && !feedback && (
              <div
                className="w-full mb-3 p-3 rounded-xl text-center text-sm font-bold"
                style={{ backgroundColor: quizPart.color + "22", color: quizPart.color }}
              >
                👆 Tap my <span className="text-xl font-black">{quizPart.name}</span>! {quizPart.emoji}
              </div>
            )}

            <div className="w-full" style={{ maxWidth: 220 }}>
              <BodyFigureSVG
                activePart={activePart}
                onClickPart={handleClickPart}
                quizTarget={mode === "quiz" && !feedback ? null : null}
              />
            </div>

            {/* Progress dots */}
            <div className="mt-3 flex flex-wrap justify-center gap-1">
              {QUIZ_PARTS.map(p => (
                <span
                  key={p.id}
                  title={p.name}
                  className="w-3 h-3 rounded-full transition-all duration-300"
                  style={{ backgroundColor: learned.includes(p.id) ? p.color : "#e2e8f0" }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-gray-400">
              {learned.length}/{QUIZ_PARTS.length} body parts learned
            </p>
          </div>

          {/* ── RIGHT: Info + Controls ── */}
          <div className="flex flex-col gap-4">

            {/* Name card */}
            <div className={`bg-white rounded-2xl shadow-lg p-5 text-center transition-all duration-300 ${activePart ? "ring-2" : ""}`}
              style={activePart ? { ringColor: activePart.color, outlineColor: activePart.color, outline: `2px solid ${activePart.color}` } : {}}>
              {activePart ? (
                <>
                  <p className="text-5xl mb-2">{activePart.emoji}</p>
                  <p className="text-3xl font-black" style={{ color: activePart.color }}>{activePart.name}</p>
                  <p className="text-sm text-gray-500 mt-2 leading-relaxed">{activePart.fact}</p>
                </>
              ) : (
                <div className="py-4">
                  <p className="text-4xl mb-2">👆</p>
                  <p className="text-gray-400 text-sm">{mode === "quiz" ? "Tap the correct body part!" : "Tap a body part to learn!"}</p>
                </div>
              )}
            </div>

            {/* Feedback panel (quiz mode) */}
            {mode === "quiz" && feedback && (
              <div className={`rounded-2xl shadow-lg p-4 text-center ${feedback === "correct" ? "bg-green-50" : "bg-red-50"}`}>
                {feedback === "correct" ? (
                  <>
                    <p className="text-3xl mb-1">🎉</p>
                    <p className="font-bold text-green-700">Correct! That's the <strong>{quizPart?.name}</strong>!</p>
                    <button onClick={nextQuiz} className="mt-3 px-6 py-2 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-colors">
                      ➡️ Next Part!
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-2xl mb-1">🤔</p>
                    <p className="font-bold text-red-700">
                      That's the <strong>{wrongGuess}</strong>. Try tapping the <strong style={{ color: quizPart?.color }}>{quizPart?.name}</strong>!
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Mode controls */}
            {mode === "explore" ? (
              <button
                onClick={startQuiz}
                className="w-full h-14 rounded-xl bg-blue-500 text-white font-bold text-base hover:bg-blue-600 transition-colors shadow-md active:scale-95"
              >
                🎯 Quiz Me!
              </button>
            ) : (
              <button
                onClick={exitQuiz}
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold hover:bg-gray-100 transition-colors"
              >
                ← Back to Explore
              </button>
            )}

            {/* Body part buttons (quick tap list) */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                {mode === "explore" ? "All body parts" : "Quiz: tap the body picture!"}
              </p>
              {mode === "explore" && (
                <div className="grid grid-cols-3 gap-1.5">
                  {QUIZ_PARTS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleClickPart(p.id)}
                      style={{ borderColor: activePart?.id === p.id ? p.color : "transparent", backgroundColor: learned.includes(p.id) ? p.color + "15" : "#f8fafc" }}
                      className={`h-9 rounded-xl border-2 text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95 ${activePart?.id === p.id ? "font-black" : "text-gray-600"}`}
                    >
                      {p.emoji} {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── EDUCATIONAL FOOTER ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">📘 Learning Benefits</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Builds vocabulary for all major external body parts</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Introduces basic body awareness and health concepts</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Fun facts spark curiosity about how the body works</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Explore + Quiz modes support both discovery and recall</li>
          </ul>
        </div>

        <button onClick={fullReset} className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-xs font-semibold hover:bg-gray-100 transition-colors">
          🔄 Start Over (reset score)
        </button>

      </div>
    </div>
  );
}
