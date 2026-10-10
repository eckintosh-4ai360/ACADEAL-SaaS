import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  BarChart, Bar, 
  LineChart, Line, 
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Calculator, 
  BarChart2, 
  PieChart as PieChartIcon, 
  LineChart as LineChartIcon,
  Plus,
  Trash2,
  XCircle,
  HelpCircle,
  Lightbulb,
  ChevronLeft
} from 'lucide-react';

export default function StatisticsDataVisualiser() {
  const [dataset, setDataset] = useState([12, 15, 12, 18, 20]);
  const [newValue, setNewValue] = useState("");
  const [chartType, setChartType] = useState("bar"); // "bar", "pie", "line"
  
  // Quiz State
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState(null); // { isCorrect: boolean, message: string }
  const [attempts, setAttempts] = useState(0);

  const COLORS = ['#4F46E5', '#06B6D4', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#6366F1', '#14B8A6', '#F43F5E', '#84CC16'];

  // Calculations
  const stats = useMemo(() => {
    if (dataset.length === 0) return { mean: 0, median: 0, mode: [] };
    
    // Mean
    const sum = dataset.reduce((a, b) => a + b, 0);
    const mean = Number((sum / dataset.length).toFixed(2));
    
    // Median
    const sorted = [...dataset].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
      
    // Mode
    const counts = {};
    dataset.forEach(val => { counts[val] = (counts[val] || 0) + 1; });
    const maxCount = Math.max(...Object.values(counts));
    const mode = Object.keys(counts)
      .filter(key => counts[key] === maxCount)
      .map(Number);
      
    return { mean, median, mode };
  }, [dataset]);

  const chartData = useMemo(() => {
    // For Bar and Line, show individual data points
    // For Pie, show frequency of each value
    if (chartType === 'pie') {
      const counts = {};
      dataset.forEach(val => { counts[val] = (counts[val] || 0) + 1; });
      return Object.keys(counts).map(key => ({
        name: `Value: ${key}`,
        value: counts[key]
      }));
    }
    
    return dataset.map((val, index) => ({
      name: `Data ${index + 1}`,
      value: val
    }));
  }, [dataset, chartType]);

  const handleAddValue = (e) => {
    e.preventDefault();
    if (newValue === "") return;
    const num = Number(newValue);
    if (!isNaN(num)) {
      if (dataset.length < 15) {
        setDataset([...dataset, num]);
        setNewValue("");
      } else {
        alert("Maximum 15 data points allowed so the charts stay neat!");
      }
    }
  };

  const handleRemoveItem = (indexToRemove) => {
    setDataset(dataset.filter((_, index) => index !== indexToRemove));
  };

  const clearData = () => {
    if(window.confirm("Are you sure you want to clear all data?")) {
      setDataset([]);
    }
  };

  const generateQuiz = useCallback(() => {
    if (dataset.length === 0) return;
    
    const types = ['mean', 'median', 'mode'];
    const selectedType = types[Math.floor(Math.random() * types.length)];
    
    setQuizQuestion({ type: selectedType });
    setUserAnswer("");
    setFeedback(null);
  }, [dataset]);

  // Re-run quiz generation if dataset is cleared to reset state
  useEffect(() => {
    generateQuiz();
  }, [generateQuiz, dataset.length === 0 ? "clear" : "keep"]);

  const checkAnswer = () => {
    if (!quizQuestion || userAnswer.trim() === "") return;
    
    setAttempts(prev => prev + 1);
    let isCorrect = false;

    if (quizQuestion.type === 'mode') {
      // Allow any order for multiple modes, allow decimals or integers
      const userArray = userAnswer.split(',').map(n => Number(n.trim())).sort();
      const actualArray = [...stats.mode].sort();
      // Only strict equals strings of comma separated modes
      isCorrect = userArray.join() === actualArray.join();
    } else {
      isCorrect = Number(userAnswer) === stats[quizQuestion.type];
    }
    
    if (isCorrect) {
      setFeedback({ isCorrect: true, message: `✅ Brilliant! You correctly found the ${quizQuestion.type}!` });
      // Clear out to let them try the next one after 2 seconds
      setTimeout(() => {
          generateQuiz();
      }, 2500);
    } else {
      const hints = {
        mean: "Hint: Add all the numbers together, then divide by how many numbers there are total.",
        median: "Hint: Put all the numbers in order from smallest to largest, then find the middle number.",
        mode: "Hint: Find the number or numbers that appear the most frequently in your dataset."
      };
      setFeedback({ isCorrect: false, message: `❌ Try Again! ${hints[quizQuestion.type]}` });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 font-sans text-slate-800">
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

      {/* 1. Header */}
      <div className="bg-indigo-900 rounded-3xl shadow-xl overflow-hidden mb-8">
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6 text-center md:text-left">
            <div className="text-6xl md:text-7xl bg-white/10 p-4 rounded-full shadow-inner hidden sm:block">
              📊
            </div>
            <div className="text-white">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                Data & Stats Explorer
              </h1>
              <p className="text-indigo-200 text-lg md:text-xl font-medium">
                Master Mean, Median, and Mode with Live Visuals!
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <span className="bg-teal-400 text-teal-950 px-5 py-2 rounded-full font-bold text-sm uppercase tracking-wider shadow-md text-center">
              Level: JHS 1–3
            </span>
            <span className="bg-indigo-800 text-indigo-100 px-5 py-2 rounded-full font-bold text-sm flex items-center justify-center gap-2 border border-indigo-600 shadow-md">
              <Calculator size={16} /> Est. Time: 20 mins
            </span>
          </div>
        </div>
      </div>

      {/* 2. "How to Use" box */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-5 mb-8 shadow-sm flex gap-4">
        <HelpCircle className="text-blue-500 shrink-0 w-7 h-7 hidden sm:block" />
        <div>
          <h3 className="font-bold text-blue-900 text-lg mb-1">How to Use:</h3>
          <p className="text-blue-800 leading-relaxed text-sm md:text-base">
            Type numbers to build your dataset and watch the charts instantly change! Experiment with Bar, Pie, or Line views to see how the numbers look visually. When you're ready, test your skills in the "Check Your Knowledge" area below.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        
        {/* 3. Interactive Control Zone */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <Plus className="text-indigo-600" /> Enter Data
            </h3>
            
            <form onSubmit={handleAddValue} className="flex gap-2 mb-6">
              <input
                type="number"
                step="any"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Number..."
                className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
              />
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center"
              >
                <Plus size={24} />
              </button>
            </form>

            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-slate-700">Dataset ({dataset.length}):</h4>
              <button 
                onClick={clearData}
                disabled={dataset.length === 0}
                className="text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors"
              >
                <Trash2 size={16} /> Clear
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[5rem]">
              {dataset.length === 0 ? (
                <p className="text-slate-400 text-sm italic w-full text-center mt-2">No data yet. Let's add some!</p>
              ) : (
                dataset.map((val, i) => (
                  <div key={i} className="animate-in fade-in bg-white border border-slate-200 shadow-sm rounded-lg px-3 py-1.5 flex items-center gap-2 transition-all">
                    <span className="font-bold text-indigo-700">{val}</span>
                    <button 
                      onClick={() => handleRemoveItem(i)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <h3 className="text-xl font-bold text-indigo-900 mb-4">Select Chart</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setChartType('bar')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${chartType === 'bar' ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <BarChart2 size={24} className="mb-1" />
                <span className="text-sm font-bold">Bar</span>
              </button>
              <button
                onClick={() => setChartType('pie')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${chartType === 'pie' ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <PieChartIcon size={24} className="mb-1" />
                <span className="text-sm font-bold">Pie</span>
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${chartType === 'line' ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <LineChartIcon size={24} className="mb-1" />
                <span className="text-sm font-bold">Line</span>
              </button>
            </div>
          </div>

        </div>

        {/* 4. Live Visual Output Area */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-lg border border-slate-100 p-6 flex flex-col">
          <h3 className="text-xl font-bold text-indigo-900 mb-6 flex items-center justify-between">
            <span>Live Interactive Visuals</span>
            <span className="bg-indigo-100 text-indigo-700 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">Sync Active</span>
          </h3>
          
          <div className="flex-1 min-h-[400px] w-full bg-slate-50 rounded-xl p-2 border border-slate-100 flex items-center justify-center transition-all duration-300 relative">
            {dataset.length === 0 ? (
              <div className="text-slate-400 flex flex-col items-center text-center p-6">
                <BarChart2 size={64} className="mb-4 opacity-30 text-indigo-300" />
                <p className="text-lg font-medium">Add numbers on the left to draw charts here</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 12, fontWeight: 600}} />
                    <YAxis stroke="#64748b" tick={{fontSize: 12, fontWeight: 600}} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="value" fill="#4F46E5" radius={[8, 8, 0, 0]} animationDuration={500}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 12, fontWeight: 600}} />
                    <YAxis stroke="#64748b" tick={{fontSize: 12, fontWeight: 600}} />
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Line type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={5} dot={{ r: 7, fill: '#8B5CF6', strokeWidth: 3, stroke: 'white' }} activeDot={{ r: 10, strokeWidth: 0 }} animationDuration={500} />
                  </LineChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={140}
                      innerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                      animationDuration={500}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="circle" wrapperStyle={{ fontWeight: 600, fontSize: '14px', paddingTop: '20px' }} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 5. Score / Feedback Panel */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden mb-8">
        <div className="bg-slate-800 p-5 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-center sm:gap-0 gap-3 text-white">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Lightbulb className="text-yellow-400" size={28} /> Check My Answer
          </h3>
          <span className="bg-slate-700/50 border border-slate-600 px-4 py-1.5 rounded-full text-sm font-bold tracking-wide">
            Attempts: {attempts}
          </span>
        </div>
        
        <div className="p-6 md:p-8">
          {dataset.length === 0 ? (
            <div className="text-center p-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 italic">
              Add some data items first to start the interactive quiz!
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-8 items-stretch">
              <div className="flex-1 bg-indigo-50/50 p-6 rounded-2xl border-2 border-indigo-100 flex flex-col justify-center shadow-sm">
                <p className="text-slate-600 font-bold mb-2 uppercase text-sm tracking-wider">Based on your dataset</p>
                <div className="text-2xl md:text-3xl font-extrabold text-indigo-950 leading-snug">
                  What is the <span className="text-teal-600 underline decoration-teal-400 decoration-4 underline-offset-8 capitalize px-1">{quizQuestion?.type}</span>?
                </div>
                {quizQuestion?.type === 'mode' && (
                  <p className="text-sm text-indigo-500 mt-4 font-medium flex items-center gap-2">
                    <HelpCircle size={16}/> Separate multiple modes with commas.
                  </p>
                )}
                <div className="mt-4 pt-4 border-t border-indigo-200/50">
                   <p className="text-sm text-slate-500 font-mono">Dataset ({dataset.length}): {dataset.join(", ")}</p>
                </div>
              </div>
              
              <div className="flex-[1.2] flex flex-col gap-4 justify-center">
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Enter answer..."
                    className="flex-1 border-2 border-slate-200 rounded-xl px-5 py-4 text-xl font-bold text-center sm:text-left focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all shadow-inner bg-slate-50"
                    onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                  />
                  <button
                    onClick={checkAnswer}
                    className="bg-teal-500 hover:bg-teal-600 active:bg-teal-700 min-h-12 w-full sm:w-auto text-white font-extrabold text-lg py-4 px-8 rounded-xl shadow-lg shadow-teal-500/30 transition-all"
                  >
                    Check
                  </button>
                </div>
                
                {feedback && (
                  <div className={`p-4 rounded-xl border-2 font-bold text-base md:text-lg transition-all animate-in fade-in slide-in-from-bottom-2 ${feedback.isCorrect ? 'bg-green-50 border-green-300 text-green-800 shadow-sm' : 'bg-red-50 border-red-300 text-red-800 shadow-sm'}`}>
                    {feedback.message}
                  </div>
                )}
                
                <div className="flex justify-end mt-2">
                   <button 
                      onClick={generateQuiz} 
                      className="text-indigo-600 hover:text-indigo-800 font-bold text-sm underline underline-offset-4 decoration-2"
                   >
                     Skip / Generate New Question
                   </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. Educational Value Footer */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-slate-300 shadow-xl border border-slate-800">
        <h4 className="text-white font-extrabold text-xl mb-6 flex items-center gap-3">
          🎓 Learning Benefits <span className="text-slate-500 text-sm font-normal">| Ghana NaCCA Curriculum</span>
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 text-sm md:text-base">
          <li className="flex gap-3 items-start">
            <span className="text-teal-400 bg-teal-400/10 p-1.5 rounded-full mt-0.5">✓</span> 
            <div><strong className="text-white block mb-1">Data Collection:</strong> Translates abstract numbers into structured dataset groupings mentally.</div>
          </li>
          <li className="flex gap-3 items-start">
            <span className="text-teal-400 bg-teal-400/10 p-1.5 rounded-full mt-0.5">✓</span> 
            <div><strong className="text-white block mb-1">Visual Representation:</strong> Actively maps numeric quantities to proportional shapes in charts.</div>
          </li>
          <li className="flex gap-3 items-start">
            <span className="text-teal-400 bg-teal-400/10 p-1.5 rounded-full mt-0.5">✓</span> 
            <div><strong className="text-white block mb-1">Central Tendency:</strong> Builds proficiency in evaluating mean, median, and mode experimentally.</div>
          </li>
          <li className="flex gap-3 items-start">
            <span className="text-teal-400 bg-teal-400/10 p-1.5 rounded-full mt-0.5">✓</span> 
            <div><strong className="text-white block mb-1">Analytical Thinking:</strong> Fosters observation skills by showcasing instant visual changes based on data adjustments.</div>
          </li>
        </ul>
      </div>

    </div>
  );
}
