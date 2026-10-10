import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const GREETINGS = [
  {
    id: "morning",
    emoji: "🌅",
    label: "Good Morning",
    twi: "Maakye",
    ga: "Ojekoo",
    bg: "#FFD93D",
    border: "#e6b800",
    hint: "This is what you say when the sun is rising!",
    svg: "morning",
  },
  {
    id: "afternoon",
    emoji: "☀️",
    label: "Good Afternoon",
    twi: "Maaha",
    ga: "Ojaŋmo",
    bg: "#FF6B6B",
    border: "#e63939",
    hint: "This is what you say when the sun is high in the sky!",
    svg: "afternoon",
  },
  {
    id: "thankyou",
    emoji: "🙏",
    label: "Thank You",
    twi: "Meda ase",
    ga: "Oyiwaladon",
    bg: "#6BCB77",
    border: "#3a9e47",
    hint: "This is what you say when someone does something nice for you!",
    svg: "thankyou",
  },
];

/* ─────────────────────────────────────────────
   SVG SCENE COMPONENTS
───────────────────────────────────────────── */
function MorningSVG() {
  return (
    <svg viewBox="0 0 120 90" className="w-full h-full">
      {/* Sky */}
      <rect width="120" height="90" fill="#87CEEB" rx="8" />
      {/* Ground */}
      <rect y="65" width="120" height="25" fill="#6BCB77" rx="4" />
      {/* Sun rising */}
      <circle cx="60" cy="55" r="20" fill="#FFD93D" />
      <line x1="60" y1="28" x2="60" y2="20" stroke="#FFD93D" strokeWidth="3" strokeLinecap="round" />
      <line x1="60" y1="82" x2="60" y2="90" stroke="#FFD93D" strokeWidth="3" strokeLinecap="round" />
      <line x1="33" y1="55" x2="25" y2="55" stroke="#FFD93D" strokeWidth="3" strokeLinecap="round" />
      <line x1="87" y1="55" x2="95" y2="55" stroke="#FFD93D" strokeWidth="3" strokeLinecap="round" />
      <line x1="41" y1="36" x2="35" y2="30" stroke="#FFD93D" strokeWidth="3" strokeLinecap="round" />
      <line x1="79" y1="74" x2="85" y2="80" stroke="#FFD93D" strokeWidth="3" strokeLinecap="round" />
      <line x1="41" y1="74" x2="35" y2="80" stroke="#FFD93D" strokeWidth="3" strokeLinecap="round" />
      <line x1="79" y1="36" x2="85" y2="30" stroke="#FFD93D" strokeWidth="3" strokeLinecap="round" />
      {/* Child waving */}
      <circle cx="20" cy="60" r="5" fill="#FDBCB4" />
      <rect x="17" y="65" width="6" height="10" fill="#4D96FF" rx="2" />
      <line x1="23" y1="67" x2="30" y2="62" stroke="#FDBCB4" strokeWidth="2" strokeLinecap="round" />
      <line x1="17" y1="67" x2="12" y2="71" stroke="#FDBCB4" strokeWidth="2" strokeLinecap="round" />
      {/* Stars fading */}
      <circle cx="90" cy="15" r="1.5" fill="white" opacity="0.6" />
      <circle cx="100" cy="25" r="1" fill="white" opacity="0.4" />
      <circle cx="80" cy="10" r="1" fill="white" opacity="0.4" />
    </svg>
  );
}

