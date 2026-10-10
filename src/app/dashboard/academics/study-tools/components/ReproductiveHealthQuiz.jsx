"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ChevronRight, 
  RotateCcw, 
  BookOpen, 
  ShieldCheck, 
  Sparkles,
  User,
  Info,
  Waves,
  Heart,
  BrainCircuit,
  ChevronLeft
} from "lucide-react";

const QUESTIONS = [
  {
    id: 1,
    question: "Which of these is a physical change that happens to both boys and girls during puberty?",
    options: ["Voice deepening", "Growth spurt (getting taller)", "Menstruation", "Broadening of shoulders"],
    correct: 1,
    hint: "Think about things that happen to every human body as it grows up.",
    fact: "Growth spurts are triggered by hormones and usually occur between ages 10-16 for most adolescents."
  },
  {
    id: 2,
    question: "What is the most effective way to manage body odor during puberty?",
    options: ["Using heavy perfume", "Bathing once a week", "Daily bathing and wearing clean clothes", "Ignoring it"],
    correct: 2,
    hint: "Personal hygiene is about keeping the body clean and fresh every day.",
    fact: "Sweat glands become more active during puberty, making regular washing and clean laundry essential."
  },
  {
    id: 3,
    question: "Emotional changes during puberty, such as mood swings, are primarily caused by:",
    options: ["Bad food choices", "Changing hormone levels", "Watching too much TV", "The weather"],
    correct: 1,
    hint: "These internal signals are sent by the brain to tell the body how to grow.",
    fact: "Hormones like estrogen and testosterone affect not just the body, but also how you feel and react to things."
  },
  {
    id: 4,
    question: 'What does "Making a Responsible Choice" mean in reproductive health?',
    options: [
      "Following what your peers are doing", 
      "Decisions that prioritize your health, safety, and future", 
      "Deciding things without asking for advice", 
      "Avoiding all types of social interaction"
    ],
    correct: 1,
    hint: "It involves thinking about long-term well-being over short-term pressure.",
    fact: "Resisting peer pressure and choosing safety is a sign of high maturity and self-respect."
  },
  {
    id: 5,
    question: "Menstruation (the period) is a normal biological sign that...",
    options: [
      "A person is sick", 
      "The female reproductive system is functioning healthily", 
      "Puberty has ended", 
      "One should stop exercising"
    ],
    correct: 1,
    hint: "It's a natural monthly cycle for most females starting in their teenage years.",
    fact: "Menstruation is a natural part of growth and health for girls; it is not shameful or a sign of illness."
  }
];

