"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Plus, Minus, RotateCcw, Check, ArrowRight, Lightbulb, ChevronLeft } from "lucide-react";

export default function AlgebraBalanceScale() {
  // Game levels: starting simple and getting progressively harder
  const levels = [
    { targetLeftX: 1, targetLeftC: 3, targetRightX: 0, targetRightC: 7, trueX: 4 }, // x + 3 = 7
    { targetLeftX: 2, targetLeftC: 1, targetRightX: 0, targetRightC: 9, trueX: 4 }, // 2x + 1 = 9
    { targetLeftX: 3, targetLeftC: 0, targetRightX: 1, targetRightC: 6, trueX: 3 }, // 3x = x + 6
    { targetLeftX: 2, targetLeftC: -2, targetRightX: 0, targetRightC: 6, trueX: 4 }, // 2x - 2 = 6
    { targetLeftX: 4, targetLeftC: -1, targetRightX: 2, targetRightC: 5, trueX: 3 }, // 4x - 1 = 2x + 5
  ];

  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [leftX, setLeftX] = useState(0);
  const [leftC, setLeftC] = useState(0);
  const [rightX, setRightX] = useState(0);
  const [rightC, setRightC] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState(null);
  
  const currentLevel = levels[currentLevelIdx];
  
  // Calculate the "weight" of each side based on the true value of x
  const leftWeight = leftX * currentLevel.trueX + leftC;
  const rightWeight = rightX * currentLevel.trueX + rightC;
  
  // Calculate the difference for the tilt of the balance scale
  const tiltAngle = useMemo(() => {
    const diff = rightWeight - leftWeight;
    // Limit maximum tilt angle to 25 degrees
    return Math.max(-25, Math.min(25, diff * 3));
  }, [leftWeight, rightWeight]);

  // Load a new problem
  const loadLevel = useCallback((idx) => {
    const level = levels[idx];
    setLeftX(level.targetLeftX);
    setLeftC(level.targetLeftC);
    setRightX(level.targetRightX);
    setRightC(level.targetRightC);
    setAttempts(0);
    setFeedback(null);
  }, []);

  // Initial load
  useEffect(() => {
    loadLevel(currentLevelIdx);
  }, [currentLevelIdx, loadLevel]);

  // Reset current scale to the problem state
  const handleReset = () => {
    loadLevel(currentLevelIdx);
  };

  const handleNextLevel = () => {
    if (currentLevelIdx < levels.length - 1) {
      setCurrentLevelIdx((prev) => prev + 1);
    } else {
      setFeedback({ type: "success", title: "🎉 Amazing!", message: "You have completed all levels!" });
    }
  };

  // Check the student's answer
  const checkAnswer = () => {
    setAttempts((prev) => prev + 1);
    
    const isBalanced = leftWeight === rightWeight;
    const xIsolatedLeft = leftX === 1 && leftC === 0 && rightX === 0;
    const xIsolatedRight = rightX === 1 && rightC === 0 && leftX === 0;
    
    if (!isBalanced) {
      setFeedback({ 
        type: "error", 
        title: "❌ Try Again", 
        message: "The scale is tipped! You must do the exact same thing to both sides to keep it balanced." 
      });
    } else if (xIsolatedLeft || xIsolatedRight) {
      const answer = xIsolatedLeft ? rightC : leftC;
      if (answer === currentLevel.trueX) {
        setFeedback({ 
          type: "success", 
          title: "✅ Correct!", 
          message: `Great job! You isolated x and found that x = ${answer}.` 
        });
      } else {
        setFeedback({ 
          type: "error", 
          title: "❌ Hmm...", 
          message: "Wait, the math isn't mathing. Try resetting the scale." 
        });
      }
    } else {
      setFeedback({ 
        type: "warning", 
        title: "⚖️ Balanced but unresolved", 
        message: "The scale is balanced, but x isn't alone yet! Keep simplifying until you have only ONE 'x' box on one side, and numbers on the other." 
      });
    }
  };

  // Helper to change contents of the scale
  const updateItems = (side, type, amount) => {
    // Clear feedback when making a move
    if (feedback?.type === "error" || feedback?.type === "warning") {
      setFeedback(null);
    }
    
    if (side === "left") {
      if (type === "x") setLeftX((prev) => prev + amount);
      if (type === "c") setLeftC((prev) => prev + amount);
    } else {
      if (type === "x") setRightX((prev) => prev + amount);
      if (type === "c") setRightC((prev) => prev + amount);
    }
  };

  // Renders the algebraic expression for a given side
  const renderExpression = (xCount, cCount) => {
    if (xCount === 0 && cCount === 0) return "0";
    
    let expr = "";
    if (xCount !== 0) {
      expr += xCount === 1 ? "x" : xCount === -1 ? "-x" : `${xCount}x`;
    }
    
    if (cCount !== 0) {
      if (xCount !== 0) {
        expr += cCount > 0 ? ` + ${cCount}` : ` - ${Math.abs(cCount)}`;
      } else {
        expr += `${cCount}`;
      }
    }
    
    return expr;
  };

  // Component to render items blocks on a scale pan
  const ScaleBlocks = ({ xCount, cCount, isLeft }) => {
    return (
      <div className="flex flex-wrap items-end justify-center gap-1 w-full max-w-[140px] mb-2 min-h-[80px]">
        {/* Render negative items differently to visual distinguish them */}
        {xCount > 0 && Array.from({ length: xCount }).map((_, i) => (
          <div key={`pos-x-${i}`} className="w-10 h-10 bg-teal-600 rounded-lg shadow-sm border-2 border-teal-800 flex items-center justify-center font-bold text-white text-lg transition-transform hover:-translate-y-1">
            x
          </div>
        ))}
        {xCount < 0 && Array.from({ length: Math.abs(xCount) }).map((_, i) => (
          <div key={`neg-x-${i}`} className="w-10 h-10 bg-rose-500 rounded-lg shadow-sm border-2 border-rose-700 border-dashed flex items-center justify-center font-bold text-white text-lg transition-transform hover:-translate-y-1">
            -x
          </div>
        ))}
        
        {cCount > 0 && Array.from({ length: cCount }).map((_, i) => (
          <div key={`pos-c-${i}`} className="w-8 h-8 bg-amber-400 rounded-lg shadow-sm border-2 border-amber-600 flex items-center justify-center font-bold text-amber-900 transition-transform hover:-translate-y-1">
            1
          </div>
        ))}
        {cCount < 0 && Array.from({ length: Math.abs(cCount) }).map((_, i) => (
          <div key={`neg-c-${i}`} className="w-8 h-8 bg-purple-400 rounded-lg shadow-sm border-2 border-purple-600 border-dashed flex items-center justify-center font-bold text-white transition-transform hover:-translate-y-1">
            -1
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-50 rounded-3xl overflow-hidden shadow-2xl font-sans text-slate-800">
      {/* ── BACK BUTTON ── */}
      <div className="p-4 bg-slate-50">
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
      </div>

      {/* Header section */}
      <div className="bg-gradient-to-r from-indigo-900 to-teal-800 p-6 sm:p-8 text-white relative">
        <div className="absolute top-6 right-6 flex gap-2">
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm border border-white/10">JHS 1–3</span>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm border border-white/10 flex items-center gap-1">⏰ 20m</span>
        </div>
        
        <div className="flex items-center gap-4 mb-3">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-white/5">
            ⚖️
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Algebra Balance Scale</h1>
            <p className="text-teal-200 text-lg font-medium opacity-90">What you do to one side, you must do to the other!</p>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-6 sm:p-8 bg-white">
        
        {/* Instructions */}
        <div className="bg-indigo-50 rounded-2xl p-5 mb-8 border border-indigo-100 flex gap-4 items-start shadow-sm">
          <div className="bg-indigo-500 rounded-full p-2 text-white mt-1 shrink-0 shadow-sm">
            <Lightbulb size={24} />
          </div>
          <div>
            <h3 className="font-bold text-indigo-900 text-lg mb-1">How to Use</h3>
            <p className="text-indigo-800/80 leading-relaxed font-medium">
              Solve the equation by keeping the scale balanced! Add or subtract the same amount of <span className="font-bold text-teal-700 bg-teal-100 px-1 rounded">x variables</span> or <span className="font-bold text-amber-700 bg-amber-100 px-1 rounded">constant numbers</span> from <span className="underline decoration-indigo-400 decoration-2 underline-offset-2">both sides</span>. Your goal is to get one single <span className="font-bold">x</span> isolated on one side.
            </p>
          </div>
        </div>

        {/* Level Indicator and Equation Display */}
        <div className="text-center mb-6">
          <div className="inline-block bg-slate-100 rounded-full px-4 py-1.5 text-slate-500 font-bold text-sm mb-3 tracking-wide uppercase shadow-sm border border-slate-200">
            Problem {currentLevelIdx + 1} of {levels.length}
          </div>
          
          <div className="bg-slate-900 rounded-3xl p-5 shadow-inner border-4 border-slate-800 max-w-2xl mx-auto flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-slate-800/50 bg-[radial-gradient(#ffffff11_1px,transparent_1px)] [background-size:16px_16px]"></div>
            
            <div className="flex items-center justify-center gap-4 sm:gap-8 w-full font-mono text-3xl sm:text-5xl font-bold z-10">
              <div className="flex-1 text-right text-teal-300 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)] whitespace-nowrap">
                {renderExpression(leftX, leftC)}
              </div>
              <div className={`text-slate-400 transition-colors duration-300 w-8 text-center flex-shrink-0 ${leftWeight === rightWeight ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : leftWeight > rightWeight ? "text-rose-400" : "text-rose-400"}`}>
                {leftWeight === rightWeight ? "=" : leftWeight > rightWeight ? ">" : "<"}
              </div>
              <div className="flex-1 text-left text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)] whitespace-nowrap">
                {renderExpression(rightX, rightC)}
              </div>
            </div>
          </div>
        </div>

        {/* Visual Balance Scale Area */}
        <div className="my-12 relative flex justify-center items-end h-80 bg-gradient-to-b from-blue-50/50 to-indigo-50/50 rounded-3xl border border-indigo-50/50 p-6 shadow-inner">
          
          {/* Main Balance Container that rotates */}
          <div 
            className="absolute bottom-24 w-[90%] sm:w-3/4 max-w-xl h-4 origin-bottom transition-all duration-700 ease-in-out"
            style={{ transform: `rotate(${tiltAngle}deg)` }}
          >
            {/* The structural beam */}
            <div className="absolute inset-x-0 h-4 bg-slate-700 rounded-full shadow-lg border-b-2 border-slate-800"></div>
            
            {/* Left Pan Container */}
            <div className="absolute left-4 top-4 transform origin-top w-36 transition-all duration-700 ease-in-out" style={{ transform: `rotate(${-tiltAngle}deg)` }}>
              {/* Strings */}
              <div className="absolute left-2 top-0 w-px h-24 bg-slate-400"></div>
              <div className="absolute right-2 top-0 w-px h-24 bg-slate-400"></div>
              
              {/* The Pan */}
              <div className="absolute top-24 -left-6 w-48 h-6 bg-indigo-500 rounded-b-full shadow-[0_10px_15px_-3px_rgba(99,102,241,0.5)] border-t-4 border-indigo-400 flex justify-center items-end pb-3 z-10 overflow-visible">
                <ScaleBlocks xCount={leftX} cCount={leftC} isLeft={true} />
              </div>
            </div>

            {/* Right Pan Container */}
            <div className="absolute right-4 top-4 transform origin-top w-36 transition-all duration-700 ease-in-out" style={{ transform: `rotate(${-tiltAngle}deg)` }}>
              {/* Strings */}
              <div className="absolute left-2 top-0 w-px h-24 bg-slate-400"></div>
              <div className="absolute right-2 top-0 w-px h-24 bg-slate-400"></div>
              
              {/* The Pan */}
              <div className="absolute top-24 -left-6 w-48 h-6 bg-indigo-500 rounded-b-full shadow-[0_10px_15px_-3px_rgba(99,102,241,0.5)] border-t-4 border-indigo-400 flex justify-center items-end pb-3 z-10 overflow-visible">
                <ScaleBlocks xCount={rightX} cCount={rightC} isLeft={false} />
              </div>
            </div>
            
            {/* Center Pivot Point */}
            <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 w-6 h-6 rounded-full bg-slate-800 border-4 border-slate-600 shadow-xl z-20"></div>
          </div>
          
          {/* Base Stand with Base */}
          <div className="absolute bottom-6 w-8 h-20 bg-gradient-to-b from-slate-600 to-slate-800 rounded-t-lg shadow-lg z-10 border-x border-slate-500"></div>
          <div className="absolute bottom-0 w-32 h-6 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-lg shadow-xl shadow-slate-900/20 border-t border-slate-600"></div>
        </div>

        {/* Interactive Controls Zone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-12 mb-8">
          {/* Left Controls */}
          <div className="bg-slate-50 p-5 rounded-3xl border-2 border-slate-200/60 shadow-sm flex flex-col items-center">
            <h4 className="font-bold text-slate-500 uppercase tracking-widest text-sm mb-4">Left Side Actions</h4>
            
            <div className="flex flex-col gap-4 w-full text-slate-700">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-teal-600 rounded flex justify-center items-center text-white font-bold text-sm shadow-sm">x</div>
                  <span className="font-bold text-lg">Variables</span>
                </div>
                <div className="flex bg-slate-200 rounded-full p-1 shadow-inner">
                  <button onClick={() => updateItems("left", "x", 1)} className="w-12 h-10 rounded-full bg-white text-slate-800 flex items-center justify-center font-bold text-xl hover:bg-teal-50 hover:text-teal-700 hover:shadow-md active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <Plus size={20} />
                  </button>
                  <button onClick={() => updateItems("left", "x", -1)} className="w-12 h-10 rounded-full bg-transparent hover:bg-white text-slate-600 hover:text-rose-600 hover:shadow-md active:scale-95 transition-all flex items-center justify-center font-bold text-xl ml-1 focus:outline-none focus:ring-2 focus:ring-rose-500">
                    <Minus size={20} />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-amber-400 rounded flex justify-center items-center text-amber-900 font-bold text-xs shadow-sm">1</div>
                  <span className="font-bold text-lg">Constants</span>
                </div>
                <div className="flex bg-slate-200 rounded-full p-1 shadow-inner">
                  <button onClick={() => updateItems("left", "c", 1)} className="w-12 h-10 rounded-full bg-white text-slate-800 flex items-center justify-center font-bold text-xl hover:bg-amber-100 hover:text-amber-800 hover:shadow-md active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <Plus size={20} />
                  </button>
                  <button onClick={() => updateItems("left", "c", -1)} className="w-12 h-10 rounded-full bg-transparent hover:bg-white text-slate-600 hover:text-rose-600 hover:shadow-md active:scale-95 transition-all flex items-center justify-center font-bold text-xl ml-1 focus:outline-none focus:ring-2 focus:ring-rose-500">
                    <Minus size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="bg-slate-50 p-5 rounded-3xl border-2 border-slate-200/60 shadow-sm flex flex-col items-center">
            <h4 className="font-bold text-slate-500 uppercase tracking-widest text-sm mb-4">Right Side Actions</h4>
            
            <div className="flex flex-col gap-4 w-full text-slate-700">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-teal-600 rounded flex justify-center items-center text-white font-bold text-sm shadow-sm">x</div>
                  <span className="font-bold text-lg">Variables</span>
                </div>
                <div className="flex bg-slate-200 rounded-full p-1 shadow-inner">
                  <button onClick={() => updateItems("right", "x", 1)} className="w-12 h-10 rounded-full bg-white text-slate-800 flex items-center justify-center font-bold text-xl hover:bg-teal-50 hover:text-teal-700 hover:shadow-md active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <Plus size={20} />
                  </button>
                  <button onClick={() => updateItems("right", "x", -1)} className="w-12 h-10 rounded-full bg-transparent hover:bg-white text-slate-600 hover:text-rose-600 hover:shadow-md active:scale-95 transition-all flex items-center justify-center font-bold text-xl ml-1 focus:outline-none focus:ring-2 focus:ring-rose-500">
                    <Minus size={20} />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-amber-400 rounded flex justify-center items-center text-amber-900 font-bold text-xs shadow-sm">1</div>
                  <span className="font-bold text-lg">Constants</span>
                </div>
                <div className="flex bg-slate-200 rounded-full p-1 shadow-inner">
                  <button onClick={() => updateItems("right", "c", 1)} className="w-12 h-10 rounded-full bg-white text-slate-800 flex items-center justify-center font-bold text-xl hover:bg-amber-100 hover:text-amber-800 hover:shadow-md active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <Plus size={20} />
                  </button>
                  <button onClick={() => updateItems("right", "c", -1)} className="w-12 h-10 rounded-full bg-transparent hover:bg-white text-slate-600 hover:text-rose-600 hover:shadow-md active:scale-95 transition-all flex items-center justify-center font-bold text-xl ml-1 focus:outline-none focus:ring-2 focus:ring-rose-500">
                    <Minus size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Area */}
        {feedback && (
          <div className={`mb-6 p-5 rounded-2xl flex items-start gap-4 shadow-md transform transition-all animate-bounce-in ${
            feedback.type === 'success' ? 'bg-emerald-50 border-2 border-emerald-400 text-emerald-900' :
            feedback.type === 'error' ? 'bg-rose-50 border-2 border-rose-300 text-rose-900' :
            'bg-amber-50 border-2 border-amber-300 text-amber-900'
          }`}>
            <div className="text-2xl mt-1 shrink-0">{feedback.type === 'success' ? '🎉' : feedback.type === 'error' ? '❌' : '⚡'}</div>
            <div>
              <h4 className="font-bold text-lg">{feedback.title}</h4>
              <p className="font-medium mt-1 leading-snug">{feedback.message}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-2">
          {feedback?.type === 'success' && currentLevelIdx < levels.length - 1 ? (
            <button 
              onClick={handleNextLevel}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xl rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              Next Problem <ArrowRight size={24} />
            </button>
          ) : (
            <button 
              onClick={checkAnswer}
              disabled={feedback?.type === 'success'}
              className={`flex-1 py-4 px-6 font-bold text-xl rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 ${
                feedback?.type === 'success' 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed hidden sm:flex' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white hover:shadow-xl active:scale-95'
              }`}
            >
              <Check size={24} /> Check My Answer
            </button>
          )}
          
          <button 
            onClick={handleReset}
            className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg rounded-2xl shadow-sm border border-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={20} /> Reset Scale
          </button>
        </div>
        
        {attempts > 0 && <div className="text-center font-medium text-slate-400 text-sm mt-3">Attempts: {attempts}</div>}
      </div>

      {/* Educational Footer */}
      <div className="bg-slate-100/50 p-6 sm:p-8 border-t border-slate-200">
        <h4 className="font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200/80">🧠 What students are learning:</h4>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 text-sm font-medium">
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 shrink-0 mt-0.5">•</span>
            <span><strong>Concept of Equality:</strong> Deeply understanding that equations are like physical balances that require symmetry.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 shrink-0 mt-0.5">•</span>
            <span><strong>Inverse Operations:</strong> Learning that removing a positive is physically equivalent to adding a negative.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 shrink-0 mt-0.5">•</span>
            <span><strong>Variable Isolation:</strong> Visualizing the multi-step algebraic strategy to get "x" completely alone.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 shrink-0 mt-0.5">•</span>
            <span><strong>Logical Rigour:</strong> Avoiding shortcut mistakes by seeing instant visual feedback when mathematical logic is broken.</span>
          </li>
        </ul>
      </div>
      
      {/* Required custom CSS for the bounce-in animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bounce-in {
          0% { opacity: 0; transform: scale(0.9) translateY(10px); }
          50% { opacity: 1; transform: scale(1.02) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}} />
    </div>
  );
}