function AfternoonSVG() {
  return (
    <svg viewBox="0 0 120 90" className="w-full h-full">
      {/* Sky */}
      <rect width="120" height="90" fill="#5BA4CF" rx="8" />
      {/* Ground */}
      <rect y="65" width="120" height="25" fill="#8BC34A" rx="4" />
      {/* Sun high */}
      <circle cx="60" cy="22" r="16" fill="#FFB300" />
      <line x1="60" y1="2" x2="60" y2="0" stroke="#FFB300" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="40" y1="10" x2="37" y2="7" stroke="#FFB300" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="80" y1="10" x2="83" y2="7" stroke="#FFB300" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="33" y1="22" x2="30" y2="22" stroke="#FFB300" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="87" y1="22" x2="90" y2="22" stroke="#FFB300" strokeWidth="2.5" strokeLinecap="round" />
      {/* Clouds */}
      <ellipse cx="95" cy="42" rx="12" ry="7" fill="white" opacity="0.85" />
      <ellipse cx="108" cy="40" rx="8" ry="6" fill="white" opacity="0.85" />
      <ellipse cx="85" cy="40" rx="8" ry="6" fill="white" opacity="0.85" />
      {/* Tree */}
      <rect x="55" y="55" width="6" height="12" fill="#795548" rx="1" />
      <circle cx="58" cy="50" r="12" fill="#388E3C" />
      {/* Shadow */}
      <ellipse cx="62" cy="68" rx="10" ry="3" fill="#2E7D32" opacity="0.4" />
      {/* Child */}
      <circle cx="25" cy="60" r="5" fill="#FDBCB4" />
      <rect x="22" y="65" width="6" height="10" fill="#FF6B6B" rx="2" />
      <line x1="28" y1="67" x2="34" y2="65" stroke="#FDBCB4" strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="67" x2="16" y2="71" stroke="#FDBCB4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ThankYouSVG() {
  return (
    <svg viewBox="0 0 120 90" className="w-full h-full">
      {/* Background */}
      <rect width="120" height="90" fill="#E8F5E9" rx="8" />
      {/* Two children */}
      {/* Child 1 */}
      <circle cx="35" cy="45" r="8" fill="#FDBCB4" />
      <rect x="30" y="53" width="10" height="14" fill="#4D96FF" rx="3" />
      {/* Child 1 arms reaching */}
      <line x1="40" y1="56" x2="50" y2="54" stroke="#FDBCB4" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="30" y1="56" x2="20" y2="60" stroke="#FDBCB4" strokeWidth="2.5" strokeLinecap="round" />
      {/* Gift box */}
      <rect x="50" y="50" width="20" height="18" fill="#FF6B6B" rx="3" />
      <rect x="50" y="50" width="20" height="4" fill="#e63939" rx="2" />
      <line x1="60" y1="50" x2="60" y2="68" stroke="#FFD93D" strokeWidth="2" />
      <path d="M54 50 Q60 44 66 50" fill="none" stroke="#FFD93D" strokeWidth="2" />
      {/* Hearts */}
      <text x="72" y="42" fontSize="10" textAnchor="middle">💛</text>
      <text x="82" y="28" fontSize="8" textAnchor="middle">💚</text>
      <text x="60" y="30" fontSize="7" textAnchor="middle">💖</text>
      {/* Child 2 */}
      <circle cx="95" cy="45" r="8" fill="#D4A574" />
      <rect x="90" y="53" width="10" height="14" fill="#6BCB77" rx="3" />
      <line x1="90" y1="56" x2="80" y2="54" stroke="#D4A574" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="100" y1="56" x2="108" y2="60" stroke="#D4A574" strokeWidth="2.5" strokeLinecap="round" />
      {/* Hands together */}
      <ellipse cx="50" cy="54" rx="4" ry="3" fill="#FDBCB4" />
      <ellipse cx="80" cy="54" rx="4" ry="3" fill="#D4A574" />
      {/* Ground */}
      <rect y="68" width="120" height="22" fill="#C8E6C9" rx="4" />
    </svg>
  );
}

function SceneSVG({ type }) {
  if (type === "morning") return <MorningSVG />;
  if (type === "afternoon") return <AfternoonSVG />;
  return <ThankYouSVG />;
}

/* ─────────────────────────────────────────────
   GREETING CARD (picture side)
───────────────────────────────────────────── */
function PictureCard({ greeting, isSelected, isMatched, onClick, language }) {
  return (
    <button
      onClick={onClick}
      disabled={isMatched}
      className={`
        relative flex flex-col items-center justify-between
        rounded-2xl shadow-lg p-3 w-full
        transition-all duration-300 border-4
        ${isMatched
          ? "border-green-400 scale-95 opacity-80 cursor-default"
          : isSelected
            ? "border-blue-500 scale-105 -translate-y-1 shadow-2xl"
            : "border-transparent hover:border-blue-300 hover:scale-102 hover:-translate-y-0.5 active:scale-95"
        }
      `}
      style={{ background: isMatched ? "#d4f7dc" : greeting.bg }}
      aria-label={`Picture card: ${greeting.label}`}
    >
      {isMatched && (
        <span className="absolute top-1 right-1 text-2xl">✅</span>
      )}
      <div className="w-full aspect-square rounded-xl overflow-hidden bg-white/30 shadow-inner">
        <SceneSVG type={greeting.svg} />
      </div>
      <p className="mt-2 text-xs font-bold text-gray-700 text-center leading-tight">
        {greeting.emoji} {greeting.label}
      </p>
    </button>
  );
}

/* ─────────────────────────────────────────────
   GREETING BUTTON (word side)
───────────────────────────────────────────── */
function WordCard({ greeting, isSelected, isMatched, onClick, language }) {
  const word = language === "twi" ? greeting.twi : greeting.ga;
  return (
    <button
      onClick={onClick}
      disabled={isMatched}
      className={`
        flex flex-col items-center justify-center
        rounded-2xl shadow-md px-4 py-5 w-full min-h-[72px]
        font-bold transition-all duration-300 border-4 text-white text-lg
        ${isMatched
          ? "border-green-400 opacity-70 cursor-default scale-95"
          : isSelected
            ? "border-yellow-300 scale-105 -translate-y-0.5 shadow-2xl ring-4 ring-yellow-200"
            : "border-transparent hover:border-yellow-200 hover:scale-102 active:scale-95"
        }
      `}
      style={{ background: isMatched ? "#aee9b8" : greeting.border }}
      aria-label={`Word card: ${word}`}
    >
      <span className="text-2xl mb-0.5">{language === "twi" ? "🇬🇭" : "🎵"}</span>
      <span className="drop-shadow">{word}</span>
      {isMatched && <span className="text-lg mt-1">✅</span>}
    </button>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function TwiGaGreetingsMatch() {
  const [language, setLanguage] = useState("twi"); // "twi" | "ga"
  const [selectedPicture, setSelectedPicture] = useState(null); // greeting id
  const [selectedWord, setSelectedWord] = useState(null); // greeting id
  const [matched, setMatched] = useState([]); // array of matched greeting ids
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState(null); // null | { correct: bool, hint: str }
  const [celebrateId, setCelebrateId] = useState(null);
  const [gameComplete, setGameComplete] = useState(false);

  // Shuffle word cards once per language change
  const shuffledWords = useMemo(() => {
    const arr = [...GREETINGS];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [language]);

  // Check for match whenever both are selected
  useEffect(() => {
    if (selectedPicture && selectedWord) {
      setAttempts((a) => a + 1);
      if (selectedPicture === selectedWord) {
        // Correct match!
        setFeedback({ correct: true, hint: "Amazing! 🎉 Well done!" });
        setCelebrateId(selectedPicture);
        const newMatched = [...matched, selectedPicture];
        setMatched(newMatched);
        setTimeout(() => {
          setCelebrateId(null);
          setSelectedPicture(null);
          setSelectedWord(null);
          if (newMatched.length === GREETINGS.length) {
            setGameComplete(true);
          }
        }, 1200);
      } else {
        // Wrong match
        const g = GREETINGS.find((g) => g.id === selectedPicture);
        setFeedback({
          correct: false,
          hint: g?.hint || "Try again! Look at the picture carefully.",
        });
        setTimeout(() => {
          setSelectedPicture(null);
          setSelectedWord(null);
        }, 1000);
      }
    }
  }, [selectedPicture, selectedWord]);

  const handlePicture = useCallback(
    (id) => {
      if (matched.includes(id)) return;
      setFeedback(null);
      setSelectedPicture((prev) => (prev === id ? null : id));
    },
    [matched]
  );

  const handleWord = useCallback(
    (id) => {
      if (matched.includes(id)) return;
      setFeedback(null);
      setSelectedWord((prev) => (prev === id ? null : id));
    },
    [matched]
  );

  const resetGame = () => {
    setSelectedPicture(null);
    setSelectedWord(null);
    setMatched([]);
    setAttempts(0);
    setFeedback(null);
    setCelebrateId(null);
    setGameComplete(false);
  };

  const score = Math.max(0, Math.round(100 - (attempts - GREETINGS.length) * 10));
  const stars = matched.length === GREETINGS.length
    ? score >= 80 ? "⭐⭐⭐" : score >= 60 ? "⭐⭐" : "⭐"
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50 p-3 sm:p-5 font-sans">
      <div className="max-w-2xl mx-auto">
        {/* ── BACK BUTTON ── */}
        <div className="mb-4">
          <Link 
            href="/dashboard/academics/study-tools"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-yellow-600 transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Study Tools
          </Link>
        </div>

        {/* ── HEADER ── */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4 text-center border-b-4 border-yellow-300">
          <div className="text-5xl mb-1">🗣️</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 leading-tight">
            Twi &amp; Ga Greetings Match
          </h1>
          <p className="text-sm text-gray-500 mt-1">Match the greeting word to the right picture!</p>
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            <span className="bg-yellow-300 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
              🌱 Nursery
            </span>
            <span className="bg-pink-200 text-pink-800 text-xs font-bold px-3 py-1 rounded-full">
              🇬🇭 Ghanaian Language
            </span>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
              ⏱ 6 min
            </span>
          </div>
        </div>

        {/* ── HOW TO USE ── */}
        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-2xl p-4 mb-4 shadow">
          <p className="font-bold text-blue-700 mb-1 text-sm">📖 How to Play</p>
          <ul className="text-sm text-blue-800 space-y-1 list-none">
            <li>👆 Tap a <strong>picture</strong> on the left, then tap the <strong>word</strong> on the right that matches it.</li>
            <li>🟩 When you get it right, both cards turn green — keep going until all 3 match!</li>
            <li>🔄 Use the buttons below to switch between <strong>Twi</strong> and <strong>Ga</strong> languages.</li>
          </ul>
        </div>

        {/* ── LANGUAGE TOGGLE ── */}
        <div className="flex gap-3 mb-4 justify-center">
          {["twi", "ga"].map((lang) => (
            <button
              key={lang}
              onClick={() => { setLanguage(lang); resetGame(); }}
              className={`
                px-6 py-3 rounded-full text-base font-bold transition-all duration-300 shadow
                ${language === lang
                  ? "bg-yellow-400 text-gray-900 scale-105 shadow-lg border-2 border-yellow-600"
                  : "bg-white text-gray-600 border-2 border-gray-200 hover:border-yellow-300"
                }
              `}
            >
              {lang === "twi" ? "🇬🇭 Twi" : "🎵 Ga"}
            </button>
          ))}
        </div>

        {/* ── GAME BOARD ── */}
        {!gameComplete ? (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Pictures column */}
              <div className="space-y-3">
                <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  🖼 Pictures
                </p>
                {GREETINGS.map((g) => (
                  <div
                    key={g.id}
                    className={`transition-all duration-300 ${celebrateId === g.id ? "animate-bounce" : ""}`}
                  >
                    <PictureCard
                      greeting={g}
                      isSelected={selectedPicture === g.id}
                      isMatched={matched.includes(g.id)}
                      onClick={() => handlePicture(g.id)}
                      language={language}
                    />
                  </div>
                ))}
              </div>

              {/* Words column */}
              <div className="space-y-3">
                <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  💬 Words
                </p>
                {shuffledWords.map((g) => (
                  <div
                    key={g.id}
                    className={`transition-all duration-300 ${celebrateId === g.id ? "animate-bounce" : ""}`}
                  >
                    <WordCard
                      greeting={g}
                      isSelected={selectedWord === g.id}
                      isMatched={matched.includes(g.id)}
                      onClick={() => handleWord(g.id)}
                      language={language}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-5">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{matched.length} / {GREETINGS.length} matched</span>
                <span>{attempts} attempts</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-400 to-green-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(matched.length / GREETINGS.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* ── WIN SCREEN ── */
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-4 text-center border-4 border-yellow-300 animate-pulse-once">
            <div className="text-6xl mb-3">🎊</div>
            <h2 className="text-2xl font-extrabold text-yellow-600 mb-2">You did it!</h2>
            <p className="text-gray-600 mb-2">All greetings matched in <strong>{attempts}</strong> attempt{attempts !== 1 ? "s" : ""}!</p>
            <div className="text-4xl mb-3">{stars}</div>
            <div className="inline-block bg-yellow-100 rounded-xl px-6 py-3 mb-4">
              <p className="text-sm font-bold text-gray-500">Score</p>
              <p className="text-4xl font-extrabold text-yellow-600">{Math.min(100, score)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {GREETINGS.map((g) => (
                <div key={g.id} className="rounded-xl p-2 text-center text-xs font-bold" style={{ background: g.bg }}>
                  <div className="text-2xl">{g.emoji}</div>
                  <div className="text-gray-700">{g.label}</div>
                  <div className="text-gray-600 mt-0.5">
                    {language === "twi" ? g.twi : g.ga}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={resetGame}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-extrabold text-lg px-8 py-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
            >
              🔄 Play Again!
            </button>
          </div>
        )}

        {/* ── FEEDBACK PANEL ── */}
        {feedback && (
          <div
            className={`
              rounded-2xl px-5 py-4 mb-4 text-center font-bold text-base shadow transition-all duration-300
              ${feedback.correct
                ? "bg-green-100 border-2 border-green-400 text-green-800"
                : "bg-red-100 border-2 border-red-400 text-red-700"
              }
            `}
          >
            {feedback.correct ? (
              <span>✅ Correct! Great job! 🎉</span>
            ) : (
              <span>❌ Not quite! <span className="font-normal text-sm block mt-1">{feedback.hint}</span></span>
            )}
          </div>
        )}

        {/* ── RESET BUTTON (during game) ── */}
        {!gameComplete && (
          <div className="flex justify-center mb-4">
            <button
              onClick={resetGame}
              className="bg-white border-2 border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 font-bold text-sm px-5 py-2 rounded-full shadow transition-all duration-300"
            >
              🔄 Start Over
            </button>
          </div>
        )}

        {/* ── REFERENCE CARD ── */}
        <div className="bg-white rounded-2xl shadow p-4 mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">
            📚 Greeting Reference
          </p>
          <div className="grid grid-cols-3 gap-2">
            {GREETINGS.map((g) => (
              <div
                key={g.id}
                className="rounded-xl p-3 text-center text-xs"
                style={{ background: g.bg + "55", border: `2px solid ${g.bg}` }}
              >
                <div className="text-2xl mb-1">{g.emoji}</div>
                <div className="font-bold text-gray-700 text-[11px] leading-tight mb-1">{g.label}</div>
                <div className="bg-white/70 rounded-lg px-1 py-0.5 mb-1">
                  <span className="font-bold text-gray-600">Twi: </span>
                  <span className="text-gray-700">{g.twi}</span>
                </div>
                <div className="bg-white/70 rounded-lg px-1 py-0.5">
                  <span className="font-bold text-gray-600">Ga: </span>
                  <span className="text-gray-700">{g.ga}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── EDUCATIONAL FOOTER ── */}
        <div className="bg-gradient-to-r from-yellow-100 to-pink-100 rounded-2xl p-4 shadow">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            🌟 What You&apos;re Learning
          </p>
          <ul className="space-y-1.5 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span>🤝</span>
              <span><strong>Cultural pride</strong> — learning greetings in Ghana's native languages</span>
            </li>
            <li className="flex items-start gap-2">
              <span>🧠</span>
              <span><strong>Visual matching</strong> — connecting words to real-life situations</span>
            </li>
            <li className="flex items-start gap-2">
              <span>🗣️</span>
              <span><strong>Early literacy</strong> — recognising printed words in Twi and Ga</span>
            </li>
            <li className="flex items-start gap-2">
              <span>⏰</span>
              <span><strong>Time awareness</strong> — understanding morning, afternoon, and social courtesy</span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}