export default function ReproductiveHealthQuiz() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [showResult, setShowResult] = useState(false);

  // SVG Visual Output Area - A dynamic "Knowledge Shield"
  const renderVisual = useMemo(() => {
    const progress = (score / QUESTIONS.length) * 100;
    
    return (
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl filter transition-all duration-700">
        <defs>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Circular Progress Ring */}
        <circle 
          cx="100" cy="100" r="92" 
          fill="none" stroke="#1e293b" strokeWidth="4" 
        />
        <circle 
          cx="100" cy="100" r="92" 
          fill="none" stroke="url(#shieldGrad)" strokeWidth="4" 
          strokeDasharray="578" 
          strokeDashoffset={578 - (578 * (score / QUESTIONS.length))}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          transform="rotate(-90 100 100)"
        />

        {/* The Shield Body */}
        <path 
          d="M100 35 L165 55 Q165 145 100 175 Q35 145 35 55 Z" 
          fill="#1e1b4b" stroke="#312e81" strokeWidth="3"
        />
        
        {/* Core Glow - Fill level based on score */}
        <path 
          d="M100 45 L150 60 Q150 135 100 160 Q50 135 50 60 Z" 
          fill="url(#shieldGrad)" 
          fillOpacity={0.05 + (score * 0.15)}
          className="transition-all duration-1000"
        />

        {/* Milestone Nodes */}
        {QUESTIONS.map((_, i) => {
          const angle = (i / QUESTIONS.length) * 2 * Math.PI - Math.PI / 2;
          const r = 92;
          const x = 100 + r * Math.cos(angle);
          const y = 100 + r * Math.sin(angle);
          return (
            <circle 
              key={i}
              cx={x} cy={y} r="6" 
              className={`${i < score ? 'fill-teal-400' : 'fill-slate-700'} transition-all duration-500`}
              filter={i < score ? "url(#glow)" : ""}
            />
          );
        })}

        {/* Achievement Icon Area */}
        <g transform="translate(85, 75)" className={score > QUESTIONS.length / 2 ? "animate-bounce" : "animate-pulse"}>
            <foreignObject width="32" height="32">
                {score > QUESTIONS.length / 2 ? (
                    <ShieldCheck className="w-8 h-8 text-teal-400" />
                ) : (
                    <Info className="w-8 h-8 text-indigo-400" />
                )}
            </foreignObject>
        </g>

        {/* Textual Feedback inside SVG */}
        <text 
          x="100" y="130" textAnchor="middle" 
          className="fill-white font-black transition-all duration-500"
          style={{ fontSize: '28px' }}
        >
          {score}
        </text>
        <text 
          x="100" y="150" textAnchor="middle" 
          className="fill-teal-300 font-bold uppercase tracking-widest"
          style={{ fontSize: '9px' }}
        >
          Shield Points
        </text>
      </svg>
    );
  }, [score]);

  const handleAnswerSelect = (index) => {
    if (isAnswerChecked) return;
    setSelectedAnswer(index);
  };

  const checkAnswer = () => {
    if (selectedAnswer === null) return;
    setIsAnswerChecked(true);
    setAttempts(prev => prev + 1);
    if (selectedAnswer === QUESTIONS[currentStep].correct) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerChecked(false);
    } else {
      setShowResult(true);
    }
  };

  const resetQuiz = () => {
    setCurrentStep(0);
    setSelectedAnswer(null);
    setIsAnswerChecked(false);
    setScore(0);
    setAttempts(0);
    setShowResult(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 md:p-10 selection:bg-teal-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* ── BACK BUTTON ── */}
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-teal-400 transition-colors mb-2"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
        
        {/* 1. Header */}
        <header className="relative bg-gradient-to-r from-indigo-900 via-slate-900 to-teal-900 border border-indigo-500/20 rounded-3xl p-8 shadow-2xl overflow-hidden group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="bg-gradient-to-br from-teal-400 to-indigo-500 p-4 rounded-3xl shadow-lg ring-8 ring-indigo-500/10 group-hover:scale-105 transition-transform duration-500">
                <BrainCircuit className="w-10 h-10 text-slate-950" />
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white">
                  Health & Choices Quiz <span className="text-teal-400">🧬</span>
                </h1>
                <p className="text-indigo-300 text-lg font-medium opacity-80 mt-1">Puberty, Hygiene, and Responsible Living</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="bg-indigo-600/30 border border-indigo-400/30 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest text-indigo-200">Level: JHS 1–3</span>
              <span className="bg-teal-500/20 border border-teal-400/30 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest text-teal-300 flex items-center gap-2">
                <RotateCcw className="w-3 h-3" /> 15 Min Tool
              </span>
            </div>
          </div>
        </header>

        {/* 2. How to Use Box */}
        <aside className="bg-slate-900/60 border-l-8 border-teal-500 rounded-2xl p-6 shadow-xl flex items-start gap-4 backdrop-blur-md">
          <div className="bg-teal-500/20 p-2 rounded-lg">
            <Info className="w-6 h-6 text-teal-400" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-teal-400 text-sm uppercase tracking-wider">How to Learn</h4>
            <p className="text-slate-300 text-sm leading-relaxed">
              Answer the questions to build your <span className="text-white font-bold">Knowledge Shield</span>. 
              Each correct answer strengthens your shield on the right. Read the feedback facts—they contain essential life skills for your growth journey!
            </p>
          </div>
        </aside>

        <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* 3 & 5. Interactive Control Zone + Feedback (Left Column) */}
          <section className="lg:col-span-3 space-y-6">
            {!showResult ? (
              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden h-full flex flex-col">
                {/* Progress Bar Top */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(20,184,166,0.5)]" 
                    style={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}
                  />
                </div>
                
                <div className="mb-10">
                  <span className="bg-slate-800 text-teal-400 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase">
                    Question {currentStep + 1} of {QUESTIONS.length}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold mt-6 text-white leading-tight">
                    {QUESTIONS[currentStep].question}
                  </h2>
                </div>

                <div className="grid gap-4 flex-grow">
                  {QUESTIONS[currentStep].options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswerSelect(idx)}
                      disabled={isAnswerChecked}
                      className={`
                        w-full text-left p-6 rounded-3xl border-2 transition-all duration-300 flex items-center justify-between group
                        ${selectedAnswer === idx 
                          ? 'border-indigo-500 bg-indigo-500/10 text-white translate-x-1 shadow-lg' 
                          : 'border-slate-800 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/80 text-slate-400'}
                        ${isAnswerChecked && idx === QUESTIONS[currentStep].correct ? 'border-teal-500 bg-teal-500/10 text-white ring-4 ring-teal-500/10' : ''}
                        ${isAnswerChecked && selectedAnswer === idx && idx !== QUESTIONS[currentStep].correct ? 'border-red-500 bg-red-500/10 scale-[0.98]' : ''}
                        disabled:cursor-default
                      `}
                    >
                      <span className="font-bold text-lg md:text-xl leading-snug">{option}</span>
                      <div className="flex-shrink-0 ml-4">
                        {isAnswerChecked && idx === QUESTIONS[currentStep].correct && <CheckCircle2 className="w-8 h-8 text-teal-400 animate-in zoom-in-50" />}
                        {isAnswerChecked && selectedAnswer === idx && idx !== QUESTIONS[currentStep].correct && <XCircle className="w-8 h-8 text-red-400 animate-in shake" />}
                        {!isAnswerChecked && (
                          <div className={`w-8 h-8 rounded-full border-2 transition-all duration-300 ${selectedAnswer === idx ? 'border-indigo-500 bg-indigo-500' : 'border-slate-700 group-hover:border-slate-500'}`} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Score & Feedback Area */}
                <div className="mt-10 pt-8 border-t border-slate-800 space-y-6">
                  {!isAnswerChecked ? (
                    <button
                      onClick={checkAnswer}
                      disabled={selectedAnswer === null}
                      className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-30 disabled:grayscale text-white font-black text-xl py-6 rounded-3xl shadow-xl shadow-indigo-900/40 transition-all hover:scale-[1.02] active:scale-95"
                    >
                      Check My Answer
                    </button>
                  ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
                       <div className={`p-6 rounded-[2rem] border-l-[12px] flex flex-col md:flex-row gap-6 shadow-2xl backdrop-blur-md ${selectedAnswer === QUESTIONS[currentStep].correct ? 'bg-teal-500/10 border-teal-500' : 'bg-red-500/10 border-red-500'}`}>
                          <div className="bg-slate-900/80 p-4 rounded-2xl self-start flex-shrink-0">
                            {selectedAnswer === QUESTIONS[currentStep].correct ? (
                                <Sparkles className="w-8 h-8 text-teal-400" />
                            ) : (
                                <XCircle className="w-8 h-8 text-red-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-black text-2xl mb-1">
                              {selectedAnswer === QUESTIONS[currentStep].correct ? 'Excellent Insight!' : 'Let\'s Learn More.'}
                            </p>
                            <p className="text-slate-300 text-base leading-relaxed font-medium">{QUESTIONS[currentStep].fact}</p>
                          </div>
                       </div>
                       <button
                        onClick={nextQuestion}
                        className="w-full bg-white hover:bg-slate-100 text-indigo-950 font-black text-2xl py-6 rounded-3xl transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-4 group"
                      >
                        {currentStep < QUESTIONS.length - 1 ? 'Next Knowledge Step' : 'View Master Shield'}
                        <ChevronRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* High-Class Result Card */
              <div className="bg-indigo-950/80 border-4 border-teal-500/30 rounded-[3rem] p-12 shadow-[0_0_50px_rgba(45,212,191,0.1)] flex flex-col items-center text-center space-y-8 animate-in zoom-in-95 duration-700">
                <div className="relative">
                    <div className="absolute inset-0 bg-teal-400 blur-3xl opacity-20 animate-pulse"></div>
                    <ShieldCheck className="w-24 h-24 text-teal-400 relative z-10" />
                </div>
                <div>
                    <h2 className="text-5xl font-black mb-4">Quiz Complete!</h2>
                    <p className="text-slate-300 text-xl max-w-lg">
                        You've earned <span className="text-teal-400 font-bold">{score} out of {QUESTIONS.length}</span> Knowledge Shield points. 
                        You're well on your way to making responsible, healthy choices!
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">Attempts</p>
                        <p className="text-3xl font-black">{attempts}</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">Success Rate</p>
                        <p className="text-3xl font-black">{Math.round((score / QUESTIONS.length) * 100)}%</p>
                    </div>
                </div>
                <button
                  onClick={resetQuiz}
                  className="bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-slate-950 font-black text-xl px-12 py-6 rounded-2xl shadow-2xl transition-all hover:scale-105"
                >
                  Restart Exploration
                </button>
              </div>
            )}
          </section>

          {/* 4. Live Visual Output Area (Right Column) */}
          <section className="lg:col-span-2">
            <div className="sticky top-8 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden aspect-square flex items-center justify-center">
                    {renderVisual}
                </div>
                
                <div className="bg-indigo-900/30 border border-indigo-500/20 rounded-2xl p-6 backdrop-blur-sm">
                    <h5 className="font-black text-xs uppercase tracking-[0.2em] text-indigo-400 mb-4 flex items-center gap-2">
                        <RotateCcw className="w-3 h-3" /> Growth Progress
                    </h5>
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-bold text-slate-400">Biological Understanding</span>
                            <span className="text-xl font-black text-teal-400">{Math.min(score * 20, 100)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-500 transition-all duration-1000" style={{ width: `${Math.min(score * 20, 100)}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
          </section>
        </main>

        {/* 6. Educational Value Footer */}
        <footer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-10 border-t border-slate-800">
          {[
            { icon: <User />, title: "Self-Awareness", desc: "Understanding the natural biological changes in the adolescent body." },
            { icon: <CheckCircle2 />, title: "Hygiene Literacy", desc: "Learning practical steps to maintain health and personal freshness." },
            { icon: <Heart />, title: "Responsible Choices", desc: "Developing the confidence to make safety-first health decisions." },
            { icon: <ShieldCheck />, title: "Confidence", desc: "Normalizing growth milestones to reduce anxiety and myths." }
          ].map((item, i) => (
            <div key={i} className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex gap-4">
              <div className="text-indigo-400 flex-shrink-0 mt-1">{item.icon}</div>
              <div>
                <h6 className="font-black text-white mb-1">{item.title}</h6>
                <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </footer>
      </div>
    </div>
  );
}
