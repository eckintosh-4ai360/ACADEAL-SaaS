import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Type, 
  MousePointer2, 
  CheckCircle2, 
  RefreshCcw, 
  HelpCircle, 
  Award, 
  Star,
  Quote,
  ArrowRight,
  BookOpen,
  Trash2,
  ChevronLeft
} from "lucide-react";

const SENTENCES = [
  {
    target: ["The", "big", "lion", "runs", "fast"],
    words: [
      { text: "The", role: "article", color: "bg-slate-200 text-slate-800" },
      { text: "big", role: "adjective", color: "bg-orange-200 text-orange-800 border-orange-300" },
      { text: "lion", role: "noun", color: "bg-blue-200 text-blue-800 border-blue-300" },
      { text: "runs", role: "verb", color: "bg-emerald-200 text-emerald-800 border-emerald-300" },
      { text: "fast", role: "adverb", color: "bg-purple-200 text-purple-800 border-purple-300" }
    ],
    hint: "Start with 'The' and describe the lion."
  },
  {
    target: ["Kofi", "eats", "a", "sweet", "mango"],
    words: [
      { text: "Kofi", role: "noun", color: "bg-blue-200 text-blue-800 border-blue-300" },
      { text: "eats", role: "verb", color: "bg-emerald-200 text-emerald-800 border-emerald-300" },
      { text: "a", role: "article", color: "bg-slate-200 text-slate-800" },
      { text: "sweet", role: "adjective", color: "bg-orange-200 text-orange-800 border-orange-300" },
      { text: "mango", role: "noun", color: "bg-blue-200 text-blue-800 border-blue-300" }
    ],
    hint: "Who is doing the eating?"
  },
  {
    target: ["My", "small", "cat", "is", "happy"],
    words: [
      { text: "My", role: "pronoun", color: "bg-slate-200 text-slate-800" },
      { text: "small", role: "adjective", color: "bg-orange-200 text-orange-800 border-orange-300" },
      { text: "cat", role: "noun", color: "bg-blue-200 text-blue-800 border-blue-300" },
      { text: "is", role: "verb", color: "bg-emerald-200 text-emerald-800 border-emerald-300" },
      { text: "happy", role: "adjective", color: "bg-orange-200 text-orange-800 border-orange-300" }
    ],
    hint: "Talk about your pet!"
  }
];

