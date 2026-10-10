import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const CONSONANTS_START = ["b","c","d","f","g","h","j","l","m","n","p","r","s","t","v","w"];
const VOWELS           = ["a","e","i","o","u"];
const CONSONANTS_END   = ["b","d","g","m","n","p","r","s","t","x"];

const VALID_WORDS = {
  "cat": { emoji: "🐱", fact: "A cat says meow!" },
  "dog": { emoji: "🐶", fact: "A dog says woof!" },
  "bat": { emoji: "🦇", fact: "A bat flies at night!" },
  "rat": { emoji: "🐀", fact: "A rat has a long tail!" },
  "hat": { emoji: "🎩", fact: "You wear a hat on your head!" },
  "fun": { emoji: "🎈", fact: "Games are very fun!" },
  "run": { emoji: "🏃", fact: "You can run very fast!" },
  "sun": { emoji: "☀️", fact: "The sun is hot and bright!" },
  "log": { emoji: "🪵", fact: "A log is part of a tree!" },
  "frog": { emoji: "🐸", fact: "A frog says ribbit!" },
  "bin": { emoji: "🗑️", fact: "Put your trash in the bin!" },
  "pin": { emoji: "📍", fact: "A pin is small and sharp!" },
  "pig": { emoji: "🐷", fact: "A pig says oink!" },
  "pen": { emoji: "🖊️", fact: "You use a pen to write!" },
  "hen": { emoji: "🐔", fact: "A hen lays eggs!" },
  "bed": { emoji: "🛏️", fact: "You sleep in a bed!" },
  "red": { emoji: "🔴", fact: "A strawberry is red!" },
  "fox": { emoji: "🦊", fact: "A fox is very clever!" },
  "box": { emoji: "📦", fact: "You put things in a box!" },
  "bus": { emoji: "🚌", fact: "A bus takes you to school!" },
  "bug": { emoji: "🐛", fact: "A bug is a tiny insect!" },
  "mug": { emoji: "☕", fact: "You drink tea from a mug!" },
  "rug": { emoji: "🪶", fact: "A rug goes on the floor!" },
  "jam": { emoji: "🍓", fact: "You put jam on toast!" },
  "man": { emoji: "👨", fact: "Your dad is a man!" },
  "van": { emoji: "🚐", fact: "A van is like a big car!" },
  "web": { emoji: "🕸️", fact: "A spider spins a web!" },
  "top": { emoji: "🌪️", fact: "A toy top spins around!" },
  "mop": { emoji: "🧹", fact: "You clean the floor with a mop!" },
};

const QUIZ_TARGETS = ["cat", "dog", "sun", "hen", "pig", "fox", "bed", "bus"];

// ─── SVG Visual ───────────────────────────────────────────────────────────────

