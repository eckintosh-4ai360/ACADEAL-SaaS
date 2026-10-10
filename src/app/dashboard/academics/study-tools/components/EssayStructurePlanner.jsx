"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { GripVertical, ChevronUp, ChevronDown, CheckCircle2, XCircle, Lightbulb, RefreshCcw, BookOpen, Clock, Target, ChevronLeft } from "lucide-react";

export default function EssayStructurePlanner() {
  const initialBlocks = useMemo(() => [
    { id: "intro", title: "Introduction", type: "intro", bg: "bg-purple-100", border: "border-purple-400", fill: "#F3E8FF", stroke: "#A855F7", hint: "Start with a hook! e.g., 'Have you ever wondered...'" },
    { id: "body1", title: "Body Paragraph 1", type: "body", bg: "bg-teal-100", border: "border-teal-400", fill: "#CCFBF1", stroke: "#14B8A6", text: "#134E4A", hint: "State your first point. e.g., 'Firstly, it is important to...'" },
    { id: "body2", title: "Body Paragraph 2", type: "body", bg: "bg-blue-100", border: "border-blue-400", fill: "#DBEAFE", stroke: "#3B82F6", hint: "Add another point. e.g., 'Furthermore, another reason is...'" },
    { id: "body3", title: "Body Paragraph 3", type: "body", bg: "bg-cyan-100", border: "border-cyan-400", fill: "#CFFAFE", stroke: "#06B6D4", hint: "Add a final point or counterargument. e.g., 'Finally, we must consider...'" },
    { id: "conclusion", title: "Conclusion", type: "outro", bg: "bg-indigo-100", border: "border-indigo-400", fill: "#E0E7FF", stroke: "#6366F1", hint: "Summarize and close. e.g., 'In conclusion, it is clear that...'" }
  ], []);

  const [blocks, setBlocks] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [showHints, setShowHints] = useState({});
  const [status, setStatus] = useState(null); // 'correct' | 'incorrect' | null
  const [attempts, setAttempts] = useState(0);

  const shuffleArray = useCallback((array) => {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const initializeGame = useCallback(() => {
    let shuffled = shuffleArray(initialBlocks);
    // Ensure it's not already in correct order
    while (shuffled.map(b => b.id).join(",") === "intro,body1,body2,body3,conclusion") {
      shuffled = shuffleArray(initialBlocks);
    }
    setBlocks(shuffled);
    setStatus(null);
    setAttempts(0);
    setShowHints({});
  }, [initialBlocks, shuffleArray]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const moveBlock = (index, direction) => {
    const newBlocks = [...blocks];
    if (direction === 'up' && index > 0) {
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    } else if (direction === 'down' && index < blocks.length - 1) {
      [newBlocks[index + 1], newBlocks[index]] = [newBlocks[index], newBlocks[index + 1]];
    }
    setBlocks(newBlocks);
    setStatus(null);
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    if(e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newBlocks = [...blocks];
    const draggedBlock = newBlocks[draggedIndex];
    newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(index, 0, draggedBlock);
    
    setBlocks(newBlocks);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setStatus(null);
  };

  const toggleHint = (id) => {
    setShowHints(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const checkAnswer = () => {
    setAttempts(prev => prev + 1);
    const correctOrder = ["intro", "body1", "body2", "body3", "conclusion"];
    const currentOrder = blocks.map(b => b.id);
    const isCorrect = correctOrder.every((id, index) => id === currentOrder[index]);
    setStatus(isCorrect ? "correct" : "incorrect");
  };

  const getFeedbackMessage = () => {
    if (status === "correct") return "Great job! Your essay has a logical structure.";
    if (status === "incorrect") {
      if (blocks[0].id !== "intro") return "Hint: An essay should always start with an Introduction.";
      if (blocks[blocks.length - 1].id !== "conclusion") return "Hint: Remember to wrap up your essay with a Conclusion.";
      return "Hint: Ensure your body paragraphs follow each other sequentially.";
    }
    return "Arrange the blocks in standard essay format.";
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 bg-slate-50 min-h-screen text-slate-800 font-sans">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      {/* 1. Header Area - JHS Styling */}
      <div className="bg-[#1E1B4B] p-6 md:p-8 rounded-t-3xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3 tracking-tight">
            <span>📝</span> Essay Structure Planner
          </h1>
          <p className="text-indigo-200 mt-2 text-lg font-medium">Master the art of logical writing.</p>
        </div>
        <div className="flex gap-3">
          <span className="inline-flex items-center gap-1.5 bg-teal-500 text-teal-50 px-4 py-2 rounded-full text-sm font-bold tracking-wide shadow-md uppercase">
            <BookOpen size={16} /> JHS 1–3
          </span>
          <span className="inline-flex items-center gap-1.5 bg-indigo-700 text-indigo-100 px-4 py-2 rounded-full text-sm font-bold shadow-md">
            <Clock size={16} /> 18 min
          </span>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-b-3xl shadow-xl flex-1 border-x border-b border-slate-200">
        {/* 2. How to Use Box */}
        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-5 mb-8 rounded-r-2xl shadow-sm text-indigo-950 flex flex-col sm:flex-row items-start gap-4">
          <div className="bg-white p-2.5 rounded-full shadow-sm text-indigo-500 shrink-0">
            <Target size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">How to Use</h3>
            <p className="text-indigo-800 leading-relaxed">
              A great sequence makes your essay powerful! Drag the building blocks into the correct logical order, or use the arrows to move them. Stuck on what to write? Click the <strong>AI Hint</strong> button for a brilliant topic sentence starter!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          {/* 3. Interactive Control Zone */}
          <div className="xl:col-span-3 space-y-4">
            {blocks.map((block, index) => (
              <div 
                key={block.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative flex items-center p-4 rounded-2xl shadow-sm border-2 transition-all duration-300 cursor-grab active:cursor-grabbing ${block.bg} ${block.border} ${draggedIndex === index ? 'opacity-50 scale-95' : 'opacity-100 hover:-translate-y-1 hover:shadow-md'}`}
              >
                <div className="mr-3 text-slate-500 hover:text-slate-800 transition-colors">
                  <GripVertical size={28} />
                </div>
                
                <div className="flex-grow">
                  <h3 className="font-bold text-slate-900 text-lg md:text-xl">{block.title}</h3>
                  {showHints[block.id] && (
                    <div className="mt-3 text-sm md:text-base bg-white/80 p-3 rounded-xl text-slate-800 italic border border-white shadow-sm transition-all">
                      💡 <strong>Hint:</strong> {block.hint}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <button 
                    onClick={() => toggleHint(block.id)}
                    className="p-3 bg-white/60 hover:bg-white rounded-full text-indigo-700 transition-all shadow-sm hover:shadow active:scale-95"
                    title="Toggle topic sentence hint"
                  >
                    <Lightbulb size={22} className={showHints[block.id] ? "fill-indigo-200" : ""} />
                  </button>
                  <div className="flex flex-col gap-1.5">
                    <button 
                      onClick={() => moveBlock(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 bg-white/60 hover:bg-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                      <ChevronUp size={20} />
                    </button>
                    <button 
                      onClick={() => moveBlock(index, 'down')}
                      disabled={index === blocks.length - 1}
                      className="p-1.5 bg-white/60 hover:bg-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                      <ChevronDown size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 4. Live Visual Output Area & 5. Score / Feedback Panel */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            
            {/* Visual Generator SVG Output */}
            <div className="bg-slate-50 p-6 rounded-3xl shadow-inner border border-slate-200 flex-grow flex flex-col items-center justify-start min-h-[400px]">
              <h3 className="font-bold text-slate-500 mb-6 uppercase tracking-widest text-sm flex items-center gap-2">
                <Target size={16} /> Live Structure Map
              </h3>
              
              <svg viewBox="0 0 240 500" className="w-full max-w-[240px] h-full transition-all duration-300">
                <defs>
                  <marker id="arrowhead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" />
                  </marker>
                </defs>
                {blocks.map((block, i) => {
                  const yPos = i * 90;
                  return (
                    <g key={`svg-${block.id}`} className="transition-all duration-500 ease-in-out" style={{ transform: `translateY(${yPos}px)` }}>
                      <rect x="20" y="10" width="200" height="60" rx="12" fill={block.fill} stroke={block.stroke} strokeWidth="3" />
                      
                      <line x1="40" y1="30" x2="100" y2="30" stroke={block.stroke} strokeWidth="4" strokeLinecap="round" opacity="0.7"/>
                      <line x1="40" y1="45" x2="200" y2="45" stroke={block.stroke} strokeWidth="4" strokeLinecap="round" opacity="0.4"/>
                      <line x1="40" y1="55" x2="160" y2="55" stroke={block.stroke} strokeWidth="4" strokeLinecap="round" opacity="0.4"/>
                      
                      <text x="210" y="32" textAnchor="end" fontSize="14" fontWeight="bold" fill={block.stroke}>
                        {block.title.includes("Body") ? "Body" : block.title}
                      </text>
                      
                      {i < blocks.length - 1 && (
                        <line x1="120" y1="70" x2="120" y2="92" stroke="#94A3B8" strokeWidth="3" markerEnd="url(#arrowhead)" />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Assessment Panel */}
            <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-500"></div>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5 mt-2">
                <button 
                  onClick={checkAnswer}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-full font-bold text-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                >
                  Check My Answer
                </button>
                <button 
                  onClick={initializeGame}
                  className="w-full sm:w-auto px-6 py-3.5 flex items-center justify-center gap-2 text-slate-600 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 rounded-full font-bold transition-colors"
                >
                  <RefreshCcw size={20} /> Reset
                </button>
              </div>
              
              <div className={`min-h-[88px] p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 ${status === 'correct' ? 'bg-emerald-50 text-emerald-900 border-2 border-emerald-300' : status === 'incorrect' ? 'bg-rose-50 text-rose-900 border-2 border-rose-300' : 'bg-slate-50 text-slate-600 border-2 border-slate-200'}`}>
                {status === 'correct' && <CheckCircle2 size={36} className="text-emerald-500 shrink-0" />}
                {status === 'incorrect' && <XCircle size={36} className="text-rose-500 shrink-0" />}
                {!status && <div className="w-9 h-9 rounded-full border-4 border-slate-300 border-dotted shrink-0 animate-spin-slow"></div>}
                
                <div>
                  <p className="font-extrabold text-lg">{status === 'correct' ? '✅ Correct!' : status === 'incorrect' ? '❌ Try Again!' : 'Waiting for answer...'}</p>
                  <p className="text-sm font-medium mt-0.5">{getFeedbackMessage()}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-slate-400 mt-4 text-center tracking-wide uppercase">Attempts: {attempts}</p>
            </div>
          </div>
        </div>

        {/* 6. Educational Value Footer */}
        <div className="bg-slate-50 rounded-3xl p-6 md:p-8 mt-10 border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-5 text-lg md:text-xl flex items-center gap-2">
            🎓 Why is Essay Structure Important?
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-slate-700">
            <li className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-indigo-500 font-bold mt-0.5 text-lg">•</span>
              <span className="leading-relaxed">Provides a clear, logical map for the reader to understand your main arguments.</span>
            </li>
            <li className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-indigo-500 font-bold mt-0.5 text-lg">•</span>
              <span className="leading-relaxed">Helps you stay focused on your topic rather than repeating ideas haphazardly.</span>
            </li>
            <li className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-indigo-500 font-bold mt-0.5 text-lg">•</span>
              <span className="leading-relaxed">Scores higher marks in BECE as examiners specifically look for logical progression.</span>
            </li>
            <li className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-indigo-500 font-bold mt-0.5 text-lg">•</span>
              <span className="leading-relaxed">Ensures you never forget the crucial parts: a strong hook and an impactful conclusion.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
