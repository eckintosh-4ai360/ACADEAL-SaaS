"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Check, RotateCcw, Lightbulb, ChevronRight, Hash, TreeDeciduous, ChevronLeft } from "lucide-react";

export default function PrimeFactorVisualiser() {
  const [numberInput, setNumberInput] = useState(24);
  const [activeTab, setActiveTab] = useState("tree"); // 'tree' | 'sieve'
  
  // State for Tree game mode
  const [treeGameActive, setTreeGameActive] = useState(false);
  const [treeGameNodeStates, setTreeGameNodeStates] = useState({}); // id -> { value, leftChildId, rightChildId, isPrime }
  const [selectedNode, setSelectedNode] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);

  // Constants
  const MAX_INPUT = 1000;
  
  // Helper: check if prime
  const isPrime = useCallback((n) => {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  }, []);

  // Compute prime sieve 1-100
  const sievePrimes = useMemo(() => {
    const primes = new Set();
    const boolArr = new Array(101).fill(true);
    boolArr[0] = false;
    boolArr[1] = false;
    for (let p = 2; p * p <= 100; p++) {
      if (boolArr[p]) {
        for (let i = p * p; i <= 100; i += p) {
          boolArr[i] = false;
        }
      }
    }
    for (let p = 2; p <= 100; p++) {
      if (boolArr[p]) primes.add(p);
    }
    return primes;
  }, []);

  // Compute full tree purely for display (non-game mode)
  const computeTree = useCallback((n) => {
    if (n <= 1) return { value: n, isLeaf: true };
    const root = { value: n, isLeaf: false, left: null, right: null };
    let nToFactor = n;
    
    // Find smallest factor
    let factor = 0;
    for (let i = 2; i <= Math.sqrt(nToFactor); i++) {
        if (nToFactor % i === 0) {
            factor = i;
            break;
        }
    }
    
    if (factor === 0) {
        root.isLeaf = true; // It's prime
    } else {
        root.left = computeTree(factor);
        root.right = computeTree(nToFactor / factor);
    }
    return root;
  }, []);

  const displayTree = useMemo(() => computeTree(numberInput), [numberInput, computeTree]);
  const displayPrimes = useMemo(() => {
    // extract primes from displayTree
    const getPrimes = (node) => {
      if (!node) return [];
      if (node.isLeaf) return [node.value];
      return [...getPrimes(node.left), ...getPrimes(node.right)];
    };
    return getPrimes(displayTree).sort((a,b)=>a-b);
  }, [displayTree]);

  // Handle Input Change
  const handleInputChange = (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0 && val <= MAX_INPUT) {
      setNumberInput(val);
      if (treeGameActive) resetTreeGame(val);
    }
  };

  // Tree Game Logic
  const initTreeGame = (startNum) => {
    setTreeGameActive(true);
    setAttempts(0);
    setFeedback(null);
    setSelectedNode("root");
    setTreeGameNodeStates({
      "root": { value: startNum, isPrime: isPrime(startNum), leftChildId: null, rightChildId: null, solved: false, markedPrime: false }
    });
  };

  const resetTreeGame = (val = numberInput) => {
    setTreeGameActive(false);
    setSelectedNode(null);
    setFeedback(null);
  };

  const splitNode = (id, f1, f2) => {
    const node = treeGameNodeStates[id];
    if (f1 * f2 !== node.value) {
      setFeedback({ type: "error", title: "❌ Try Again", message: `${f1} × ${f2} does not equal ${node.value}!` });
      setAttempts(a => a + 1);
      return;
    }
    if (f1 === 1 || f2 === 1) {
      setFeedback({ type: "warning", title: "⚠️ Not quite", message: "Don't use 1 as a factor, it doesn't help break the number down!" });
      setAttempts(a => a + 1);
      return;
    }

    const leftId = `${id}-L`;
    const rightId = `${id}-R`;

    setTreeGameNodeStates(prev => ({
      ...prev,
      [id]: { ...node, leftChildId: leftId, rightChildId: rightId },
      [leftId]: { value: f1, isPrime: isPrime(f1), leftChildId: null, rightChildId: null, solved: false, markedPrime: false },
      [rightId]: { value: f2, isPrime: isPrime(f2), leftChildId: null, rightChildId: null, solved: false, markedPrime: false }
    }));
    
    setSelectedNode(null);
    setFeedback({ type: "success", title: "✅ Good split!", message: `${f1} × ${f2} = ${node.value}` });
  };

  const markPrimeNode = (id) => {
    const node = treeGameNodeStates[id];
    if (node.isPrime) {
      setTreeGameNodeStates(prev => ({ ...prev, [id]: { ...node, markedPrime: true, solved: true } }));
      setFeedback({ type: "success", title: "✅ Correct!", message: `${node.value} is a prime number!` });
      setSelectedNode(null);
    } else {
      setFeedback({ type: "error", title: "❌ Try Again", message: `${node.value} is NOT a prime number. Try splitting it into factors.` });
      setAttempts(a => a + 1);
    }
  };

  // Check if game is fully won
  useEffect(() => {
    if (!treeGameActive) return;
    const allLeavesSolved = Object.values(treeGameNodeStates).every(node => {
      // If it has children, we don't care if it's "solved", we only care about leaves
      if (node.leftChildId || node.rightChildId) return true;
      // If it's a leaf, it must be marked prime
      return node.markedPrime;
    });

    if (allLeavesSolved && Object.keys(treeGameNodeStates).length > 0) {
        // Collect primes
        const primes = Object.values(treeGameNodeStates)
            .filter(n => n.markedPrime)
            .map(n => n.value)
            .sort((a,b)=>a-b);
        
        setFeedback({ 
            type: "success", 
            title: "🎉 Amazing!", 
            message: `You fully factorised ${numberInput}! Prime factors: ${primes.join(" × ")}` 
        });
        setSelectedNode(null);
    }
  }, [treeGameNodeStates, treeGameActive, numberInput]);

  // SVG Rendering Helpers for the Tree
  const renderTreeView = () => {
    // Simple recursive layout
    const NODE_RADIUS = 20;
    const Y_STEP = 60;
    
    const calculatePositions = (node, depth, xOffset, xSpacing) => {
        if (!node) return [];
        const pos = { x: xOffset, y: depth * Y_STEP + 30, value: node.value, isLeaf: node.isLeaf };
        let children = [];
        if (node.left) children = children.concat(calculatePositions(node.left, depth + 1, xOffset - xSpacing, xSpacing / 1.5));
        if (node.right) children = children.concat(calculatePositions(node.right, depth + 1, xOffset + xSpacing, xSpacing / 1.5));
        
        return [{...pos, left: node.left ? (xOffset - xSpacing) : null, right: node.right ? (xOffset + xSpacing) : null}, ...children];
    };

    const nodes = calculatePositions(displayTree, 0, 300, 100);

    return (
      <svg width="100%" height="300" viewBox="0 0 600 300" className="bg-white rounded-xl shadow-inner border border-slate-200">
        <defs>
          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.1"/>
          </filter>
        </defs>
        {nodes.map((n, i) => (
          <g key={`l-${i}`}>
            {n.left !== null && (
               <line x1={n.x} y1={n.y + NODE_RADIUS} x2={n.left} y2={n.y + Y_STEP - NODE_RADIUS} stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 2"/>
            )}
            {n.right !== null && (
               <line x1={n.x} y1={n.y + NODE_RADIUS} x2={n.right} y2={n.y + Y_STEP - NODE_RADIUS} stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 2"/>
            )}
          </g>
        ))}
        {nodes.map((n, i) => (
          <g key={`n-${i}`} transform={`translate(${n.x}, ${n.y})`} filter="url(#shadow)">
            <circle 
                r={NODE_RADIUS} 
                fill={n.isLeaf ? "#ec4899" : "#6366f1"} 
                className="transition-all duration-300"
            />
            <text x="0" y="5" textAnchor="middle" fill="white" fontWeight="bold" fontSize="14">{n.value}</text>
          </g>
        ))}
        {nodes.length === 0 && <text x="300" y="150" textAnchor="middle" fill="#94a3b8">Enter a number greater than 1</text>}
      </svg>
    );
  };

  const renderGameTreeView = () => {
    const NODE_RADIUS = 24;
    const Y_STEP = 70;
    
    // Convert flat state to hierarchical for positioning
    const buildHierarchy = (id) => {
        const node = treeGameNodeStates[id];
        if (!node) return null;
        return {
            id,
            ...node,
            left: node.leftChildId ? buildHierarchy(node.leftChildId) : null,
            right: node.rightChildId ? buildHierarchy(node.rightChildId) : null
        };
    };

    const rootHierarchy = buildHierarchy("root");

    const calculatePositions = (node, depth, xOffset, xSpacing) => {
        if (!node) return [];
        const pos = { id: node.id, x: xOffset, y: depth * Y_STEP + 40, value: node.value, markedPrime: node.markedPrime };
        let children = [];
        if (node.left) children = children.concat(calculatePositions(node.left, depth + 1, xOffset - xSpacing, xSpacing / 1.5));
        if (node.right) children = children.concat(calculatePositions(node.right, depth + 1, xOffset + xSpacing, xSpacing / 1.5));
        
        return [{...pos, left: node.left ? (xOffset - xSpacing) : null, right: node.right ? (xOffset + xSpacing) : null}, ...children];
    };

    const nodes = rootHierarchy ? calculatePositions(rootHierarchy, 0, 300, 100) : [];

    return (
      <svg width="100%" height="300" viewBox="0 0 600 300" className="bg-slate-800 rounded-xl shadow-inner border border-slate-700">
         <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {nodes.map((n, i) => (
          <g key={`gl-${n.id}`}>
            {n.left !== null && (
               <line x1={n.x} y1={n.y + NODE_RADIUS} x2={n.left} y2={n.y + Y_STEP - NODE_RADIUS} stroke="#475569" strokeWidth="3"/>
            )}
            {n.right !== null && (
               <line x1={n.x} y1={n.y + NODE_RADIUS} x2={n.right} y2={n.y + Y_STEP - NODE_RADIUS} stroke="#475569" strokeWidth="3"/>
            )}
          </g>
        ))}
        {nodes.map((n) => {
            const isSelected = selectedNode === n.id;
            // State: is marked prime? is left un-split? is selected?
            let fill = "#1e293b";
            let stroke = "#3b82f6";
            if (n.markedPrime) {
                fill = "#ec4899"; stroke = "#fbcfe8";
            } else if (isSelected) {
                fill = "#3b82f6"; stroke = "#93c5fd";
            }

            return (
                <g 
                    key={`gn-${n.id}`} 
                    transform={`translate(${n.x}, ${n.y})`} 
                    onClick={() => {
                        if (!n.markedPrime && !(treeGameNodeStates[n.id]?.leftChildId)) {
                             setSelectedNode(n.id);
                             setFeedback(null);
                        }
                    }}
                    className={`cursor-pointer ${!n.markedPrime && !(treeGameNodeStates[n.id]?.leftChildId) ? 'hover:opacity-80' : ''}`}
                >
                    <circle 
                        r={NODE_RADIUS} 
                        fill={fill} 
                        stroke={stroke}
                        strokeWidth="3"
                        filter={isSelected || n.markedPrime ? "url(#glow)" : ""}
                        className="transition-all duration-200"
                    />
                    <text x="0" y="6" textAnchor="middle" fill="white" fontWeight="bold" fontSize="16">{n.value}</text>
                </g>
            );
        })}
      </svg>
    );
  };


  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-50 rounded-3xl overflow-hidden shadow-2xl font-sans text-slate-800">
      {/* ── BACK BUTTON ── */}
      <div className="p-4 sm:p-6 pb-0">
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
      </div>

      {/* Header section */}
      <div className="bg-gradient-to-r from-teal-900 to-emerald-800 p-6 sm:p-8 text-white relative">
        <div className="absolute top-6 right-6 flex gap-2">
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm border border-white/10">JHS 1–3</span>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm border border-white/10 flex items-center gap-1">⏰ 15m</span>
        </div>
        
        <div className="flex items-center gap-4 mb-3">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-white/5">
            🔍
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Prime & Factor Visualiser</h1>
            <p className="text-teal-200 text-lg font-medium opacity-90">Find the building blocks of any number!</p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 bg-white grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Visual Output */}
        <div className="lg:col-span-7 flex flex-col gap-6">
             {/* Tabs */}
             <div className="flex p-1 bg-slate-100 rounded-xl justify-between shadow-inner">
                <button 
                    onClick={() => setActiveTab("tree")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "tree" ? "bg-white text-teal-700 shadow" : "text-slate-500 hover:text-slate-700"}`}
                >
                    <TreeDeciduous size={18} /> Factor Tree
                </button>
                <button 
                    onClick={() => setActiveTab("sieve")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "sieve" ? "bg-white text-teal-700 shadow" : "text-slate-500 hover:text-slate-700"}`}
                >
                    <Hash size={18} /> Sieve of Eratosthenes
                </button>
            </div>

            {activeTab === "tree" && (
                <div className="flex flex-col gap-4">
                    {treeGameActive ? renderGameTreeView() : renderTreeView()}
                    
                    {/* Small Output for plain mode */}
                    {!treeGameActive && numberInput > 1 && (
                        <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl flex items-center gap-3">
                            <span className="bg-teal-100 p-2 rounded-lg text-teal-700"><Check size={20}/></span>
                            <div>
                                <p className="text-xs font-bold text-teal-600 uppercase tracking-widest">Prime Factorisation</p>
                                <p className="text-lg font-bold text-teal-900">{numberInput} = {displayPrimes.join(" × ")}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "sieve" && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="grid grid-cols-10 gap-1 sm:gap-2">
                        {Array.from({length: 100}, (_, i) => i + 1).map(num => {
                            const isP = sievePrimes.has(num);
                            let bgClass = "bg-white border-slate-200 text-slate-700 hover:border-slate-300";
                            if (isP && num > 1) bgClass = "bg-pink-100 border-pink-300 text-pink-700 shadow-sm shadow-pink-100 font-bold";
                            else if (num === 1) bgClass = "bg-slate-100 border-slate-200 text-slate-400"; // 1 is special
                            else bgClass = "bg-slate-white border-slate-100 text-slate-400"; // composites

                            // Highlight selected factoring number if it's in the grid
                            if (num === numberInput) {
                                bgClass += " ring-2 ring-teal-500 ring-offset-1";
                            }

                            return (
                                <div key={num} className={`aspect-square flex items-center justify-center rounded-lg border text-xs sm:text-sm transition-all duration-300 ${bgClass}`}>
                                    {num}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex gap-4 text-xs font-medium text-slate-500 justify-center">
                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-pink-100 border border-pink-300 rounded-sm"></div> Prime Numbers</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-slate-200 rounded-sm"></div> Composite Numbers</span>
                    </div>
                </div>
            )}
        </div>

        {/* Right Column: Controls */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex gap-4 items-start shadow-sm">
            <div className="bg-teal-500 rounded-full p-2 text-white mt-1 shrink-0">
              <Lightbulb size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 mb-1">How to Use</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Enter a number to see its prime factors instantly. Want a challenge? Try the <strong>Factor Game</strong> to build the tree yourself! Check the Sieve tab to explore primes up to 100.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Number to Factor</label>
                  <div className="flex gap-2">
                    <input 
                        type="number" 
                        min="2" 
                        max={MAX_INPUT} 
                        value={numberInput}
                        onChange={handleInputChange}
                        className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                    />
                    <div className="flex gap-1">
                        <button onClick={() => { setNumberInput(prev => Math.max(2, prev - 1)); if(treeGameActive) resetTreeGame(); }} className="w-12 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-600 transition-colors">-</button>
                        <button onClick={() => { setNumberInput(prev => Math.min(MAX_INPUT, prev + 1)); if(treeGameActive) resetTreeGame(); }} className="w-12 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-600 transition-colors">+</button>
                    </div>
                  </div>
              </div>

              {!treeGameActive ? (
                   <button 
                        onClick={() => initTreeGame(numberInput)}
                        className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                       🎮 Play Factor Game
                   </button>
              ) : (
                  <button 
                        onClick={() => resetTreeGame()}
                        className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                       <RotateCcw size={18} /> Exit Game Mode
                   </button>
              )}
          </div>

          {/* Game Controls Panel popup */}
          {treeGameActive && (
              <div className="bg-slate-800 text-slate-200 p-5 rounded-2xl shadow-lg border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
                  <h4 className="font-bold text-teal-400 mb-3 flex items-center gap-2">
                       Active Node: {selectedNode ? treeGameNodeStates[selectedNode]?.value : <span className="text-slate-500 italic">Select a node...</span>}
                  </h4>
                  
                  {selectedNode ? (
                      <div className="flex flex-col gap-4">
                           <div>
                                <p className="text-xs text-slate-400 mb-2 font-medium">Split into two factors:</p>
                                <form 
                                    className="flex gap-2"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const f1 = parseInt(e.target.f1.value);
                                        const f2 = parseInt(e.target.f2.value);
                                        if (f1 > 0 && f2 > 0) splitNode(selectedNode, f1, f2);
                                        e.target.reset();
                                    }}
                                >
                                    <input name="f1" type="number" min="2" placeholder="Factor" className="w-20 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-center text-white font-mono outline-none focus:border-teal-500"/>
                                    <span className="flex items-center text-slate-500 font-bold">×</span>
                                    <input name="f2" type="number" min="2" placeholder="Factor" className="w-20 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-center text-white font-mono outline-none focus:border-teal-500"/>
                                    <button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg transition-colors">Split</button>
                                </form>
                           </div>

                           <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-700"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-bold uppercase tracking-wider">OR</span>
                                <div className="flex-grow border-t border-slate-700"></div>
                            </div>

                           <button 
                                onClick={() => markPrimeNode(selectedNode)}
                                className="w-full py-2.5 border-2 border-pink-500 hover:bg-pink-500/20 text-pink-400 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                It's a Prime Number! (End Branch)
                           </button>
                      </div>
                  ) : (
                      <p className="text-sm text-slate-400 italic">Click on a blue circle in the tree to split it or mark it as prime.</p>
                  )}
              </div>
          )}

          {feedback && (
            <div className={`p-4 rounded-xl flex items-start gap-3 animate-in fade-in border ${
                feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                feedback.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <div className="mt-0.5">
                  {feedback.type === 'success' && <Check className="text-emerald-600" size={18} />}
                  {feedback.type === 'error' && <RotateCcw className="text-rose-600" size={18} />}
                  {feedback.type === 'warning' && <Lightbulb className="text-amber-600" size={18} />}
              </div>
              <div>
                  <h4 className="font-bold text-sm tracking-tight">{feedback.title}</h4>
                  <p className="text-xs font-medium mt-0.5 opacity-90">{feedback.message}</p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Educational Footer */}
      <div className="bg-slate-100/50 p-6 sm:p-8 border-t border-slate-200">
        <h4 className="font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200/80">🧠 What students are learning:</h4>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 text-sm font-medium">
          <li className="flex items-start gap-2">
            <span className="text-teal-500 shrink-0 mt-0.5">•</span>
            <span><strong>Prime Factorisation:</strong> Breaking down composite numbers into a product of purely prime numbers.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500 shrink-0 mt-0.5">•</span>
            <span><strong>Multiples vs Factors:</strong> Visually distinguishing between a number's factors and prime blocks.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500 shrink-0 mt-0.5">•</span>
            <span><strong>Sieve of Eratosthenes:</strong> Understanding how primes are distributed among the first 100 whole numbers.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500 shrink-0 mt-0.5">•</span>
            <span><strong>HCF & LCM Core Skills:</strong> Developing the foundation needed for finding Highest Common Factors and Lowest Common Multiples.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