function WordVisualizer({ letter1, letter2, letter3, isChecking, result }) {
  // We use standard colors for C-V-C
  const c1Color = "#4D96FF"; // blue for consonant
  const vColor  = "#FF6B6B"; // red for vowel
  const c2Color = "#4D96FF"; // blue for consonant
  const emptyColor = "#e2e8f0"; // gray

  return (
    <svg viewBox="0 0 300 180" className="w-full h-full" style={{ maxHeight: 180 }}>
      {/* ── Letter slots ── */}
      <g transform="translate(40, 20)">
        {/* Slot 1 */}
        <rect x="0" y="0" width="60" height="70" rx="10" fill={letter1 ? c1Color : emptyColor} opacity={letter1 ? 1 : 0.3} className="transition-all duration-300" />
        {letter1 && <text x="30" y="48" textAnchor="middle" fontSize="40" fontWeight="900" fill="white" fontFamily="Arial">{letter1}</text>}
        <text x="30" y="90" textAnchor="middle" fontSize="12" fill="#94a3b8" fontWeight="bold">Sound 1</text>
        
        {/* Slot 2 */}
        <rect x="80" y="0" width="60" height="70" rx="10" fill={letter2 ? vColor : emptyColor} opacity={letter2 ? 1 : 0.3} className="transition-all duration-300" />
        {letter2 && <text x="110" y="48" textAnchor="middle" fontSize="40" fontWeight="900" fill="white" fontFamily="Arial">{letter2}</text>}
        <text x="110" y="90" textAnchor="middle" fontSize="12" fill="#94a3b8" fontWeight="bold">Sound 2</text>

        {/* Slot 3 */}
        <rect x="160" y="0" width="60" height="70" rx="10" fill={letter3 ? c2Color : emptyColor} opacity={letter3 ? 1 : 0.3} className="transition-all duration-300" />
        {letter3 && <text x="190" y="48" textAnchor="middle" fontSize="40" fontWeight="900" fill="white" fontFamily="Arial">{letter3}</text>}
        <text x="190" y="90" textAnchor="middle" fontSize="12" fill="#94a3b8" fontWeight="bold">Sound 3</text>
      </g>

      {/* ── Result area ── */}
      <g transform="translate(50, 115)">
        <rect x="0" y="0" width="200" height="50" rx="25" fill={result ? "#dbeafe" : "#f1f5f9"} stroke={result ? "#3b82f6" : "#cbd5e1"} strokeWidth="2" className="transition-all duration-500" />
        
        {isChecking ? (
          <text x="100" y="30" textAnchor="middle" fontSize="18" fill="#64748b" fontFamily="Arial" fontWeight="bold" className="animate-pulse">
            Sounding it out...
          </text>
        ) : result ? (
          <text x="100" y="33" textAnchor="middle" fontSize="28" fill="#1e293b" fontFamily="Arial" fontWeight="900">
            {result.emoji} {result.word}
          </text>
        ) : (
          <text x="100" y="30" textAnchor="middle" fontSize="16" fill="#94a3b8" fontFamily="Arial" fontWeight="600">
            Pick 3 letters to make a word!
          </text>
        )}
      </g>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PhonicsSoundBuilder() {
  const [l1, setL1] = useState(null);
  const [l2, setL2] = useState(null);
  const [l3, setL3] = useState(null);

  const [mode, setMode]       = useState("build"); // "build" | "quiz"
  const [quizWord, setQuizWord] = useState(null);
  const [feedback, setFeedback] = useState(null);
  
  const [isChecking, setIsChecking] = useState(false);
  const [foundWord, setFoundWord]   = useState(null);
  const [learned, setLearned]       = useState([]);
  
  const [score, setScore]       = useState(0);
  const [attempts, setAttempts] = useState(0);

  // We automatically check if a word is formed in build mode
  useEffect(() => {
    if (l1 && l2 && l3) {
      if (mode === "build") {
        setIsChecking(true);
        setFoundWord(null);
        
        const word = (l1 + l2 + l3).toLowerCase();
        
        const timer = setTimeout(() => {
          setIsChecking(false);
          if (VALID_WORDS[word]) {
            setFoundWord({ word, ...VALID_WORDS[word] });
            if (!learned.includes(word)) {
              setLearned(prev => [...prev, word]);
            }
          } else {
            setFoundWord({ word, isSilly: true, emoji: "🤪", fact: "That's a silly nonsense word!" });
          }
        }, 800);
        return () => clearTimeout(timer);
      }
    } else {
      setFoundWord(null);
      setIsChecking(false);
    }
  }, [l1, l2, l3, mode, learned]);

  const startQuiz = useCallback(() => {
    const word = QUIZ_TARGETS[Math.floor(Math.random() * QUIZ_TARGETS.length)];
    setQuizWord({ word, ...VALID_WORDS[word] });
    setMode("quiz");
    setL1(null); setL2(null); setL3(null);
    setFeedback(null);
    setFoundWord(null);
  }, []);

  const checkQuizAnswer = useCallback(() => {
    if (!l1 || !l2 || !l3) return;
    const word = (l1 + l2 + l3).toLowerCase();
    
    setAttempts(a => a + 1);
    setIsChecking(true);
    
    setTimeout(() => {
      setIsChecking(false);
      setFoundWord(VALID_WORDS[word] ? { word, ...VALID_WORDS[word] } : { word, isSilly: true, emoji: "🤪" });
      
      if (word === quizWord.word) {
        setScore(s => s + 1);
        setFeedback("correct");
        if (!learned.includes(word)) setLearned(prev => [...prev, word]);
      } else {
        setFeedback("wrong");
      }
    }, 800);
  }, [l1, l2, l3, quizWord, learned]);

  const clearBoard = useCallback(() => {
    setL1(null); setL2(null); setL3(null);
    setFoundWord(null);
    setFeedback(null);
  }, []);

  const fullReset = useCallback(() => {
    clearBoard();
    setMode("build");
    setScore(0);
    setAttempts(0);
    setLearned([]);
  }, [clearBoard]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-3 sm:p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* ── BACK BUTTON ── */}
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>

        {/* ── HEADER ── */}
        <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <span className="text-5xl">🔡</span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">KG 1–2</span>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">⏱ 10 min</span>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-100">📖 Literacy / English</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-800">Phonics Sound Builder</h1>
            <p className="text-sm text-gray-500 mt-0.5">Build CVC words using consonants and vowels!</p>
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
            <li>🔵 <strong>Pick a blue letter</strong> for the start and end of the word.</li>
            <li>🔴 <strong>Pick a red letter</strong> for the middle sound.</li>
            <li>✨ See if you made a real word or a silly word! Then press <strong>Quiz Me</strong> for a challenge!</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── LEFT: Letter Keyboard ── */}
          <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col gap-5">
            {/* Start Consonants */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">🔵 Sound 1 (Start)</p>
                {l1 && <button onClick={() => setL1(null)} className="text-xs text-red-400 font-bold hover:text-red-600">Clear</button>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CONSONANTS_START.map(l => (
                  <button key={`start-${l}`} onClick={() => { setL1(l); setFeedback(null); }}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg text-lg font-black transition-all duration-150 active:scale-95 ${
                      l1 === l ? "bg-blue-500 text-white shadow-inner" : "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Middle Vowels */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">🔴 Sound 2 (Middle)</p>
                {l2 && <button onClick={() => setL2(null)} className="text-xs text-red-400 font-bold hover:text-red-600">Clear</button>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {VOWELS.map(l => (
                  <button key={`vowel-${l}`} onClick={() => { setL2(l); setFeedback(null); }}
                    className={`w-12 h-12 rounded-xl text-xl font-black transition-all duration-150 active:scale-95 ${
                      l2 === l ? "bg-red-500 text-white shadow-inner" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* End Consonants */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">🔵 Sound 3 (End)</p>
                {l3 && <button onClick={() => setL3(null)} className="text-xs text-red-400 font-bold hover:text-red-600">Clear</button>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CONSONANTS_END.map(l => (
                  <button key={`end-${l}`} onClick={() => { setL3(l); setFeedback(null); }}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg text-lg font-black transition-all duration-150 active:scale-95 ${
                      l3 === l ? "bg-blue-500 text-white shadow-inner" : "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Visual & Quiz ── */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl shadow-lg p-5">
              
              {mode === "quiz" && quizWord && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 text-center">
                  <p className="text-sm font-bold text-yellow-800 uppercase mb-1">Challenge Mode</p>
                  <p className="text-4xl mb-1">{quizWord.emoji}</p>
                  <p className="text-lg font-black text-yellow-900">Can you spell <span className="underline decoration-wavy">"{quizWord.word}"</span>?</p>
                </div>
              )}

              <div className="flex justify-center my-2">
                <div className="w-full max-w-sm">
                  <WordVisualizer letter1={l1} letter2={l2} letter3={l3} isChecking={isChecking} result={foundWord} />
                </div>
              </div>

              {/* Fact bubble */}
              {foundWord && !isChecking && (
                <div className={`mt-2 p-3 rounded-xl text-center text-sm font-semibold animate-in fade-in zoom-in duration-300 ${foundWord.isSilly ? "bg-gray-100 text-gray-600" : "bg-green-50 text-green-700 border border-green-200"}`}>
                  {foundWord.fact}
                </div>
              )}

              {/* Quiz button logic */}
              <div className="mt-5 space-y-3">
                {mode === "build" ? (
                  <div className="flex gap-2">
                    <button onClick={clearBoard} className="h-12 w-20 shrink-0 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-lg hover:bg-gray-100 active:scale-95 transition-all">🔄</button>
                    <button onClick={startQuiz} className="flex-1 h-12 rounded-xl bg-purple-500 text-white font-bold text-base hover:bg-purple-600 transition-colors active:scale-95 shadow-md">🎯 Quiz Me!</button>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={checkQuizAnswer} 
                      disabled={!l1 || !l2 || !l3 || isChecking}
                      className="w-full h-12 rounded-xl bg-green-500 text-white font-bold text-base hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95 shadow-md"
                    >
                      ✅ Check My Spelling
                    </button>
                    
                    {feedback && (
                      <div className={`p-4 rounded-xl text-center font-bold mb-3 ${feedback === "correct" ? "bg-green-100 text-green-800 border border-green-300" : "bg-red-100 text-red-800 border border-red-300"}`}>
                        {feedback === "correct" ? (
                          <div className="space-y-3">
                            <p className="text-lg">🎉 Great job! You spelled {quizWord.word}!</p>
                            <button onClick={startQuiz} className="w-full h-10 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 transition-colors">➡️ Next Word</button>
                          </div>
                        ) : (
                          <p>❌ Not quite! Sound it out: {quizWord.word.split('').join('... ')}</p>
                        )}
                      </div>
                    )}

                    <button onClick={() => { setMode("build"); clearBoard(); }} className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold hover:bg-gray-100 transition-colors active:scale-95">
                      ← Back to Free Build
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Word Bank / History */}
            {learned.length > 0 && mode === "build" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">🏆 Words Discovered ({learned.length})</p>
                <div className="flex flex-wrap gap-2">
                  {learned.map(w => (
                    <span key={w} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold border border-blue-200">
                      {w} {VALID_WORDS[w].emoji}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── EDUCATIONAL FOOTER ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">📘 Learning Benefits</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Teaches blending of Consonant-Vowel-Consonant (CVC) sounds</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Helps distinguish between real words and "nonsense" sounds</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Color-coded keys visually separate vowels from consonants</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Vocabulary building using familiar Ghanaian primary concepts</li>
          </ul>
        </div>
        
        <button onClick={fullReset} className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-xs font-semibold hover:bg-gray-100 transition-colors">
          🔄 Reset Everything
        </button>

      </div>
    </div>
  );
}
