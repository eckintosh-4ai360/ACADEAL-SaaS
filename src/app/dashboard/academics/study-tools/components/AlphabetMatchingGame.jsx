import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const ALPHABET_DATA = [
  { letter: "A", word: "Ant",      emoji: "🐜", color: "#FF6B6B", hint: "A tiny insect that works hard!" },
  { letter: "B", word: "Butterfly",emoji: "🦋", color: "#FF9F43", hint: "It starts life as a caterpillar!" },
  { letter: "C", word: "Cat",      emoji: "🐱", color: "#FFD93D", hint: "It says meow!" },
  { letter: "D", word: "Dog",      emoji: "🐶", color: "#6BCB77", hint: "Man's best friend!" },
  { letter: "E", word: "Elephant", emoji: "🐘", color: "#4D96FF", hint: "The biggest land animal!" },
  { letter: "F", word: "Fish",     emoji: "🐟", color: "#9B5DE5", hint: "It swims in water!" },
  { letter: "G", word: "Goat",     emoji: "🐐", color: "#FF6B6B", hint: "It loves to climb hills!" },
  { letter: "H", word: "Hen",      emoji: "🐔", color: "#FF9F43", hint: "It lays eggs!" },
  { letter: "I", word: "Iguana",   emoji: "🦎", color: "#FFD93D", hint: "A scaly green reptile!" },
  { letter: "J", word: "Jellyfish",emoji: "🪼", color: "#6BCB77", hint: "It floats in the ocean!" },
  { letter: "K", word: "Kite",     emoji: "🪁", color: "#4D96FF", hint: "You fly it in the wind!" },
  { letter: "L", word: "Lion",     emoji: "🦁", color: "#9B5DE5", hint: "The king of the jungle!" },
  { letter: "M", word: "Monkey",   emoji: "🐒", color: "#FF6B6B", hint: "It loves bananas!" },
  { letter: "N", word: "Nest",     emoji: "🪺", color: "#FF9F43", hint: "A bird's cozy home!" },
  { letter: "O", word: "Owl",      emoji: "🦉", color: "#FFD93D", hint: "It hoots at night!" },
  { letter: "P", word: "Parrot",   emoji: "🦜", color: "#6BCB77", hint: "It can copy your words!" },
  { letter: "Q", word: "Queen",    emoji: "👸", color: "#4D96FF", hint: "She wears a crown!" },
  { letter: "R", word: "Rabbit",   emoji: "🐰", color: "#9B5DE5", hint: "It has long fluffy ears!" },
  { letter: "S", word: "Snake",    emoji: "🐍", color: "#FF6B6B", hint: "It slithers on the ground!" },
  { letter: "T", word: "Tiger",    emoji: "🐯", color: "#FF9F43", hint: "It has orange and black stripes!" },
  { letter: "U", word: "Umbrella", emoji: "☂️", color: "#FFD93D", hint: "You use it when it rains!" },
  { letter: "V", word: "Vulture",  emoji: "🦅", color: "#6BCB77", hint: "A big bird that soars high!" },
  { letter: "W", word: "Whale",    emoji: "🐋", color: "#4D96FF", hint: "The biggest animal in the ocean!" },
  { letter: "X", word: "X-ray",    emoji: "🔬", color: "#9B5DE5", hint: "Doctors use it to see inside!" },
  { letter: "Y", word: "Yak",      emoji: "🐂", color: "#FF6B6B", hint: "A furry animal from the mountains!" },
  { letter: "Z", word: "Zebra",    emoji: "🦓", color: "#FF9F43", hint: "It has black and white stripes!" },
];

// ─── SVG Visual ──────────────────────────────────────────────────────────────

