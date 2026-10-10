"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, XCircle, ArrowRight, Award, Brain, Target, MessageSquare, Info, Zap, Search, Clock, RefreshCw, AlertCircle, ChevronLeft } from "lucide-react";

/**
 * Vocabulary in Context Explorer
 * Level: JHS 1–3
 * Focus: Using context clues for vocabulary inference
 * Project: Eckintosh Student Management System
 */
export default function VocabularyinContextExplorer() {
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState({ shown: false, correct: false, message: "" });
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState("playing"); // 'playing', 'result'

  const wordDecks = [
    { target: "alleviate", sentence: "The doctor gave him medicine to *alleviate* the pain.", options: ["increase", "reduce", "explain", "ignore"], answer: "reduce", hint: "Think about what medicine usually does to suffering." },
    { target: "ambiguous", sentence: "The instructions were so *ambiguous* that half the students did the wrong exercise.", options: ["clear", "long", "confusing", "helpful"], answer: "confusing", hint: "If people are doing the wrong thing, were the instructions clear?" },
    { target: "benevolent", sentence: "The *benevolent* queen spent her weekends visiting the poor and building schools.", options: ["kind", "cruel", "wealthy", "famous"], answer: "kind", hint: "Building schools and visiting the poor are acts of...?" },
    { target: "candid", sentence: "I appreciate your *candid* feedback; I'd rather hear the truth than a beautiful lie.", options: ["dishonest", "secretive", "frank", "polite"], answer: "frank", hint: "The sentence contrasts this word with a 'lie'." },
    { target: "diligent", sentence: "Kofi is a *diligent* student who always double-checks his work before submitting it.", options: ["lazy", "careless", "hard-working", "sleepy"], answer: "hard-working", hint: "Someone who double-checks work is showing which trait?" },
    { target: "eloquent", sentence: "The speaker was so *eloquent* that the entire audience was moved to tears by her words.", options: ["boring", "persuasive", "loud", "silent"], answer: "persuasive", hint: "A speech that moves people to tears must be well-spoken and...?" },
    { target: "futile", sentence: "It is *futile* to try and stop the tide with a small bucket.", options: ["pointless", "effective", "important", "easy"], answer: "pointless", hint: "Can a small bucket really stop the ocean tide?" },
    { target: "gregarious", sentence: "Monkeys are *gregarious* animals that prefer living in large social groups.", options: ["solitary", "aggressive", "sociable", "shy"], answer: "sociable", hint: "Living in 'large social groups' suggests they like company." },
    { target: "hinder", sentence: "Heavy traffic might *hinder* our ability to get to the airport on time.", options: ["help", "delay", "ignore", "accelerate"], answer: "delay", hint: "What does traffic do to your speed?" },
    { target: "inevitable", sentence: "If you don't study for the exam, failure is almost *inevitable*.", options: ["unlikely", "avoidable", "certain", "surprising"], answer: "certain", hint: "If an outcome is bound to happen, it is...?" },
    { target: "jeopardize", sentence: "Arriving late to the interview could *jeopardize* your chances of getting the job.", options: ["improve", "secure", "endanger", "calculate"], answer: "endanger", hint: "Being late is a risk to your success." },
    { target: "kindle", sentence: "The teacher's story helped *kindle* a new interest in science among the children.", options: ["extinguish", "spark", "hide", "ignore"], answer: "spark", hint: "Think of lighting a fire or starting something new." },
    { target: "lucrative", sentence: "The new cocoa farm turned out to be a very *lucrative* business for the family.", options: ["unprofitable", "profitable", "dangerous", "boring"], answer: "profitable", hint: "A successful business usually makes money." },
    { target: "meticulous", sentence: "The tailor was *meticulous*, ensuring every single stitch was perfectly aligned.", options: ["careless", "fast", "precise", "sloppy"], answer: "precise", hint: "Paying attention to every single stitch means being very...?" },
    { target: "novice", sentence: "Even a *novice* at chess can beat a master if the master isn't paying attention.", options: ["expert", "beginner", "cheater", "player"], answer: "beginner", hint: "Someone who is new to a game is a...?" },
    { target: "obscure", sentence: "The meaning of the poem was *obscure*, requiring hours of study to understand.", options: ["clear", "hidden", "simple", "famous"], answer: "hidden", hint: "If something is hard to understand, is the meaning easy to see?" },
    { target: "prudent", sentence: "It is *prudent* to save some money every month for unexpected emergencies.", options: ["reckless", "wise", "wasteful", "selfish"], answer: "wise", hint: "Saving for emergencies is a smart/sensible decision." },
    { target: "resilient", sentence: "The community proved *resilient*, rebuilding their town quickly after the flood.", options: ["weak", "tough", "angry", "slow"], answer: "tough", hint: "Recovering quickly from a disaster shows what kind of spirit?" },
    { target: "scrutinize", sentence: "The detective had to *scrutinize* the crime scene for even the tiniest clues.", options: ["ignore", "glance at", "examine", "clean"], answer: "examine", hint: "Looking for 'tiniest clues' requires looking very closely." },
    { target: "tentative", sentence: "We have a *tentative* plan to visit Cape Coast, but it depends on the weather.", options: ["final", "uncertain", "secret", "exciting"], answer: "uncertain", hint: "If a plan 'depends on' something else, is it fixed yet?" }
  ];

  useEffect(() => {
    // Shuffle the deck on mount
    setDeck([...wordDecks].sort(() => Math.random() - 0.5));
  }, []);

  const handleCheck = useCallback(() => {
    if (!selectedOption) return;

    const currentWord = deck[currentIndex];
    const isCorrect = selectedOption === currentWord.answer;

    if (isCorrect) {
      setScore(s => s + 1);
      setFeedback({ shown: true, correct: true, message: "Perfect! You've mastered the context clue." });
    } else {
      setFeedback({ shown: true, correct: false, message: `Not quite. ${currentWord.hint}` });
    }
    setAttempts(a => a + 1);
  }, [selectedOption, currentIndex, deck]);

  const handleNext = () => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setFeedback({ shown: false, correct: false, message: "" });
    } else {
      setGameState("result");
    }
  };

  const resetGame = () => {
    setDeck([...wordDecks].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setSelectedOption(null);
    setFeedback({ shown: false, correct: false, message: "" });
    setScore(0);
    setAttempts(0);
    setGameState("playing");
  };

  if (deck.length === 0) return <div className="p-8 text-center text-teal-800">Loading Vocabulary Deck...</div>;

  const currentWord = deck[currentIndex];

  // Visual Output: Semantic Bridge SVG
  const renderVisual = () => {
    return (
      <svg viewBox="0 0 400 200" className="w-full h-48 md:h-64 bg-slate-900 rounded-xl shadow-inner border border-slate-700 transition-all duration-500">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#5eead4" />
          </marker>
        </defs>

        {/* Central Concept */}
        <circle cx="200" cy="100" r="45" className="fill-indigo-900 stroke-indigo-400 stroke-2" />
        <text x="200" y="105" textAnchor="middle" fill="#e0e7ff" className="text-sm font-bold tracking-wider uppercase">
          {currentWord.target}
        </text>

        {/* Semantic Context Nodes */}
        {selectedOption ? (
          <g className="animate-in fade-in zoom-in duration-500">
            <line x1="200" y1="100" x2="320" y2="100" stroke="#5eead4" strokeWidth="2" strokeDasharray="5,5" markerEnd="url(#arrowhead)" />
            <rect x="290" y="80" width="80" height="40" rx="8" className={`${feedback.shown ? (feedback.correct ? 'fill-emerald-900 stroke-emerald-400' : 'fill-rose-900 stroke-rose-400') : 'fill-indigo-900 stroke-indigo-400'} stroke-2`} />
            <text x="330" y="105" textAnchor="middle" fill="white" className="text-xs font-medium">
              {selectedOption}
            </text>
            <text x="200" y="170" textAnchor="middle" fill={feedback.shown ? (feedback.correct ? '#4ade80' : '#f87171') : '#94a3b8'} className="text-xs italic">
              {feedback.shown ? (feedback.correct ? "Inference Validated" : "Mismatch Detected") : "Checking mapping..."}
            </text>
          </g>
        ) : (
          <g>
            <circle cx="320" cy="100" r="10" className="fill-slate-700 animate-pulse" />
            <text x="200" y="170" textAnchor="middle" fill="#94a3b8" className="text-xs">
              Select an option to map the meaning
            </text>
          </g>
        )}

        {/* Context Clue Symbols */}
        <circle cx="80" cy="60" r="15" fill="#312e81" className="animate-bounce" />
        <Search size={14} x="73" y="53" className="text-indigo-300" />
        
        <circle cx="80" cy="140" r="15" fill="#134e4a" style={{ animationDelay: '0.5s'}} className="animate-bounce" />
        <Zap size={14} x="73" y="133" className="text-teal-300" />
      </svg>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 bg-slate-50 min-h-screen font-sans">
      {/* ── BACK BUTTON ── */}
      <div className="mb-4">
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
      </div>

      {/* Header */}
      <header className="mb-6 bg-white p-6 rounded-2xl shadow-lg border-b-4 border-indigo-600">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-4xl">📖</span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Vocabulary Context Explorer</h1>
            </div>
            <p className="text-slate-500 mt-1 font-medium">Unlocking deeper meaning through sentence signals</p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold border border-indigo-200 uppercase">JHS 1–3</span>
            <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-bold border border-teal-200 flex items-center gap-1">
              <Clock size={12} /> 12 MIN
            </span>
          </div>
        </div>
      </header>

      {/* How to Use Box */}
      <section className="mb-6 bg-indigo-900 text-indigo-50 p-4 rounded-xl shadow-md flex items-start gap-3 border-l-4 border-teal-400">
        <Info className="text-teal-400 shrink-0 mt-1" />
        <p className="text-sm leading-relaxed">
          Analyze the sentence and look for clues like synonyms, antonyms, or descriptions. Select the option that best fits the highlighted word's meaning to build your "Semantic Bridge."
        </p>
      </section>

      {gameState === "playing" ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Interactive Control Zone & Sentence */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex justify-between">
                <span>Sentence Context</span>
                <span>Word {currentIndex + 1} of {deck.length}</span>
              </div>
              
              <div className="mb-8 relative p-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <p className="text-xl md:text-2xl text-slate-700 leading-relaxed font-serif italic text-center">
                  {currentWord.sentence.split('*').map((part, i) => 
                    i === 1 ? <span key={i} className="text-indigo-600 font-black underline decoration-teal-400 decoration-4 underline-offset-4">{part}</span> : part
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                {currentWord.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => !feedback.shown && setSelectedOption(option)}
                    disabled={feedback.shown}
                    className={`p-4 rounded-xl text-lg font-bold transition-all duration-300 transform border-2 flex items-center justify-between
                      ${selectedOption === option 
                        ? (feedback.shown ? (feedback.correct ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-rose-600 border-rose-700 text-white shadow-rose-200') : 'bg-indigo-600 border-indigo-700 text-white scale-[1.02] shadow-md')
                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:translate-y-[-2px]'}
                      ${feedback.shown && option === currentWord.answer && selectedOption !== option ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : ''}
                    `}
                  >
                    <span className="capitalize">{option}</span>
                    {selectedOption === option && !feedback.shown && <Target size={18} className="text-indigo-200" />}
                    {feedback.shown && option === currentWord.answer && <CheckCircle2 size={18} className={selectedOption === option ? "text-white" : "text-emerald-500"} />}
                    {feedback.shown && option === selectedOption && option !== currentWord.answer && <XCircle size={18} className="text-white" />}
                  </button>
                ))}
              </div>

              {!feedback.shown ? (
                <button
                  onClick={handleCheck}
                  disabled={!selectedOption}
                  className={`w-full mt-6 py-4 rounded-xl text-xl font-black transition-all shadow-lg flex items-center justify-center gap-2
                    ${selectedOption ? 'bg-teal-500 hover:bg-teal-600 text-white translate-y-[-2px] shadow-teal-500/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                  `}
                >
                  <Search size={24} /> CHECK MY ANSWER
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="w-full mt-6 py-4 rounded-xl text-xl font-black bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-lg flex items-center justify-center gap-2 animate-pulse"
                >
                  NEXT WORD <ArrowRight size={24} />
                </button>
              )}
            </div>
          </div>

          {/* Live Visual Output Area & Feedback */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-200">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Brain size={14} /> Inference Engine
              </h3>
              {renderVisual()}
            </div>

            <div className={`p-6 rounded-2xl border-2 transition-all duration-500 ${
              !feedback.shown ? 'bg-white border-slate-100 opacity-50' : 
              feedback.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${feedback.correct ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {feedback.correct ? <Award size={28} /> : <AlertCircle size={28} />}
                </div>
                <div>
                  <h4 className={`text-lg font-black ${feedback.correct ? 'text-emerald-800' : 'text-rose-800'}`}>
                    {feedback.shown ? (feedback.correct ? "Excellent Inference!" : "Keep Digging!") : "Waiting for Answer..."}
                  </h4>
                  <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                    {feedback.shown ? feedback.message : "Select the meaning that fits the context cues in the sentence."}
                  </p>
                </div>
              </div>

              {/* Stats Mini Panel */}
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Current Score</p>
                  <p className="text-2xl font-black text-indigo-600">{score}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Questions Solved</p>
                  <p className="text-2xl font-black text-teal-600">{attempts}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Result Screen */
        <div className="bg-white p-12 rounded-3xl shadow-2xl border-2 border-indigo-100 text-center max-w-2xl mx-auto animate-in zoom-in duration-700">
          <div className="inline-block p-6 bg-indigo-50 rounded-full mb-6">
            <span className="text-6xl animate-bounce inline-block">🏆</span>
          </div>
          <h2 className="text-4xl font-black text-slate-800 mb-2">Lexicon Legend!</h2>
          <p className="text-slate-500 text-lg mb-8">You successfully navigated through the context explorer.</p>
          
          <div className="grid grid-cols-3 gap-6 mb-10">
            <div className="bg-indigo-50 p-6 rounded-2xl">
              <p className="text-xs font-bold text-indigo-400 uppercase mb-2">Accuracy</p>
              <p className="text-3xl font-black text-indigo-600">{attempts > 0 ? Math.round((score / attempts) * 100) : 0}%</p>
            </div>
            <div className="bg-teal-50 p-6 rounded-2xl">
              <p className="text-xs font-bold text-teal-400 uppercase mb-2">Points</p>
              <p className="text-3xl font-black text-teal-600">{score * 10}</p>
            </div>
            <div className="bg-amber-50 p-6 rounded-2xl">
              <p className="text-xs font-bold text-amber-500 uppercase mb-2">Rank</p>
              <p className="text-3xl font-black text-amber-600">{score > 15 ? 'Elite' : score > 10 ? 'Adept' : 'Novice'}</p>
            </div>
          </div>

          <button
            onClick={resetGame}
            className="group px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xl font-bold transition-all shadow-xl flex items-center justify-center gap-3 mx-auto"
          >
            <RefreshCw className="group-hover:rotate-180 transition-transform duration-700" size={24} /> TRY AGAIN
          </button>
        </div>
      )}

      {/* Educational Value Footer */}
      <footer className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Search size={16} />, title: "Pattern Recognition", desc: "Identify linguistic signals." },
          { icon: <Brain size={16} />, title: "Critical Thinking", desc: "Logical deduction of meaning." },
          { icon: <MessageSquare size={16} />, title: "Reading Fluency", desc: "Smoother text comprehension." },
          { icon: <BookOpen size={16} />, title: "Active Vocabulary", desc: "Expanding word knowledge." }
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-indigo-500 mb-2">{item.icon}</div>
            <h5 className="font-bold text-slate-800 text-sm">{item.title}</h5>
            <p className="text-slate-500 text-[11px] leading-tight mt-1">{item.desc}</p>
          </div>
        ))}
      </footer>
    </div>
  );
}
