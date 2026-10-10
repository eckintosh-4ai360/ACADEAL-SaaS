"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Play, 
  RotateCcw, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  HelpCircle, 
  ArrowDown, 
  Zap,
  Layout,
  MousePointer2,
  Terminal
} from "lucide-react";

/**
 * AlgorithmFlowchartBuilder Component
 * A self-contained interactive tool for JHS students to learn computational thinking
 * through building and tracing flowcharts for everyday tasks.
 */
export default function AlgorithmFlowchartBuilder() {
  // Tasks definitions based on Ghana NaCCA ICT Curriculum (JHS 1-3)
  const TASKS = [
    {
      id: "tea",
      title: "Making Tea",
      description: "Build a flowchart to make a perfect cup of Ghanaian tea.",
      target: [
        { type: "start", text: "Start" },
        { type: "process", text: "Boil water in kettle" },
        { type: "decision", text: "Is water boiling?", yes: "Add tea bag", no: "Wait 1 minute" },
        { type: "process", text: "Add milk and sugar" },
        { type: "end", text: "End" }
      ],
      hints: ["Every flowchart must start with a 'Start' oval!", "Decisions always have two paths."]
    },
    {
      id: "even-odd",
      title: "Even or Odd?",
      description: "Create an algorithm to check if a number is even or odd.",
      target: [
        { type: "start", text: "Start" },
        { type: "process", text: "Input Number" },
        { type: "decision", text: "Number % 2 == 0?", yes: "Print 'Even'", no: "Print 'Odd'" },
        { type: "end", text: "End" }
      ],
      hints: ["The percent sign (%) means remainder in computing!", "Diamonds are for decisions."]
    },
    {
      id: "grading",
      title: "Score Grader",
      description: "Design a logic to see if a student passed their ICT exam.",
      target: [
        { type: "start", text: "Start" },
        { type: "process", text: "Get Score" },
        { type: "decision", text: "Score >= 50?", yes: "Output 'Pass'", no: "Output 'Fail'" },
        { type: "end", text: "End" }
      ],
      hints: ["Input comes before making a decision.", "Output is usually the last step before End."]
    }
  ];

  const BLOCK_TYPES = [
    { type: "start", label: "Start/End", icon: "🟢", color: "bg-emerald-600", shape: "oval" },
    { type: "process", label: "Process", icon: "🟦", color: "bg-sky-600", shape: "rect" },
    { type: "decision", label: "Decision", icon: "🔶", color: "bg-amber-500", shape: "diamond" },
    { type: "end", label: "End", icon: "🔴", color: "bg-rose-600", shape: "oval" }
  ];

  // State
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [userBlocks, setUserBlocks] = useState([]);
  const [activeStep, setActiveStep] = useState(-1);
  const [isTracing, setIsTracing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const currentTask = TASKS[currentTaskIndex];

  // Initialize task
  useEffect(() => {
    setUserBlocks([]);
    setFeedback(null);
    setActiveStep(-1);
    setIsTracing(false);
  }, [currentTaskIndex]);

  // Actions
  const addBlock = (type) => {
    const newBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      text: type === "start" ? "Start" : type === "end" ? "End" : "Enter action...",
      yesBranch: type === "decision" ? "Yes action" : null,
      noBranch: type === "decision" ? "No action" : null,
    };
    setUserBlocks([...userBlocks, newBlock]);
    setFeedback(null);
  };

  const removeBlock = (id) => {
    setUserBlocks(userBlocks.filter(b => b.id !== id));
    setFeedback(null);
  };

  const updateBlockText = (id, field, value) => {
    setUserBlocks(userBlocks.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const checkAnswer = () => {
    setAttempts(prev => prev + 1);
    
    // Simple validation logic
    if (userBlocks.length === 0) {
      setFeedback({ type: "error", message: "Your flowchart is empty! Drag some blocks." });
      return;
    }

    const isCorrectLength = userBlocks.length === currentTask.target.length;
    const hasCorrectStart = userBlocks[0]?.type === "start";
    const hasCorrectEnd = userBlocks[userBlocks.length - 1]?.type === "end";
    
    // Check sequence of types
    const sequenceCorrect = userBlocks.every((block, i) => block.type === currentTask.target[i]?.type);

    if (sequenceCorrect && hasCorrectStart && hasCorrectEnd && isCorrectLength) {
      setFeedback({ type: "success", message: "Brilliant! Your logic is solid. Ghanaian excellence! 🇬🇭" });
    } else {
      let hint = "Compare your shapes with the task requirements.";
      if (!hasCorrectStart) hint = "A flowchart always starts with an oval 'Start' block.";
      else if (!hasCorrectEnd) hint = "Don't forget the 'End' block at the bottom!";
      else if (!isCorrectLength) hint = `Your flowchart needs exactly ${currentTask.target.length} steps.`;
      
      setFeedback({ type: "error", message: `Not quite right yet. ${hint}` });
    }
  };

  const traceExecution = useCallback(() => {
    if (userBlocks.length === 0) return;
    setIsTracing(true);
    let step = 0;
    
    const interval = setInterval(() => {
      setActiveStep(step);
      step++;
      if (step >= userBlocks.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsTracing(false);
          setActiveStep(-1);
        }, 1000);
      }
    }, 800);
  }, [userBlocks]);

  // SVG Flowchart Renderer
  const FlowchartVisual = () => {
    const width = 400;
    const blockHeight = 60;
    const verticalGap = 40;
    const totalHeight = userBlocks.length * (blockHeight + verticalGap) + 100;

    return (
      <svg width="100%" height={Math.max(400, totalHeight)} viewBox={`0 0 ${width} ${totalHeight}`} className="bg-slate-900/40 rounded-xl">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
        </defs>

        {userBlocks.map((block, i) => {
          const y = 50 + i * (blockHeight + verticalGap);
          const isActive = activeStep === i;
          const x = width / 2;

          return (
            <g key={block.id} className="transition-all duration-500">
              {/* Connector Arrow */}
              {i < userBlocks.length - 1 && (
                <line 
                  x1={x} y1={y + blockHeight/2} 
                  x2={x} y2={y + blockHeight + verticalGap - 30} 
                  stroke="#475569" strokeWidth="2" strokeDasharray="4"
                  markerEnd="url(#arrow)"
                />
              )}

              {/* Shape */}
              {block.type === 'start' || block.type === 'end' ? (
                <rect 
                  x={x - 60} y={y - 25} width="120" height="50" rx="25" 
                  fill={isActive ? '#10b981' : '#1e293b'} 
                  stroke={isActive ? '#34d399' : '#475569'} strokeWidth="2"
                  className="transition-colors duration-300"
                />
              ) : block.type === 'decision' ? (
                <path 
                  d={`M ${x} ${y-35} L ${x+70} ${y} L ${x} ${y+35} L ${x-70} ${y} Z`}
                  fill={isActive ? '#f59e0b' : '#1e293b'} 
                  stroke={isActive ? '#fbbf24' : '#475569'} strokeWidth="2"
                  className="transition-colors duration-300"
                />
              ) : (
                <rect 
                  x={x - 75} y={y - 30} width="150" height="60" rx="4"
                  fill={isActive ? '#0ea5e9' : '#1e293b'} 
                  stroke={isActive ? '#38bdf8' : '#475569'} strokeWidth="2"
                  className="transition-colors duration-300"
                />
              )}

              {/* Label */}
              <text 
                x={x} y={y+5} textAnchor="middle" 
                className="fill-slate-100 text-xs font-medium select-none"
              >
                {block.text.length > 20 ? block.text.substring(0, 18) + '...' : block.text}
              </text>

              {/* Step indicator */}
              {isActive && (
                <circle cx={x - 90} cy={y} r="8" fill="#fbbf24" className="animate-ping" />
              )}
            </g>
          );
        })}

        {userBlocks.length === 0 && (
          <text x="50%" y="50%" textAnchor="middle" fill="#475569" className="italic text-sm">
            Flowchart will appear here...
          </text>
        )}
      </svg>
    );
  };

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto p-4 md:p-6 bg-slate-950 text-slate-100 font-sans min-h-screen">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      {/* 1. Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-indigo-900/50 pb-6">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-teal-400 bg-clip-text text-transparent flex items-center gap-3">
            <span className="text-4xl">🧩</span> Algorithm & Flowchart Builder
          </h1>
          <p className="text-indigo-300/80 mt-1 italic">Master computational thinking step-by-step.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-4 py-1.5 bg-indigo-900/50 border border-indigo-500/30 text-indigo-200 text-xs font-bold rounded-full uppercase tracking-wider backdrop-blur-sm">
            JHS 1–3
          </span>
          <span className="px-4 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-full flex items-center gap-2">
            <Zap size={14} className="text-amber-400" /> 20 MIN
          </span>
        </div>
      </header>

      {/* 2. How to Use & Task Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <div className="lg:col-span-8 bg-indigo-900/20 border border-indigo-500/20 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <h2 className="text-lg font-bold text-indigo-300 flex items-center gap-2 mb-3">
            <HelpCircle size={20} /> How to Use
          </h2>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex gap-2">
              <span className="w-5 h-5 bg-indigo-500/30 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
              Select a task from the drawer and drag shapes into the builder.
            </li>
            <li className="flex gap-2">
              <span className="w-5 h-5 bg-indigo-500/30 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
              Enter the steps for the algorithm in the text boxes.
            </li>
            <li className="flex gap-2">
              <span className="w-5 h-5 bg-indigo-500/30 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
              Click "Trace Logic" to see your logic execute visually!
            </li>
          </ul>
        </div>

        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">Choose Challenge</label>
          <div className="flex flex-col gap-2">
            {TASKS.map((t, idx) => (
              <button
                key={t.id}
                onClick={() => setCurrentTaskIndex(idx)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 flex items-center justify-between group ${
                  currentTaskIndex === idx
                  ? 'bg-indigo-600 shadow-indigo-900/20 shadow-lg translate-x-1'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                <div>
                  <div className="font-bold flex items-center gap-2 text-sm">
                    {idx === currentTaskIndex ? '🎯' : '📄'} {t.title}
                  </div>
                  <div className="text-[10px] opacity-70 mt-0.5">{t.target.length} steps</div>
                </div>
                <ArrowDown size={14} className={currentTaskIndex === idx ? 'rotate-[-90deg]' : ''} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* 3. Interactive Control Zone & Builder */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-6">
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Layout size={20} className="text-indigo-400" /> Logical Steps
              </h3>
              <div className="flex gap-2 flex-wrap">
                {BLOCK_TYPES.map(bt => (
                  <button
                    key={bt.type}
                    onClick={() => addBlock(bt.type)}
                    className={`${bt.color} hover:scale-105 active:scale-95 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg`}
                  >
                    <Plus size={14} /> {bt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {userBlocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500">
                  <MousePointer2 size={32} className="mb-2 opacity-20" />
                  <p className="text-sm">No blocks added yet. Start your algorithm above!</p>
                </div>
              ) : (
                userBlocks.map((block, index) => (
                  <div 
                    key={block.id}
                    className="flex items-center gap-3 p-3 bg-slate-800/80 border border-slate-700 rounded-xl group hover:border-indigo-500/50 transition-all duration-300"
                  >
                    <div className="flex flex-col gap-1 items-center shrink-0 w-8">
                      <div className="text-[10px] font-mono text-slate-500">#{index + 1}</div>
                      <span className={`w-3 h-3 rounded-full ${BLOCK_TYPES.find(b => b.type === block.type).color}`}></span>
                    </div>

                    <div className="flex-1 space-y-2">
                      <input 
                        type="text"
                        value={block.text}
                        onChange={(e) => updateBlockText(block.id, 'text', e.target.value)}
                        placeholder="Action description..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                      {block.type === 'decision' && (
                        <div className="flex gap-3 mt-2">
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-[10px] font-bold text-emerald-500">YES:</span>
                            <input 
                              type="text" 
                              value={block.yesBranch}
                              onChange={(e) => updateBlockText(block.id, 'yesBranch', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs" 
                            />
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-[10px] font-bold text-rose-500">NO:</span>
                            <input 
                              type="text" 
                              value={block.noBranch}
                              onChange={(e) => updateBlockText(block.id, 'noBranch', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs" 
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => removeBlock(block.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-6 flex gap-3">
              <button 
                onClick={traceExecution}
                disabled={isTracing || userBlocks.length === 0}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <Play size={18} fill="currentColor" /> Trace Logic
              </button>
              <button 
                onClick={() => setUserBlocks([])}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw size={18} /> Clear
              </button>
            </div>
          </div>
        </div>

        {/* 4. Live Visual Output Area */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 overflow-hidden flex flex-col h-full shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Terminal size={20} className="text-teal-400" /> Flowchart Visual
              </h3>
              {isTracing && (
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div> TRACING...
                </div>
              )}
            </div>
            
            <div className="flex-1 min-h-[400px] overflow-y-auto custom-scrollbar bg-slate-950 rounded-xl p-4 border border-slate-800">
               <FlowchartVisual />
            </div>

            {/* Hint Box (Conditional) */}
            {currentTask.hints && (
              <div className="mt-4 p-3 bg-amber-900/20 border border-amber-500/20 rounded-xl text-[11px] text-amber-200/80 italic flex items-start gap-2">
                <HelpCircle size={14} className="mt-0.5 shrink-0" />
                <p><strong>Tip:</strong> {currentTask.hints[attempts % currentTask.hints.length]}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Score / Feedback Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
              Current Mission: <span className="text-indigo-400">{currentTask.title}</span>
            </h3>
            <p className="text-lg text-slate-200 font-medium">{currentTask.description}</p>
          </div>
          
          <div className="flex flex-col items-center gap-2 shrink-0">
             <button 
                onClick={checkAnswer}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl flex items-center gap-3 transition-all scale-100 hover:scale-105 active:scale-95 shadow-xl shadow-indigo-900/40"
              >
                <CheckCircle2 size={24} /> Check My Logic
              </button>
              <span className="text-xs font-bold text-slate-500">ATTEMPTS: {attempts}</span>
          </div>
        </div>

        {feedback && (
          <div className={`mt-6 p-4 rounded-xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 ${
            feedback.type === 'success' ? 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-100' : 'bg-rose-900/30 border border-rose-500/30 text-rose-100'
          }`}>
            <span className="text-2xl">{feedback.type === 'success' ? '✅' : '❌'}</span>
            <div className="text-sm font-bold">{feedback.message}</div>
          </div>
        )}
      </div>

      {/* 6. Educational Value Footer */}
      <footer className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-8 border-t border-slate-800 pt-8 mt-auto">
        <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800/50">
          <div className="text-indigo-400 font-bold text-xs mb-1">LEARNING #1</div>
          <div className="text-[11px] text-slate-400 leading-tight">Master sequential instructions and step-by-step logic.</div>
        </div>
        <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800/50">
          <div className="text-emerald-400 font-bold text-xs mb-1">LEARNING #2</div>
          <div className="text-[11px] text-slate-400 leading-tight">Identify decisions and conditional pathways in coding.</div>
        </div>
        <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800/50">
          <div className="text-amber-400 font-bold text-xs mb-1">LEARNING #3</div>
          <div className="text-[11px] text-slate-400 leading-tight">Translate everyday tasks into structured ICT flowcharts.</div>
        </div>
        <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800/50">
          <div className="text-sky-400 font-bold text-xs mb-1">LEARNING #4</div>
          <div className="text-[11px] text-slate-400 leading-tight">Trace execution to debug and find logical errors.</div>
        </div>
      </footer>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(79, 70, 229, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(79, 70, 229, 0.6);
        }
      `}</style>
    </div>
  );
}
