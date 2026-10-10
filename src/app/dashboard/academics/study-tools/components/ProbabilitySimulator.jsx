"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Dices, Coins, PieChart, RefreshCcw, CheckCircle, XCircle, Info, BarChart2, ChevronLeft } from "lucide-react";

export default function ProbabilitySimulator() {
  const [mode, setMode] = useState("coin");
  const [trialsCount, setTrialsCount] = useState(10);
  const [results, setResults] = useState([]);
  const [counts, setCounts] = useState({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const config = useMemo(() => {
    switch (mode) {
      case "coin":
        return {
          id: "coin",
          name: "Coin Flip",
          icon: Coins,
          outcomes: ["Heads", "Tails"],
          colors: ["#6366f1", "#14b8a6"],
          theoretical: [0.5, 0.5],
          question: "If you flip a coin 500 times, theoretically how many times should it land on Heads?",
          answer: 250,
          hint: "Theoretical probability is 1/2. Multiply 500 by 1/2."
        };
      case "dice":
        return {
          id: "dice",
          name: "Dice Roll",
          icon: Dices,
          outcomes: ["1", "2", "3", "4", "5", "6"],
          colors: ["#6366f1", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e"],
          theoretical: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
          question: "In 600 dice rolls, theoretically how many times should you roll a '4'?",
          answer: 100,
          hint: "Each number has a 1/6 chance. Multiply 600 by 1/6."
        };
      case "spinner":
      default:
        return {
          id: "spinner",
          name: "4-Color Spinner",
          icon: PieChart,
          outcomes: ["Red", "Blue", "Green", "Yellow"],
          colors: ["#ef4444", "#3b82f6", "#10b981", "#eab308"],
          theoretical: [0.25, 0.25, 0.25, 0.25],
          question: "For a 4-color spinner spun 400 times, theoretically how many times will it land on Red?",
          answer: 100,
          hint: "Each color has a 1/4 (25%) chance. Multiply 400 by 1/4."
        };
    }
  }, [mode]);

  const runSimulation = useCallback(() => {
    setIsSimulating(true);
    const newResults = [];
    const newCounts = {};
    config.outcomes.forEach(o => (newCounts[o] = 0));

    for (let i = 0; i < trialsCount; i++) {
      const randomIndex = Math.floor(Math.random() * config.outcomes.length);
      const outcome = config.outcomes[randomIndex];
      newResults.push(outcome);
      newCounts[outcome]++;
    }

    setResults(newResults);
    setCounts(newCounts);
    
    setTimeout(() => {
      setIsSimulating(false);
    }, 300);
  }, [trialsCount, config]);

  // Initial simulation on load or mode change
  useEffect(() => {
    runSimulation();
    setFeedback(null);
    setUserAnswer("");
    setAttempts(0);
  }, [mode, runSimulation]);

  const checkAnswer = () => {
    const numericAnswer = parseInt(userAnswer, 10);
    setAttempts(prev => prev + 1);
    
    if (numericAnswer === config.answer) {
      setFeedback({ type: "correct", message: "Correct! Outstanding job." });
    } else {
      setFeedback({ type: "incorrect", message: "Try Again. " + config.hint });
    }
  };

  const getPercentage = (count) => {
    if (trialsCount === 0) return 0;
    return ((count / trialsCount) * 100).toFixed(1);
  };
  
  const getTheoreticalPercentage = (val) => {
    return (val * 100).toFixed(1);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 font-sans text-slate-800">
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
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl mb-6 flex flex-col md:flex-row items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 text-white opacity-5">
          <config.icon size={250} />
        </div>
        <div className="z-10 text-center md:text-left mb-6 md:mb-0">
          <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
            <span className="text-5xl">🎲</span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Probability Simulator</h1>
          </div>
          <p className="text-indigo-200 text-lg md:text-xl font-medium">See theoretical vs experimental probability update live!</p>
        </div>
        <div className="flex gap-3 z-10 font-semibold">
          <span className="bg-indigo-500/30 border border-indigo-400/50 px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-sm">
            <span>Level: JHS 1-3</span>
          </span>
          <span className="bg-teal-500/30 border border-teal-400/50 px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-sm">
            <span>⏱️ 20 min</span>
          </span>
        </div>
      </div>

      {/* "How to Use" Box */}
      <div className="bg-blue-50 border-l-4 border-blue-600 p-5 rounded-r-2xl shadow-sm mb-6 flex items-start gap-4">
        <Info className="text-blue-600 shrink-0 mt-1" size={24} />
        <div>
          <h3 className="text-blue-900 font-bold text-lg mb-1">How to Use This Tool</h3>
          <p className="text-blue-800 leading-relaxed">
            Choose an experiment (Coin, Dice, or Spinner) and use the slider to set how many times to run it. Click "Run Experiment" to see what happens in reality (Experimental) compared to what math predicts (Theoretical). See how the results balance out as you increase the number of trials!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Interactive Control Zone */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 shadow-lg border border-slate-100 flex flex-col gap-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
            <BarChart2 className="text-indigo-600" /> Experiment Controls
          </h2>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">1. Select Experiment</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(["coin", "dice", "spinner"]).map((m) => {
                const isSelected = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                        isSelected ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-500"
                    }`}
                  >
                    {m === "coin" && <Coins size={24} className="mb-1" />}
                    {m === "dice" && <Dices size={24} className="mb-1" />}
                    {m === "spinner" && <PieChart size={24} className="mb-1" />}
                    <span className="text-xs capitalize">{m}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-3">
              <label className="block text-sm font-bold text-slate-700">2. Number of Trials</label>
              <span className="bg-slate-100 px-3 py-1 rounded-lg text-indigo-700 font-bold font-mono text-lg">{trialsCount}</span>
            </div>
            <input
              type="range"
              min="10"
              max="1000"
              step="10"
              value={trialsCount}
              onChange={(e) => {
                setTrialsCount(parseInt(e.target.value));
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
              <span>10</span>
              <span>500</span>
              <span>1000</span>
            </div>
          </div>

          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className={`mt-auto w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg transition-all shadow-md active:scale-95 ${
              isSimulating ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-teal-500 hover:bg-teal-600 text-white hover:shadow-lg"
            }`}
          >
            <RefreshCcw className={isSimulating ? "animate-spin" : ""} size={20} />
            {isSimulating ? "Running..." : "Run Experiment"}
          </button>
        </div>

        {/* Live Visual Output Area */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-lg border border-slate-100 flex flex-col">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-3">
            <config.icon className="text-indigo-600" /> Results: Experimental vs Theoretical
          </h2>
          
          <div className={`flex-1 flex flex-col justify-center transition-opacity duration-300 ${isSimulating ? 'opacity-50' : 'opacity-100'}`}>
            <div className="space-y-6">
              {config.outcomes.map((outcome, index) => {
                const count = counts[outcome] || 0;
                const expPct = getPercentage(count);
                const theoPct = getTheoreticalPercentage(config.theoretical[index]);
                const barColor = config.colors[index];
                
                return (
                  <div key={outcome} className="relative">
                    <div className="flex justify-between items-end mb-1">
                      <span className="font-bold text-slate-700 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: barColor }}></span>
                        {outcome}
                      </span>
                      <div className="text-sm font-medium flex gap-4">
                        <span className="text-slate-500">
                          Count: <strong className="text-slate-800">{count}</strong>
                        </span>
                        <span className="text-indigo-600">
                          Exp: <strong>{expPct}%</strong>
                        </span>
                      </div>
                    </div>
                    
                    {/* Experimental Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-6 mb-1 relative overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${expPct}%`, backgroundColor: barColor }}
                      ></div>
                    </div>
                    
                    {/* Theoretical Marker */}
                    <div className="px-1 relative">
                       <div 
                         className="absolute top-0 w-1 h-3 bg-slate-800 z-10 -mt-7 rounded-sm transition-all duration-300"
                         style={{ left: `calc(${theoPct}%)` }}
                         title={`Theoretical: ${theoPct}%`}
                       ></div>
                       <div 
                         className="absolute text-[10px] font-bold text-slate-500 -mt-10 transform -translate-x-1/2 transition-all duration-300"
                         style={{ left: `calc(${theoPct}%)` }}
                       >
                         {theoPct}%
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-8 flex justify-center items-center gap-6 text-sm">
               <div className="flex items-center gap-2 text-slate-600">
                 <div className="w-4 h-4 rounded-sm bg-indigo-500 opacity-60"></div>
                 <span>Experimental (What actually happened)</span>
               </div>
               <div className="flex items-center gap-2 text-slate-600">
                 <div className="w-1 h-4 bg-slate-800 rounded-sm"></div>
                 <span>Theoretical Math Prediction</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Score / Feedback Panel */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100 mb-6">
         <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-3">Test Your Knowledge</h2>
         <div className="bg-indigo-50 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1">
              <p className="text-indigo-900 font-medium text-lg mb-2">
                {config.question}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <input 
                  type="number" 
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  className="px-4 py-3 rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900 w-48 text-lg"
                />
                <button 
                  onClick={checkAnswer}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-md transition-colors"
                >
                  Check My Answer
                </button>
              </div>
            </div>
            
            {(feedback || attempts > 0) && (
              <div className={`w-full md:w-1/3 p-4 rounded-xl flex items-start gap-3 border-2 ${
                feedback?.type === 'correct' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {feedback?.type === 'correct' ? (
                  <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={24} />
                ) : (
                  <XCircle className="text-red-500 shrink-0 mt-0.5" size={24} />
                )}
                <div>
                  <h4 className="font-bold text-lg">{feedback?.type === 'correct' ? 'Excellent!' : 'Not Quite!'}</h4>
                  <p className="text-sm mt-1">{feedback?.message}</p>
                  <p className="text-xs opacity-70 mt-2 font-medium">Attempts: {attempts}</p>
                </div>
              </div>
            )}
         </div>
      </div>

      {/* Educational Value Footer */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <h3 className="font-bold text-slate-700 mb-3 text-lg">🧠 What We're Learning</h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-600">
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0"></div>
            <span><strong>Theoretical Probability:</strong> What math predicts should happen in a perfect world.</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0"></div>
            <span><strong>Experimental Probability:</strong> What actually happens when we perform the experiment.</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></div>
            <span><strong>Law of Large Numbers:</strong> As you increase the number of trials, the experimental results get closer to the theoretical predictions.</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></div>
            <span><strong>Simulations:</strong> Using technology to quickly model real-world chance events thousands of times.</span>
          </li>
        </ul>
      </div>

    </div>
  );
}