function LetterSVG({ item }) {
  if (!item) {
    return (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <circle cx="100" cy="100" r="90" fill="#f1f5f9" />
        <text x="100" y="120" textAnchor="middle" fontSize="80" fill="#cbd5e1">?</text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {/* Background circle */}
      <circle cx="100" cy="100" r="90" fill={item.color + "22"} stroke={item.color} strokeWidth="3" />

      {/* Big letter */}
      <text
        x="100" y="75"
        textAnchor="middle"
        fontSize="64"
        fontWeight="900"
        fill={item.color}
        fontFamily="Arial, sans-serif"
      >
        {item.letter}
      </text>

      {/* Emoji (rendered as text) */}
      <text x="100" y="140" textAnchor="middle" fontSize="44">
        {item.emoji}
      </text>

      {/* Word label */}
      <rect x="40" y="152" width="120" height="28" rx="14" fill={item.color} />
      <text x="100" y="170" textAnchor="middle" fontSize="14" fontWeight="700" fill="white" fontFamily="Arial, sans-serif">
        {item.word}
      </text>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AlphabetMatchingGame() {
  const [selected, setSelected] = useState(null);       // currently viewed letter
  const [quiz, setQuiz] = useState(null);               // { question, options, correct }
  const [answered, setAnswered] = useState(null);       // null | "correct" | "wrong"
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [seen, setSeen] = useState([]);                  // letters the child has clicked
  const [celebration, setCelebration] = useState(false);
  const [quizMode, setQuizMode] = useState(false);

  // Pick a letter to show
  const selectLetter = useCallback((item) => {
    setSelected(item);
    setAnswered(null);
    setQuiz(null);
    setSeen((prev) => prev.includes(item.letter) ? prev : [...prev, item.letter]);
  }, []);

  // Build a quiz question for the current letter
  const startQuiz = useCallback(() => {
    if (!selected) return;
    const correct = selected;
    const pool = ALPHABET_DATA.filter((d) => d.letter !== correct.letter);
    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [...shuffled, correct].sort(() => Math.random() - 0.5);
    setQuiz({ question: correct.emoji, options, correct: correct.letter });
    setAnswered(null);
    setQuizMode(true);
  }, [selected]);

  const checkAnswer = useCallback((letter) => {
    if (!quiz || answered) return;
    setAttempts((a) => a + 1);
    if (letter === quiz.correct) {
      setScore((s) => s + 1);
      setAnswered("correct");
      setCelebration(true);
      setTimeout(() => setCelebration(false), 1500);
    } else {
      setAnswered("wrong");
    }
  }, [quiz, answered]);

  const reset = useCallback(() => {
    setSelected(null);
    setQuiz(null);
    setAnswered(null);
    setScore(0);
    setAttempts(0);
    setSeen([]);
    setQuizMode(false);
    setCelebration(false);
  }, []);

  const nextQuestion = useCallback(() => {
    const unseen = ALPHABET_DATA.filter((d) => !seen.includes(d.letter) || d.letter !== selected?.letter);
    const next = unseen[Math.floor(Math.random() * unseen.length)] || ALPHABET_DATA[Math.floor(Math.random() * ALPHABET_DATA.length)];
    selectLetter(next);
    setQuizMode(false);
    setAnswered(null);
    setQuiz(null);
  }, [seen, selected, selectLetter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50 p-3 sm:p-6 font-sans">
      {/* ── HEADER ── */}
      <div className="max-w-4xl mx-auto">
        {/* ── BACK BUTTON ── */}
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-4"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
        <div className="rounded-2xl shadow-lg bg-white p-5 mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <span className="text-5xl">🔤</span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                Nursery
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                ⏱ 8 min
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-100">
                📖 Literacy / English
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-800">Alphabet Matching Game</h1>
            <p className="text-sm text-gray-500 mt-0.5">Click a letter to discover its animal friend!</p>
          </div>
          {/* Score */}
          <div className="flex gap-3 shrink-0">
            <div className="text-center bg-green-50 border border-green-200 rounded-xl px-4 py-2">
              <p className="text-xs text-green-600 font-semibold">Score</p>
              <p className="text-2xl font-black text-green-700">{score}</p>
            </div>
            <div className="text-center bg-orange-50 border border-orange-200 rounded-xl px-4 py-2">
              <p className="text-xs text-orange-600 font-semibold">Tries</p>
              <p className="text-2xl font-black text-orange-700">{attempts}</p>
            </div>
          </div>
        </div>

        {/* ── HOW TO USE ── */}
        <div className="rounded-2xl bg-yellow-100 border border-yellow-300 p-4 mb-4 shadow-sm">
          <p className="text-sm font-bold text-yellow-800 mb-1">👋 How to Play</p>
          <ul className="text-sm text-yellow-900 space-y-1">
            <li>🖱️ <strong>Click any big letter</strong> below to see its animal friend and word.</li>
            <li>🎯 Then press <strong>"Quiz Me!"</strong> to test what you remember.</li>
            <li>⭐ Get as many right as you can — you can always try again!</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── LEFT: Letter Grid ── */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-4">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
              Choose a Letter ({seen.length}/26 explored)
            </h2>
            <div className="grid grid-cols-6 sm:grid-cols-7 gap-2">
              {ALPHABET_DATA.map((item) => {
                const isSelected = selected?.letter === item.letter;
                const hasSeen = seen.includes(item.letter);
                return (
                  <button
                    key={item.letter}
                    onClick={() => selectLetter(item)}
                    style={{
                      backgroundColor: isSelected ? item.color : hasSeen ? item.color + "22" : "#f8fafc",
                      borderColor: item.color,
                      color: isSelected ? "white" : item.color,
                    }}
                    className={`h-11 rounded-xl border-2 font-black text-lg transition-all duration-200 shadow-sm hover:scale-110 active:scale-95 ${isSelected ? "scale-110 shadow-md" : ""}`}
                  >
                    {item.letter}
                  </button>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Letters explored</span>
                <span>{seen.length} / 26</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${(seen.length / 26) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── RIGHT: Visual + Quiz ── */}
          <div className="flex flex-col gap-4">

            {/* SVG visual panel */}
            <div className={`bg-white rounded-2xl shadow-lg p-4 text-center transition-all duration-300 ${celebration ? "scale-105 ring-4 ring-yellow-300" : ""}`}>
              <div className="w-40 h-40 mx-auto">
                <LetterSVG item={selected} />
              </div>

              {selected ? (
                <>
                  <p className="text-4xl mt-2">{selected.emoji}</p>
                  <p className="text-xl font-black mt-1" style={{ color: selected.color }}>
                    {selected.letter} is for <span className="underline decoration-wavy">{selected.word}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1 italic">{selected.hint}</p>

                  {!quizMode && (
                    <button
                      onClick={startQuiz}
                      className="mt-3 w-full h-11 rounded-xl font-bold text-white text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
                      style={{ backgroundColor: selected.color }}
                    >
                      🎯 Quiz Me!
                    </button>
                  )}
                </>
              ) : (
                <p className="text-gray-400 text-sm mt-4">Pick a letter to start!</p>
              )}
            </div>

            {/* ── Quiz panel ── */}
            {quizMode && quiz && (
              <div className="bg-white rounded-2xl shadow-lg p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                  Which letter does this belong to?
                </p>
                <p className="text-5xl text-center mb-3">{quiz.question}</p>

                <div className="grid grid-cols-2 gap-2">
                  {quiz.options.map((opt) => {
                    let btnStyle = "bg-gray-50 border-gray-200 text-gray-800";
                    if (answered) {
                      if (opt.letter === quiz.correct) btnStyle = "bg-green-500 border-green-500 text-white";
                      else if (answered === "wrong") btnStyle = "bg-red-100 border-red-200 text-red-600";
                    }
                    return (
                      <button
                        key={opt.letter}
                        onClick={() => checkAnswer(opt.letter)}
                        disabled={!!answered}
                        className={`h-12 rounded-xl border-2 font-black text-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed ${btnStyle}`}
                      >
                        {opt.letter}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback */}
                {answered && (
                  <div className={`mt-3 p-3 rounded-xl text-center text-sm font-semibold ${answered === "correct" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {answered === "correct" ? (
                      <span>✅ Correct! <strong>{selected?.word}</strong> starts with <strong>{selected?.letter}</strong>!</span>
                    ) : (
                      <span>❌ Try again! Hint: {selected?.hint}</span>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  {answered === "wrong" && (
                    <button
                      onClick={() => setAnswered(null)}
                      className="flex-1 h-10 rounded-xl border-2 border-orange-300 bg-orange-50 text-orange-700 text-sm font-bold hover:bg-orange-100 transition-colors"
                    >
                      🔄 Try Again
                    </button>
                  )}
                  {answered === "correct" && (
                    <button
                      onClick={nextQuestion}
                      className="flex-1 h-10 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors"
                    >
                      ➡️ Next Letter
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Reset */}
            <button
              onClick={reset}
              className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold hover:bg-gray-100 transition-colors"
            >
              🔄 Start Over
            </button>
          </div>
        </div>

        {/* ── EDUCATIONAL FOOTER ── */}
        <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">📘 Learning Benefits</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Builds letter recognition across the full A–Z alphabet</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Connects phonics sounds to familiar animals and words</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Encourages self-paced, independent exploration</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Instant visual feedback reinforces correct letter-word links</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
