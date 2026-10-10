import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Type, 
  RotateCcw, 
  Target, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  HelpCircle,
  Trophy,
  ArrowRight,
  Grab,
  Clock,
  ChevronLeft
} from "lucide-react";

export default function PartsofSpeechSorter() {
  const sentences = useMemo(() => [
    {
      text: "The quick brown fox jumps over the lazy dog.",
      words: [
        { text: "The", part: "article" },
        { text: "quick", part: "adjective" },
        { text: "brown", part: "adjective" },
        { text: "fox", part: "noun" },
        { text: "jumps", part: "verb" },
        { text: "over", part: "preposition" },
        { text: "the", part: "article" },
        { text: "lazy", part: "adjective" },
        { text: "dog", part: "noun" }
      ]
    },
    {
      text: "Ghana is a beautiful country in West Africa.",
      words: [
        { text: "Ghana", part: "noun" },
        { text: "is", part: "verb" },
        { text: "a", part: "article" },
        { text: "beautiful", part: "adjective" },
        { text: "country", part: "noun" },
        { text: "in", part: "preposition" },
        { text: "West", part: "adjective" },
        { text: "Africa", part: "noun" }
      ]
    },
    {
      text: "Students learn diligently in the bright classroom.",
      words: [
        { text: "Students", part: "noun" },
        { text: "learn", part: "verb" },
        { text: "diligently", part: "adverb" },
        { text: "in", part: "preposition" },
        { text: "the", part: "article" },
        { text: "bright", part: "adjective" },
        { text: "classroom", part: "noun" }
      ]
    },
    {
      text: "Strong lions roar loudly in the wild savanna.",
      words: [
        { text: "Strong", part: "adjective" },
        { text: "lions", part: "noun" },
        { text: "roar", part: "verb" },
        { text: "loudly", part: "adverb" },
        { text: "in", part: "preposition" },
        { text: "the", part: "article" },
        { text: "wild", part: "adjective" },
        { text: "savanna", part: "noun" }
      ]
    }
  ], []);

  const categories = [
    { id: "noun", label: "Noun", color: "bg-blue-100 border-blue-300 text-blue-700", icon: "🏠" },
    { id: "verb", label: "Verb", color: "bg-red-100 border-red-300 text-red-700", icon: "⚡" },
    { id: "adjective", label: "Adjective", color: "bg-green-100 border-green-300 text-green-700", icon: "🎨" },
    { id: "adverb", label: "Adverb", color: "bg-purple-100 border-purple-300 text-purple-700", icon: "🚀" }
  ];

  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [placedWords, setPlacedWords] = useState({}); // { wordIndex: categoryId }
  const [selectedWordIdx, setSelectedWordIdx] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState("playing"); // "playing", "finished"
  const [feedback, setFeedback] = useState(null);

  const currentSentence = sentences[currentSentenceIdx];
  
  // Filter only the main parts of speech for the game
  const playableWords = useMemo(() => {
    return currentSentence.words.map((w, i) => ({ ...w, originalIdx: i }))
      .filter(w => ["noun", "verb", "adjective", "adverb"].includes(w.part));
  }, [currentSentence]);

  const handleWordSelect = (idx) => {
    if (gameState !== "playing") return;
    setSelectedWordIdx(idx);
    setFeedback(null);
  };

  const handleCategoryClick = (catId) => {
    if (selectedWordIdx === null || gameState !== "playing") return;

    const word = playableWords.find(w => w.originalIdx === selectedWordIdx);
    setAttempts(prev => prev + 1);

    if (word.part === catId) {
      setPlacedWords(prev => ({ ...prev, [selectedWordIdx]: catId }));
      setSelectedWordIdx(null);
      setFeedback({ type: "success", message: "✅ Correct!" });
      setScore(prev => prev + 10);
    } else {
      setFeedback({ type: "error", message: `❌ Try again! A ${catId} usually describes...` });
    }
  };

  useEffect(() => {
    if (Object.keys(placedWords).length === playableWords.length && playableWords.length > 0) {
      if (currentSentenceIdx < sentences.length - 1) {
        // Automatically move to next sentence after a delay
        const timer = setTimeout(() => {
          setCurrentSentenceIdx(prev => prev + 1);
          setPlacedWords({});
          setFeedback(null);
        }, 1500);
        return () => clearTimeout(timer);
      } else {
        setGameState("finished");
      }
    }
  }, [placedWords, playableWords.length, currentSentenceIdx, sentences.length]);

  const resetGame = () => {
    setCurrentSentenceIdx(0);
    setPlacedWords({});
    setSelectedWordIdx(null);
    setAttempts(0);
    setScore(0);
    setGameState("playing");
    setFeedback(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-blue-50/20 min-h-screen font-sans text-slate-800">
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
            <Type className="text-blue-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Parts of Speech Sorter</h1>
            <p className="text-slate-500 font-medium">Categorise words to build your grammar skills</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm">
            Primary 4–6
          </span>
          <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm flex items-center gap-1">
            <Clock className="w-4 h-4" /> 12 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Bucket Zone */}
        <div className="lg:col-span-4 flex flex-col gap-6 order-2 lg:order-1">
          
          {/* 2. "How to Use" box */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <HelpCircle className="text-blue-500" size={18} /> How to Play
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Click a word from the sentence, then click the matching category bucket below. Sort all nouns, verbs, adjectives, and adverbs!
            </p>
          </section>

          {/* 3. Interactive Control Zone (The Buckets) */}
          <div className="grid grid-cols-2 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`
                  p-6 rounded-3xl border-2 flex flex-col items-center justify-center gap-3 transition-all
                  ${selectedWordIdx !== null ? 'hover:scale-105 hover:shadow-md cursor-pointer' : 'opacity-80 cursor-default'}
                  ${cat.color}
                `}
              >
                <span className="text-3xl">{cat.icon}</span>
                <span className="font-black uppercase tracking-widest text-xs">{cat.label}</span>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mt-auto">
            <div className="flex justify-between items-center mb-4 text-xs font-black text-slate-400 uppercase tracking-widest">
              <span>Progress</span>
              <span>Sentence {currentSentenceIdx + 1} of {sentences.length}</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
               <div 
                className="h-full bg-blue-500 transition-all duration-500" 
                style={{ width: `${((currentSentenceIdx) / sentences.length) * 100}%` }}
               />
            </div>
            <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span>Score: {score}</span>
              <span>Attempts: {attempts}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Game Area */}
        <div className="lg:col-span-8 flex flex-col gap-6 order-1 lg:order-2">
          
          {/* 4. Live Visual Output Area (Sentence Display) */}
          <div className="bg-white rounded-[3rem] shadow-xl border-8 border-slate-50 p-8 flex flex-col items-center justify-center min-h-[400px] relative">
            {gameState === "playing" ? (
              <>
                <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-w-2xl px-4">
                  {currentSentence.words.map((word, i) => {
                    const isPlayable = ["noun", "verb", "adjective", "adverb"].includes(word.part);
                    const isPlaced = placedWords[i] !== undefined;
                    const isSelected = selectedWordIdx === i;
                    
                    return (
                      <button
                        key={i}
                        disabled={!isPlayable || isPlaced}
                        onClick={() => handleWordSelect(i)}
                        className={`
                          px-4 py-2 md:px-6 md:py-3 rounded-2xl text-lg md:text-xl font-bold transition-all
                          ${isPlaced ? 'bg-slate-50 text-slate-300 transform scale-95' : ''}
                          ${isSelected ? 'bg-blue-500 text-white shadow-lg ring-4 ring-blue-200' : ''}
                          ${isPlayable && !isPlaced && !isSelected ? 'bg-white border-2 border-slate-100 hover:border-blue-300 hover:shadow-md text-slate-700' : ''}
                          ${!isPlayable ? 'text-slate-400 cursor-default p-0 flex items-end mb-1' : ''}
                        `}
                      >
                        {word.text}
                      </button>
                    );
                  })}
                </div>

                {feedback && (
                  <div className={`mt-10 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 animate-in zoom-in slide-in-from-top-2 ${feedback.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {feedback.message}
                  </div>
                )}

                <div className="absolute bottom-8 flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                  <Grab size={16} />
                  <span>Select a word to sort it</span>
                </div>
              </>
            ) : (
              <div className="text-center animate-in zoom-in duration-500">
                <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="text-emerald-600" size={48} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Well Done!</h2>
                <p className="text-slate-500 mb-8 font-medium">You have mastered parts of speech!</p>
                <div className="flex gap-4 justify-center">
                  <div className="bg-blue-50 p-4 rounded-2xl">
                    <span className="block text-[10px] font-black text-blue-400 uppercase tracking-widest">Final Score</span>
                    <span className="text-2xl font-black text-blue-700">{score}</span>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl">
                    <span className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest">Accuracy</span>
                    <span className="text-2xl font-black text-emerald-700">{Math.round((score / attempts) * 10)}%</span>
                  </div>
                </div>
                <button 
                  onClick={resetGame}
                  className="mt-10 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 mx-auto"
                >
                  <RotateCcw size={18} /> Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-blue-600" size={24} />
          What You Will Learn
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-blue-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Identifying <strong>Nouns</strong> as naming words for people, places, and things.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-red-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Recognising <strong>Verbs</strong> as action words that bring sentences to life.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-green-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Distinguishing <strong>Adjectives</strong> that describe and add detail to nouns.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-purple-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Understanding <strong>Adverbs</strong> and how they modify verbs and actions.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
