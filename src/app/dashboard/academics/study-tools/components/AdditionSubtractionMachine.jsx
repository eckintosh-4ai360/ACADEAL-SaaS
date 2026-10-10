import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Minus, RotateCcw, Info, Lightbulb, CheckCircle2, XCircle, Settings2, PlayCircle, ChevronLeft } from "lucide-react";

export default function AdditionSubtractionMachine() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [operation, setOperation] = useState("add"); // "add" | "subtract"
  const [num1, setNum1] = useState(5);
  const [num2, setNum2] = useState(3);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState(null); // "correct" | "incorrect" | null
  const [attempts, setAttempts] = useState(0);
  const [animationStep, setAnimationStep] = useState(0);

  // Prevent invalid subtraction states (no negative results for Primary 1-3)
  useEffect(() => {
    if (operation === "subtract" && num1 < num2) {
      setNum2(num1);
    }
  }, [operation, num1, num2]);

  // Reset states when inputs change to make the tool re-playable
  useEffect(() => {
    setFeedback(null);
    setUserAnswer("");
    setAnimationStep(0);
  }, [num1, num2, operation]);

  const expectedAnswer = operation === "add" ? num1 + num2 : num1 - num2;

  const handleCheckAnswer = () => {
    if (userAnswer === "") return;
    setAttempts((prev) => prev + 1);

    if (parseInt(userAnswer, 10) === expectedAnswer) {
      setFeedback("correct");
      
      // Animate the machine blocks arriving or leaving
      let step = 0;
      const interval = setInterval(() => {
        step++;
        if (step <= num2) {
          setAnimationStep(step);
        } else {
          clearInterval(interval);
        }
      }, 400);
    } else {
      setFeedback("incorrect");
    }
  };

  const handleReset = () => {
    const newOp = Math.random() > 0.5 ? "add" : "subtract";
    setOperation(newOp);
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * (newOp === "subtract" ? n1 : 9)) + 1;
    setNum1(n1);
    setNum2(n2);
    setUserAnswer("");
    setFeedback(null);
    setAnimationStep(0);
  };

  const renderBlocks = useCallback(() => {
    const blocks = [];
    const blockWidth = 40;
    const spacing = 10;
    const startX = 40;
    const beltTopY = 160;

    // Render original blocks for num1
    for (let i = 0; i < num1; i++) {
        // If subtracting, blocks from the right end are tagged to be removed
        const isBeingRemoved = operation === "subtract" && i >= (num1 - num2);
        // Animate out based on animationStep sequence
        const isRemovedNow = isBeingRemoved && feedback === "correct" && (num1 - i) <= animationStep;

        blocks.push(
            <g key={`n1-${i}`} 
               className="transition-all duration-500 ease-in-out"
               transform={`translate(${startX + i * (blockWidth + spacing)}, ${isRemovedNow ? beltTopY - 100 : beltTopY - blockWidth})`}
               style={{ opacity: isRemovedNow ? 0 : 1 }}>
                <rect width={blockWidth} height={blockWidth} rx="8" className="fill-blue-500 stroke-blue-700 stroke-[3px]" />
                <text x={blockWidth/2} y={blockWidth/2 + 6} textAnchor="middle" className="fill-white font-bold text-lg pointer-events-none">{i + 1}</text>
            </g>
        );
    }

    // Render incoming blocks for num2 (Addition Only)
    if (operation === "add") {
        for (let i = 0; i < num2; i++) {
            // Animate in based on animationStep sequence
            const isAddedNow = feedback === "correct" && i < animationStep;
            
            blocks.push(
                <g key={`n2-${i}`} 
                   className="transition-all duration-500 ease-in-out"
                   transform={`translate(${startX + (num1 + i) * (blockWidth + spacing)}, ${isAddedNow ? beltTopY - blockWidth : beltTopY - 120})`}
                   style={{ opacity: isAddedNow ? 1 : 0.5 }}>
                    <rect width={blockWidth} height={blockWidth} rx="8" className="fill-green-500 stroke-green-700 stroke-[3px]" />
                    <text x={blockWidth/2} y={blockWidth/2 + 6} textAnchor="middle" className="fill-white font-bold text-lg pointer-events-none">+</text>
                </g>
            );
        }
    }

    return blocks;
  }, [num1, num2, operation, feedback, animationStep]);

  // --- START SCREEN (PLAY NOW) ---
  if (!isPlaying) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-gradient-to-br from-blue-50 via-white to-blue-50 p-8 md:p-16 rounded-3xl shadow-xl border-4 border-blue-200 flex flex-col items-center justify-center min-h-[500px] text-center font-sans">
        <div className="text-7xl bg-white p-6 rounded-3xl shadow-lg border-2 border-blue-100 mb-8 animate-[bounce_3s_infinite]">🤖</div>
        <h1 className="text-4xl md:text-6xl font-black text-blue-900 mb-4 tracking-tight">Math Machine</h1>
        <p className="text-slate-500 text-lg md:text-xl font-medium mb-12 max-w-md leading-relaxed">
          Learn addition and subtraction with the magic conveyor belt!
        </p>
        <div className="flex flex-col items-center gap-4">
          <button
             onClick={() => setIsPlaying(true)}
             className="group relative inline-flex items-center justify-center px-10 py-5 font-black text-white transition-all duration-300 ease-in-out bg-green-500 hover:bg-green-600 rounded-full shadow-[0_8px_0_rgb(21,128,61)] hover:shadow-[0_4px_0_rgb(21,128,61)] hover:translate-y-1 active:shadow-none active:translate-y-2 text-2xl gap-3"
          >
             <PlayCircle size={36} className="group-hover:scale-110 transition-transform" />
             PLAY NOW
          </button>
          <div className="flex gap-2 mt-6">
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-bold text-xs border border-orange-200 shadow-sm">
               PRIMARY 1–3
            </span>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold text-xs border border-blue-200 shadow-sm">
               NUMERACY
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN INTERACTIVE TOOL ---
  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 bg-slate-50 rounded-3xl shadow-xl font-sans text-slate-800 border-4 border-slate-200">
      
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      {/* 1. Header */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-white p-4 rounded-2xl shadow-sm mb-6 border-b-4 border-blue-100 relative">
        <div className="flex items-center gap-4">
          <div className="text-5xl bg-blue-100 p-3 rounded-2xl shadow-inner">🤖</div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-blue-800 tracking-tight">Math Machine</h1>
            <p className="text-slate-500 font-medium text-sm md:text-base">Add and subtract with the magic conveyor belt!</p>
          </div>
        </div>
        <div className="flex flex-col items-end mt-4 md:mt-0 gap-2">
          <span className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full font-bold text-sm tracking-wide border-2 border-orange-200 shadow-sm">
            LEVEL: PRIMARY 1–3
          </span>
          <span className="flex items-center text-slate-500 text-sm font-semibold gap-1">
            ⏱️ 12 min
          </span>
        </div>
      </div>

      {/* 2. "How to Use" Box */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-6 shadow-sm flex items-start gap-3">
        <div className="bg-blue-200 p-2 rounded-full text-blue-600 mt-1 shrink-0">
          <Info size={24} strokeWidth={3} />
        </div>
        <div>
          <h2 className="font-bold text-blue-900 text-lg mb-1">How to Play!</h2>
          <p className="text-blue-800 text-base leading-relaxed font-medium">
            1. Choose to <strong>Add (+)</strong> or <strong>Subtract (-)</strong> blocks.<br/>
            2. Use the sliders to change the numbers on the machine.<br/>
            3. Count the blocks on the belt, type your answer, and let the machine check it!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* 3. Interactive Control Zone */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 flex flex-col gap-6">
          <div className="flex items-center gap-2 mb-2 border-b-2 border-slate-100 pb-3">
            <Settings2 className="text-slate-400" />
            <h3 className="text-xl font-bold text-slate-700">Machine Controls</h3>
          </div>

          {/* Operation Toggle */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl">
            <button
              onClick={() => setOperation("add")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-lg transition-all ${
                operation === "add" ? "bg-green-500 text-white shadow-md transform scale-100" : "text-slate-500 hover:bg-slate-200"
              }`}
            >
              <Plus size={24} strokeWidth={3} /> Add
            </button>
            <button
              onClick={() => setOperation("subtract")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-lg transition-all ${
                operation === "subtract" ? "bg-orange-500 text-white shadow-md transform scale-100" : "text-slate-500 hover:bg-slate-200"
              }`}
            >
              <Minus size={24} strokeWidth={3} /> Subtract
            </button>
          </div>

          {/* Number 1 Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="font-bold text-slate-600">First Number</label>
              <span className="text-2xl font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-lg border border-blue-200">{num1}</span>
            </div>
            <input
              type="range" min="1" max="15" value={num1}
              onChange={(e) => setNum1(parseInt(e.target.value))}
              className="w-full h-4 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600 shadow-inner"
            />
          </div>

          {/* Number 2 Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="font-bold text-slate-600">Second Number</label>
              <span className={`text-2xl font-black px-3 py-1 rounded-lg border ${operation === "add" ? "text-green-600 bg-green-100 border-green-200" : "text-orange-600 bg-orange-100 border-orange-200"}`}>
                {num2}
              </span>
            </div>
            <input
              type="range" min="1" max={operation === "subtract" ? num1 : 15} value={num2}
              onChange={(e) => setNum2(parseInt(e.target.value))}
              className={`w-full h-4 rounded-lg appearance-none cursor-pointer shadow-inner ${operation === "add" ? "bg-green-200 accent-green-600" : "bg-orange-200 accent-orange-600"}`}
            />
          </div>
        </div>

        {/* 4. Live Visual Output Area */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border-2 border-slate-100 overflow-hidden flex flex-col">
          
          {/* Math Equation Header */}
          <div className="bg-slate-800 text-white p-4 flex justify-center items-center gap-4 text-4xl md:text-5xl font-black shadow-inner">
            <span className="text-blue-400">{num1}</span>
            <span className={operation === "add" ? "text-green-400" : "text-orange-400"}>
              {operation === "add" ? "+" : "-"}
            </span>
            <span className={operation === "add" ? "text-green-400" : "text-orange-400"}>{num2}</span>
            <span className="text-slate-300">=</span>
            <span className="text-white border-b-4 border-dashed border-slate-500 w-16 text-center shadow-sm">
              {feedback === "correct" ? expectedAnswer : "?"}
            </span>
          </div>

          {/* Machine SVG Area */}
          <div className="relative flex-1 min-h-[250px] w-full bg-[#E2E8F0] overflow-hidden flex items-end justify-center pb-8 p-4 border-t-4 border-slate-300">
            {/* Factory Grid Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#475569 2px, transparent 2px)', backgroundSize: '24px 24px' }}></div>
            
            <svg viewBox="0 0 800 240" className="w-full max-w-full drop-shadow-xl h-auto relative z-10" preserveAspectRatio="xMidYMid meet">
              
              {/* Conveyor Belt Framework */}
              <rect x="20" y="160" width="760" height="40" rx="20" className="fill-slate-700" />
              <rect x="30" y="165" width="740" height="30" rx="15" className="fill-slate-800" />
              
              {/* Belt Rollers */}
              {[...Array(15)].map((_, i) => (
                <circle key={`roller-${i}`} cx={50 + i * 50} cy="180" r="10" className="fill-slate-600" />
              ))}

              {/* Belt Surface Line */}
              <line x1="40" y1="160" x2="760" y2="160" className="stroke-slate-500 stroke-[5px]" strokeDasharray="15 15" />

              {/* Programmable Blocks Layer */}
              {renderBlocks()}
              
              {/* Machine Exit/Entry Structures */}
              <path d="M 0 120 L 40 120 L 40 220 L 0 220 Z" className="fill-slate-600 border-2" />
              <path d="M 760 120 L 800 120 L 800 220 L 760 220 Z" className="fill-slate-600 border-2" />
            </svg>
          </div>
        </div>
      </div>

      {/* 5. Score / Feedback Panel */}
      <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
        
        {/* User Input Region */}
        <div className="flex-1 w-full max-w-sm">
          <label className="block text-slate-500 font-bold mb-2 uppercase tracking-wide text-sm flex items-center gap-2">
            Your Answer:
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={feedback === "correct"}
              className="flex-1 min-h-[4rem] text-center text-3xl font-black text-slate-800 border-4 border-slate-200 rounded-2xl focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:bg-slate-100"
              placeholder="?"
            />
            <button
              onClick={handleCheckAnswer}
              disabled={userAnswer === "" || feedback === "correct"}
              className="min-h-[4rem] px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xl rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={24} strokeWidth={3} />
              <span className="hidden sm:inline">Check</span>
            </button>
          </div>
        </div>

        {/* Feedback Display */}
        <div className="flex-1 w-full flex flex-col md:items-center min-h-[5rem] justify-center">
          {feedback === "correct" && (
            <div className="animate-bounce flex items-center gap-3 bg-green-100 text-green-700 px-6 py-4 rounded-2xl border-2 border-green-300 shadow-sm w-full md:w-auto">
              <CheckCircle2 size={32} strokeWidth={3} className="text-green-600 shrink-0" />
              <div>
                <span className="block font-black text-xl">Correct! Brilliant!</span>
                <span className="text-sm font-medium">The machine accepted your answer.</span>
              </div>
            </div>
          )}
          
          {feedback === "incorrect" && (
            <div className="flex items-center gap-3 bg-red-100 text-red-700 px-6 py-4 rounded-2xl border-2 border-red-300 shadow-sm w-full md:w-auto">
              <XCircle size={32} strokeWidth={3} className="text-red-600 shrink-0" />
              <div>
                <span className="block font-black text-xl">Try Again!</span>
                <span className="text-sm font-medium">
                  Hint: Try counting the blocks on the belt {operation === "add" ? "altogether" : "that are left"}.
                </span>
              </div>
            </div>
          )}

          {!feedback && attempts > 0 && (
            <div className="text-slate-500 font-bold bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
              Attempts: {attempts}
            </div>
          )}
        </div>

        {/* Global Reset */}
        <div className="w-full md:w-auto flex justify-end">
           <button
             onClick={handleReset}
             className="min-h-[4rem] px-6 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-700 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 w-full md:w-auto"
           >
             <RotateCcw size={24} strokeWidth={3} />
             <span className="md:hidden lg:inline">Reset Machine</span>
           </button>
        </div>

      </div>

      {/* 6. Educational Value Footer */}
      <div className="bg-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-inner border-2 border-slate-900">
        <div className="flex items-center gap-3 mb-5 border-b border-slate-700 pb-3">
          <Lightbulb className="text-yellow-400 shrink-0" size={32} />
          <h3 className="text-xl md:text-2xl font-bold tracking-wide">Educational Benefits</h3>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-slate-300 font-medium text-base md:text-lg">
          <li className="flex items-start gap-3">
            <span className="text-blue-400 mt-1 shrink-0">●</span>
            Builds concrete understanding of addition as "putting together".
          </li>
          <li className="flex items-start gap-3">
            <span className="text-orange-400 mt-1 shrink-0">●</span>
            Visualizes subtraction as "taking away" from a physical set.
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-400 mt-1 shrink-0">●</span>
            Reinforces one-to-one correspondence by directly counting objects.
          </li>
          <li className="flex items-start gap-3">
            <span className="text-purple-400 mt-1 shrink-0">●</span>
            Connects abstract numerical symbols (+, -) to observable processes.
          </li>
        </ul>
      </div>

    </div>
  );
}