export default function SentenceBuilder() {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [availableWords, setAvailableWords] = useState([]);
  const [builtSentence, setBuiltSentence] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const sentenceData = SENTENCES[currentLevel];

  // Initialize or shuffle words
  const initLevel = useCallback((index) => {
    const data = SENTENCES[index];
    // Shuffle the words for the available pool
    const shuffled = [...data.words].sort(() => Math.random() - 0.5);
    setAvailableWords(shuffled.map((w, i) => ({ ...w, id: `word-${i}` })));
    setBuiltSentence([]);
    setFeedback(null);
    setAttempts(0);
    setShowHint(false);
  }, []);

  useEffect(() => {
    initLevel(currentLevel);
  }, [currentLevel, initLevel]);

  const addWord = (word) => {
    setBuiltSentence(prev => [...prev, word]);
    setAvailableWords(prev => prev.filter(w => w.id !== word.id));
    setFeedback(null);
  };

  const removeWord = (word) => {
    setAvailableWords(prev => [...prev, word]);
    setBuiltSentence(prev => prev.filter(w => w.id !== word.id));
    setFeedback(null);
  };

  const checkAnswer = () => {
    setAttempts(prev => prev + 1);
    const builtTexts = builtSentence.map(w => w.text);
    const isCorrect = JSON.stringify(builtTexts) === JSON.stringify(sentenceData.target);
    
    if (isCorrect) {
      setFeedback("correct");
    } else {
      setFeedback("incorrect");
    }
  };

  const nextLevel = () => {
    const next = (currentLevel + 1) % SENTENCES.length;
    setCurrentLevel(next);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 bg-indigo-50/30 min-h-screen font-sans text-slate-800">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      {/* 1. Header */}
      <header className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 p-4 rounded-2xl">
            <Type className="text-indigo-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Sentence Builder</h1>
            <p className="text-slate-500 font-medium">Build fun sentences with word tiles</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold border border-blue-200 shadow-sm">
            Primary 1–3
          </span>
          <span className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-sm font-bold border border-orange-200 shadow-sm flex items-center gap-1">
            <Star size={16} /> 10 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Word Pool */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* 2. How to Use Box */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <MousePointer2 className="text-indigo-500" size={18} /> How to Play
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Tap on the colorful word tiles to move them into the sentence box. Put them in the right order to make a sentence!
            </p>
          </section>

          {/* 3. Interactive Control Zone (Available Words) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Available Words</h3>
              <button 
                onClick={() => setShowHint(!showHint)}
                className="text-indigo-600 hover:text-indigo-800 transition-colors"
                title="Get a hint"
              >
                <HelpCircle size={20} />
              </button>
            </div>

            {showHint && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 italic animate-in fade-in slide-in-from-top-2">
                💡 Hint: {sentenceData.hint}
              </div>
            )}

            <div className="flex flex-wrap gap-3 min-h-[120px] items-start content-start">
              {availableWords.map((word) => (
                <button
                  key={word.id}
                  onClick={() => addWord(word)}
                  className={`${word.color} px-5 py-3 rounded-2xl font-bold shadow-sm border-2 border-transparent hover:border-white/50 hover:scale-105 active:scale-95 transition-all text-lg flex items-center gap-2`}
                >
                  {word.text}
                </button>
              ))}
              {availableWords.length === 0 && builtSentence.length > 0 && (
                <div className="w-full flex flex-col items-center justify-center p-8 text-slate-300 opacity-50">
                  <CheckCircle2 size={40} className="mb-2" />
                  <p className="text-sm font-medium">All words used!</p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50">
              <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                <span>Color Guide:</span>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-blue-200" />
                   <span className="text-[10px] text-slate-500 font-bold uppercase">Nouns</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-emerald-200" />
                   <span className="text-[10px] text-slate-500 font-bold uppercase">Verbs</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-orange-200" />
                   <span className="text-[10px] text-slate-500 font-bold uppercase">Adjectives</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sentence Workspace */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* 4. Live Visual Output Area (Workspace) */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-white flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Quote className="text-indigo-400 fill-indigo-50" size={24} />
                Your Sentence
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Level {currentLevel + 1} of {SENTENCES.length}</span>
                <div className="flex gap-1">
                  {SENTENCES.map((_, i) => (
                    <div key={i} className={`h-1.5 w-4 rounded-full ${i === currentLevel ? 'bg-indigo-500' : 'bg-slate-100'}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Visual Sentence Construction Area */}
            <div className="flex-grow bg-slate-50/50 rounded-[2rem] border-4 border-dashed border-slate-100 p-8 flex flex-wrap gap-4 items-center justify-center content-center relative overflow-hidden transition-all">
              {builtSentence.length === 0 ? (
                <div className="text-center opacity-30 select-none">
                  <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MousePointer2 className="text-slate-400" size={24} />
                  </div>
                  <p className="font-bold text-slate-500">Add words above to build your sentence</p>
                </div>
              ) : (
                <>
                  {builtSentence.map((word, index) => (
                    <button
                      key={word.id}
                      onClick={() => removeWord(word)}
                      className={`${word.color} px-6 py-4 rounded-2xl font-bold shadow-lg border-2 border-white/40 hover:scale-105 active:scale-95 transition-all text-2xl group relative animate-in zoom-in-95 duration-300`}
                    >
                      {word.text}
                      <div className="absolute -top-2 -right-2 bg-red-400 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Trash2 size={12} />
                      </div>
                    </button>
                  ))}
                  
                  {/* Punctuation suggestion */}
                  {builtSentence.length === sentenceData.target.length && (
                    <span className="text-4xl font-black text-slate-300">.</span>
                  )}
                </>
              )}
            </div>

            {/* 5. Score / Feedback Panel */}
            <div className="mt-8 space-y-4">
               {feedback === null ? (
                 <button
                  onClick={checkAnswer}
                  disabled={builtSentence.length < 2}
                  className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-xl hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-3"
                 >
                   <CheckCircle2 size={24} />
                   Check My Sentence
                 </button>
               ) : (
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {feedback === "correct" ? (
                      <div className="bg-emerald-50 border-2 border-emerald-500 p-6 rounded-3xl text-center shadow-lg shadow-emerald-100">
                        <div className="inline-block bg-emerald-500 text-white p-3 rounded-full mb-3 animate-bounce">
                           <Award size={32} />
                        </div>
                        <h4 className="text-emerald-900 font-black text-2xl mb-1">Fantastic! ✅</h4>
                        <p className="text-emerald-700 font-medium mb-4">You built a perfect sentence!</p>
                        <button
                          onClick={nextLevel}
                          className="bg-emerald-600 text-white px-10 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2 mx-auto"
                        >
                          Next Level <ArrowRight size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="bg-orange-50 border-2 border-orange-200 p-6 rounded-3xl text-center">
                        <h4 className="text-orange-900 font-black text-xl mb-1">Try again! ❌</h4>
                        <p className="text-orange-700 font-medium mb-4">The words are right, but the order is still a bit mixed up.</p>
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => setFeedback(null)}
                            className="bg-orange-200 text-orange-900 px-6 py-2 rounded-xl font-bold hover:bg-orange-300 transition-all font-inter"
                          >
                            Keep Editing
                          </button>
                          <button
                            onClick={() => initLevel(currentLevel)}
                            className="bg-slate-200 text-slate-700 px-6 py-2 rounded-xl font-bold hover:bg-slate-300 transition-all"
                          >
                            <RefreshCcw size={16} className="inline mr-1" /> Restart
                          </button>
                        </div>
                      </div>
                    )}
                 </div>
               )}
            </div>
          </div>
        </div>
      </main>

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-indigo-600" size={24} />
          Educational Benefits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-blue-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm italic">Helps students recognize <strong>subject-verb-object</strong> patterns.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm italic">Uses color coding to teach <strong>parts of speech</strong> visually.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-orange-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm italic">Builds <strong>reading fluency</strong> through interactive repetition.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-indigo-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm italic">Encourages <strong>correct punctuation</strong> awareness with visual cues.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
