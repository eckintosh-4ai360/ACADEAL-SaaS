import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { CheckCircle, XCircle, RefreshCw, Info, Sparkles, AlertCircle, ChevronLeft } from 'lucide-react';

export default function HealthyFoodsSorter() {
  const initialFoods = [
    { id: 1, name: "Apple", emoji: "🍎", isHealthy: true, plate: null },
    { id: 2, name: "Carrot", emoji: "🥕", isHealthy: true, plate: null },
    { id: 3, name: "Candy", emoji: "🍬", isHealthy: false, plate: null },
    { id: 4, name: "Soda", emoji: "🥤", isHealthy: false, plate: null },
    { id: 5, name: "Broccoli", emoji: "🥦", isHealthy: true, plate: null },
    { id: 6, name: "Chips", emoji: "🍟", isHealthy: false, plate: null },
    { id: 7, name: "Banana", emoji: "🍌", isHealthy: true, plate: null },
    { id: 8, name: "Ice Cream", emoji: "🍦", isHealthy: false, plate: null },
    { id: 9, name: "Grapes", emoji: "🍇", isHealthy: true, plate: null },
    { id: 10, name: "Donut", emoji: "🍩", isHealthy: false, plate: null },
  ];

  const [foods, setFoods] = useState(initialFoods);
  const [selectedFoodId, setSelectedFoodId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);

  // Derived state for live SVG visual output
  const healthyPlaced = foods.filter(f => f.plate === 'healthy');
  const unhealthyPlaced = foods.filter(f => f.plate === 'unhealthy');
  const poolFoods = foods.filter(f => f.plate === null);
  
  const allPlaced = poolFoods.length === 0;

  const handleFoodClick = useCallback((foodId) => {
    if (selectedFoodId === foodId) {
      setSelectedFoodId(null);
    } else {
      setSelectedFoodId(foodId);
    }
  }, [selectedFoodId]);

  const moveFood = useCallback((foodId, plate) => {
    setFoods(prev => prev.map(f => f.id === foodId ? { ...f, plate } : f));
    setSelectedFoodId(null);
    setFeedback(null);
  }, []);

  const handlePlateClick = useCallback((plate) => {
    if (selectedFoodId) {
      moveFood(selectedFoodId, plate);
    }
  }, [selectedFoodId, moveFood]);
  
  const handleRemoveFromPlate = useCallback((foodId) => {
      setFoods(prev => prev.map(f => f.id === foodId ? { ...f, plate: null }: f));
      setFeedback(null);
  }, []);

  const checkAnswer = useCallback(() => {
    setAttempts(prev => prev + 1);
    
    // Check if everything placed is in the right spot
    let allCorrectSoFar = true;
    let anyPlaced = false;
    let mistakes = 0;

    foods.forEach(food => {
      if (food.plate) {
        anyPlaced = true;
        if ((food.plate === 'healthy' && !food.isHealthy) || 
            (food.plate === 'unhealthy' && food.isHealthy)) {
          allCorrectSoFar = false;
          mistakes++;
        }
      }
    });

    if (!anyPlaced) {
      setFeedback({ type: 'hint', message: "Place some food on the plates first!" });
      return;
    }

    if (!allPlaced && allCorrectSoFar) {
      setFeedback({ type: 'hint', message: "Good job so far! Keep sorting the rest." });
      return;
    }

    if (allPlaced && allCorrectSoFar) {
      setFeedback({ type: 'success', message: "Perfect! You know your healthy foods!" });
    } else {
       setFeedback({ 
          type: 'error', 
          message: `Oops! Check again. ${mistakes > 0 ? "Some foods might make our tummy ache if we eat too much!" : ""}`
       });
    }
  }, [foods, allPlaced]);

  const resetActivity = useCallback(() => {
    setFoods(initialFoods);
    setFeedback(null);
    setAttempts(0);
    setSelectedFoodId(null);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-yellow-200 p-4">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      {/* 1. Header */}
      <div className="bg-gradient-to-r from-green-400 to-emerald-500 p-6 text-white relative">
        <div className="absolute top-4 right-4 flex space-x-2">
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold flex items-center shadow-sm">
            🛡️ KG 1-2
          </span>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold flex items-center shadow-sm">
            ⏱️ 7 min
          </span>
        </div>
        <h1 className="text-4xl font-extrabold flex items-center mb-2 drop-shadow-md">
          <span className="text-5xl mr-3">🥗</span> Healthy Foods Sorter
        </h1>
        <p className="text-xl font-medium opacity-90 drop-shadow-sm">
          Let's help the chef organize the kitchen!
        </p>
      </div>

      {/* 2. How to Use Box */}
      <div className="bg-yellow-50 p-5 border-b-2 border-yellow-100 flex items-start">
        <div className="bg-yellow-200 p-3 rounded-full mr-4 shadow-sm text-yellow-700">
          <Info size={28} strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-yellow-800 mb-1">How to Play:</h3>
          <p className="text-yellow-900 text-lg leading-relaxed">
            Tap a food item to pick it up. Then, tap the green plate if it makes you strong, or the orange plate if it's a "sometimes" food. Sort them all!
          </p>
        </div>
      </div>

      <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-slate-50">
        
        {/* 3. Interactive Control Zone */}
        <div className="flex flex-col space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-slate-100 min-h-[220px]">
            <h3 className="text-xl font-bold text-slate-700 mb-4 flex items-center justify-between">
              <span>Foods to Sort 😋</span>
              <span className="text-sm bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-medium">
                {poolFoods.length} left
              </span>
            </h3>
            
            <div className="flex flex-wrap gap-3 min-h-[140px] items-start content-start">
              {poolFoods.map(food => (
                <button
                  key={food.id}
                  onClick={() => handleFoodClick(food.id)}
                  className={`
                    w-16 h-16 md:w-20 md:h-20 text-4xl md:text-5xl flex items-center justify-center 
                    bg-white rounded-2xl shadow-sm transition-all duration-300 transform
                    ${selectedFoodId === food.id 
                      ? 'ring-4 ring-blue-400 scale-110 -translate-y-2 shadow-lg z-10' 
                      : 'border-2 border-slate-200 hover:scale-105 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md'}
                  `}
                  aria-label={food.name}
                  aria-pressed={selectedFoodId === food.id}
                >
                  {food.emoji}
                </button>
              ))}
              {poolFoods.length === 0 && (
                <div className="w-full flex flex-col items-center justify-center text-slate-400 py-6">
                  <Sparkles size={32} className="mb-2 text-yellow-400" />
                  <p className="font-bold text-lg">All sorted! Time to check!</p>
                </div>
              )}
            </div>
          </div>

          {/* 5. Score / Feedback Panel */}
          <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-slate-100">
             <div className="flex items-center justify-between mb-4">
               <h3 className="font-bold text-slate-700 text-lg">My Progress</h3>
               <span className="text-sm font-bold text-slate-400">Attempts: {attempts}</span>
             </div>
             
             {feedback && (
               <div className={`p-4 rounded-xl mb-6 flex items-start transition-all duration-300 transform scale-100
                  ${feedback.type === 'success' ? 'bg-green-100 text-green-800 border-2 border-green-200' : 
                    feedback.type === 'error' ? 'bg-red-100 text-red-800 border-2 border-red-200' : 
                    'bg-blue-100 text-blue-800 border-2 border-blue-200'}
               `}>
                 <div className="mr-3 mt-1">
                   {feedback.type === 'success' && <CheckCircle size={24} />}
                   {feedback.type === 'error' && <XCircle size={24} />}
                   {feedback.type === 'hint' && <AlertCircle size={24} />}
                 </div>
                 <p className="text-lg font-semibold">{feedback.message}</p>
               </div>
             )}

             <div className="flex gap-4">
                <button 
                  onClick={checkAnswer}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xl font-bold py-4 px-6 rounded-2xl shadow-blue-500/30 shadow-lg transform transition active:scale-95 flex justify-center items-center"
                >
                  <CheckCircle className="mr-2" /> Check My Answer
                </button>
                <button 
                  onClick={resetActivity}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-4 px-4 rounded-2xl transition active:scale-95"
                  aria-label="Reset Activity"
                >
                  <RefreshCw size={24} />
                </button>
             </div>
          </div>
        </div>

        {/* 4. Live Visual Output Area */}
        <div className="flex flex-col space-y-6">
          
          {/* Healthy Plate */}
          <button 
            onClick={() => handlePlateClick('healthy')}
            className={`
              relative w-full h-48 md:h-56 rounded-[3rem] transition-all duration-300 
              border-8 flex flex-col items-center justify-center overflow-hidden
              ${selectedFoodId ? 'cursor-pointer hover:bg-green-100/50 hover:scale-[1.02]' : 'cursor-default'}
              ${selectedFoodId && 'healthy' === 'healthy' ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)] ring-4 ring-green-300 ring-offset-4' : 'border-green-200 bg-white shadow-sm'}
            `}
          >
            {/* Simple Plate SVG Background */}
            <svg width="200" height="200" className="absolute opacity-20 pointer-events-none" viewBox="0 0 100 100">
               <circle cx="50" cy="50" r="45" fill="none" stroke="#4ade80" strokeWidth="4" />
               <circle cx="50" cy="50" r="35" fill="none" stroke="#4ade80" strokeWidth="1" strokeDasharray="4 2" />
            </svg>
            
            <div className="absolute top-4 left-0 right-0 text-center pointer-events-none">
              <h3 className="text-2xl font-black text-green-600 tracking-wide uppercase drop-shadow-sm">Strong Foods</h3>
              <p className="text-green-500/80 font-bold text-sm">Eat every day!</p>
            </div>
            
            <div className="relative z-10 flex flex-wrap justify-center gap-2 mt-10 px-4">
               {healthyPlaced.length === 0 && !selectedFoodId && (
                 <span className="text-green-300/60 font-medium text-lg border-2 border-dashed border-green-200 px-6 py-2 rounded-2xl">Tap food, then tap here!</span>
               )}
               {healthyPlaced.map(food => (
                 <div 
                   key={food.id} 
                   onClick={(e) => { e.stopPropagation(); handleRemoveFromPlate(food.id); }}
                   className="text-4xl md:text-5xl cursor-pointer hover:scale-125 transition-transform duration-200 relative group"
                   title="Tap to remove"
                 >
                   {food.emoji}
                 </div>
               ))}
               {selectedFoodId && (
                 <div className="text-green-400 animate-pulse text-4xl">👇</div>
               )}
            </div>
          </button>

          {/* Unhealthy Plate */}
          <button 
            onClick={() => handlePlateClick('unhealthy')}
            className={`
              relative w-full h-48 md:h-56 rounded-[3rem] transition-all duration-300 
              border-8 flex flex-col items-center justify-center overflow-hidden
              ${selectedFoodId ? 'cursor-pointer hover:bg-orange-100/50 hover:scale-[1.02]' : 'cursor-default'}
              ${selectedFoodId && 'unhealthy' === 'unhealthy' ? 'border-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.5)] ring-4 ring-orange-300 ring-offset-4' : 'border-orange-200 bg-white shadow-sm'}
            `}
          >
              {/* Simple Plate SVG Background */}
            <svg width="200" height="200" className="absolute opacity-20 pointer-events-none" viewBox="0 0 100 100">
               <circle cx="50" cy="50" r="45" fill="none" stroke="#fb923c" strokeWidth="4" />
               <circle cx="50" cy="50" r="35" fill="none" stroke="#fb923c" strokeWidth="1" strokeDasharray="4 2" />
            </svg>

            <div className="absolute top-4 left-0 right-0 text-center pointer-events-none">
              <h3 className="text-2xl font-black text-orange-600 tracking-wide uppercase drop-shadow-sm">Sometimes Foods</h3>
              <p className="text-orange-500/80 font-bold text-sm">Just a little bit!</p>
            </div>
            
            <div className="relative z-10 flex flex-wrap justify-center gap-2 mt-10 px-4">
               {unhealthyPlaced.length === 0 && !selectedFoodId && (
                 <span className="text-orange-300/60 font-medium text-lg border-2 border-dashed border-orange-200 px-6 py-2 rounded-2xl">Tap food, then tap here!</span>
               )}
               {unhealthyPlaced.map(food => (
                 <div 
                   key={food.id} 
                   onClick={(e) => { e.stopPropagation(); handleRemoveFromPlate(food.id); }}
                   className="text-4xl md:text-5xl cursor-pointer hover:scale-125 transition-transform duration-200"
                   title="Tap to remove"
                 >
                   {food.emoji}
                 </div>
               ))}
               {selectedFoodId && (
                 <div className="text-orange-400 animate-pulse text-4xl">👇</div>
               )}
            </div>
          </button>
          
        </div>
      </div>

      {/* 6. Educational Value Footer */}
      <div className="bg-slate-800 text-slate-300 p-6">
        <h4 className="text-white font-bold text-lg mb-3 flex items-center">
          <Sparkles className="mr-2 text-yellow-400" size={20} /> What are we learning today?
        </h4>
        <ul className="list-disc pl-5 space-y-2 text-sm md:text-base Columns-1 md:columns-2 gap-8">
          <li><strong>Categorization:</strong> Grouping items based on physical and health attributes.</li>
          <li><strong>Nutrition Basics:</strong> Introducing the concept of "everyday" and "sometimes" foods.</li>
          <li><strong>Decision Making:</strong> Evaluating choices and applying learned rules interactively.</li>
          <li><strong>Fine Motor Skills:</strong> Dragging, tapping, and precise placement on touchscreen interfaces.</li>
        </ul>
      </div>
    </div>
  );
}
