import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function FractionBuilder() {
  // State for fraction values
  const [numerator, setNumerator] = useState(3);
  const [denominator, setDenominator] = useState((8));
  
  // State for target fraction (challenge mode)
  const [targetNumerator, setTargetNumerator] = useState(1);
  const [targetDenominator, setTargetDenominator] = useState(2);
  
  // State for feedback
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [hint, setHint] = useState("");
  
  // State for mode (explore or challenge)
  const [mode, setMode] = useState("explore"); // "explore" or "challenge"
  
  // Generate new challenge
  const generateChallenge = useCallback(() => {
    const denoms = [2, 3, 4, 5, 6, 8, 10];
    const newDenom = denoms[Math.floor(Math.random() * denoms.length)];
    const newNum = Math.floor(Math.random() * (newDenom - 1)) + 1;
    setTargetNumerator(newNum);
    setTargetDenominator(newDenom);
    setShowFeedback(false);
    setAttempts(0);
    setHint("");
  }, []);
  
  // Initialize challenge on mount
  useEffect(() => {
    if (mode === "challenge") {
      generateChallenge();
    }
  }, [mode, generateChallenge]);
  
  // Check if fractions are equivalent
  const checkAnswer = useCallback(() => {
    setAttempts(prev => prev + 1);
    
    const currentValue = numerator / denominator;
    const targetValue = targetNumerator / targetDenominator;
    
    if (Math.abs(currentValue - targetValue) < 0.001) {
      setIsCorrect(true);
      setShowFeedback(true);
      setHint("🎉 Excellent! You found an equivalent fraction!");
    } else {
      setIsCorrect(false);
      setShowFeedback(true);
      
      // Provide helpful hint
      if (currentValue < targetValue) {
        setHint("💡 Try increasing the numerator or decreasing the denominator to make the fraction larger.");
      } else {
        setHint("💡 Try decreasing the numerator or increasing the denominator to make the fraction smaller.");
      }
    }
  }, [numerator, denominator, targetNumerator, targetDenominator]);
  
  // Calculate simplified fraction
  const simplifiedFraction = useMemo(() => {
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const commonDivisor = gcd(numerator, denominator);
    return {
      num: numerator / commonDivisor,
      den: denominator / commonDivisor
    };
  }, [numerator, denominator]);
  
  // Check if current fraction can be simplified
  const canSimplify = useMemo(() => {
    return simplifiedFraction.num !== numerator || simplifiedFraction.den !== denominator;
  }, [numerator, denominator, simplifiedFraction]);
  
  // Calculate equivalent fractions
  const equivalentFractions = useMemo(() => {
    const fractions = [];
    for (let mult = 2; mult <= 4; mult++) {
      fractions.push({
        num: numerator * mult,
        den: denominator * mult
      });
    }
    // Also show halves if applicable
    if (denominator % 2 === 0 && numerator % 2 === 0) {
      fractions.push({
        num: numerator / 2,
        den: denominator / 2
      });
    }
    return fractions;
  }, [numerator, denominator]);
  
  // Pie chart calculation
  const pieSlicePath = useMemo(() => {
    if (denominator === 0) return "";
    const angle = (numerator / denominator) * 360;
    const radius = 80;
    const centerX = 100;
    const centerY = 100;
    
    if (angle === 360) {
      return `M ${centerX} ${centerY} m -${radius}, 0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`;
    }
    
    const startAngle = -90;
    const endAngle = startAngle + angle;
    
    const startX = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
    const startY = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
    const endX = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
    const endY = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    return `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  }, [numerator, denominator]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* ── BACK BUTTON ── */}
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
        
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 text-center">
          <div className="text-5xl md:text-6xl mb-3">🍕</div>
          <h1 className="text-3xl md:text-4xl font-bold text-blue-700 mb-2">
            Fraction Builder
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Learn about parts of a whole with pie and bar models!
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-semibold text-sm">
              Primary 4-6
            </span>
            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full font-semibold text-sm">
              ⏱️ 15 minutes
            </span>
          </div>
        </div>
        
        {/* How to Use */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-6">
          <h3 className="font-bold text-amber-800 text-lg mb-2">📖 How to Use</h3>
          <p className="text-amber-900">
            Use the sliders to change the numerator (top number) and denominator (bottom number). 
            Watch how the pie chart and bar model change to show the fraction! 
            Try the Challenge mode to find equivalent fractions.
          </p>
        </div>
        
        {/* Mode Toggle */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setMode("explore")}
            className={`px-6 py-3 rounded-full font-bold text-lg transition-all duration-300 ${
              mode === "explore"
                ? "bg-blue-500 text-white shadow-lg scale-105"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
          >
            🔍 Explore Mode
          </button>
          <button
            onClick={() => setMode("challenge")}
            className={`px-6 py-3 rounded-full font-bold text-lg transition-all duration-300 ${
              mode === "challenge"
                ? "bg-orange-500 text-white shadow-lg scale-105"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
          >
            🎯 Challenge Mode
          </button>
        </div>
        
        {/* Challenge Target Display */}
        {mode === "challenge" && (
          <div className="bg-orange-100 border-2 border-orange-300 rounded-2xl p-5 mb-6 text-center">
            <h3 className="font-bold text-orange-800 text-xl mb-2">Find an Equivalent Fraction!</h3>
            <div className="text-4xl font-bold text-orange-700">
              {targetNumerator} / {targetDenominator}
            </div>
            <p className="text-orange-600 mt-2">Create a fraction that has the same value as this one!</p>
          </div>
        )}
        
        {/* Control Zone */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-700 mb-6 text-center">🎛️ Controls</h2>
          
          {/* Numerator Slider */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-2xl font-bold text-blue-600">Numerator</span>
              <span className="text-3xl font-bold text-blue-700 bg-blue-100 px-6 py-2 rounded-xl">
                {numerator}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={denominator}
              value={numerator}
              onChange={(e) => setNumerator(parseInt(e.target.value))}
              className="w-full h-8 bg-blue-200 rounded-full appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-gray-500 mt-2 text-center">The number of equal parts we have</p>
          </div>
          
          {/* Denominator Slider */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-2xl font-bold text-green-600">Denominator</span>
              <span className="text-3xl font-bold text-green-700 bg-green-100 px-6 py-2 rounded-xl">
                {denominator}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="12"
              value={denominator}
              onChange={(e) => {
                const newDenom = parseInt(e.target.value);
                setDenominator(newDenom);
                // Adjust numerator if it exceeds new denominator
                if (numerator > newDenom) {
                  setNumerator(newDenom);
                }
              }}
              className="w-full h-8 bg-green-200 rounded-full appearance-none cursor-pointer accent-green-600"
            />
            <p className="text-gray-500 mt-2 text-center">The total number of equal parts</p>
          </div>
          
          {/* Quick Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <button
              onClick={() => { setNumerator(1); setDenominator(2); }}
              className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-semibold transition-all duration-300"
            >
              1/2
            </button>
            <button
              onClick={() => { setNumerator(1); setDenominator(3); }}
              className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl font-semibold transition-all duration-300"
            >
              1/3
            </button>
            <button
              onClick={() => { setNumerator(1); setDenominator(4); }}
              className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl font-semibold transition-all duration-300"
            >
              1/4
            </button>
            <button
              onClick={() => { setNumerator(2); setDenominator(3); }}
              className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl font-semibold transition-all duration-300"
            >
              2/3
            </button>
            <button
              onClick={() => { setNumerator(3); setDenominator(4); }}
              className="px-4 py-2 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-xl font-semibold transition-all duration-300"
            >
              3/4
            </button>
          </div>
        </div>
        
        {/* Visual Output Area */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-700 mb-6 text-center">📊 Visual Models</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Pie Chart */}
            <div className="text-center">
              <h3 className="font-bold text-gray-600 mb-4">Pie Model</h3>
              <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto">
                {/* Background circle */}
                <circle cx="100" cy="100" r="80" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="2" />
                {/* Colored slice */}
                <path d={pieSlicePath} fill="#4D96FF" stroke="#2563eb" strokeWidth="2" className="transition-all duration-300" />
                {/* Division lines */}
                {denominator > 1 && Array.from({ length: denominator }).map((_, i) => {
                  const angle = (i / denominator) * 360 - 90;
                  const x = 100 + 80 * Math.cos((angle * Math.PI) / 180);
                  const y = 100 + 80 * Math.sin((angle * Math.PI) / 180);
                  return (
                    <line
                      key={i}
                      x1="100"
                      y1="100"
                      x2={x}
                      y2={y}
                      stroke="#6b7280"
                      strokeWidth="2"
                      className="transition-all duration-300"
                    />
                  );
                })}
              </svg>
              <div className="text-2xl font-bold text-blue-600 mt-4">
                {numerator} / {denominator}
              </div>
            </div>
            
            {/* Bar Model */}
            <div className="text-center">
              <h3 className="font-bold text-gray-600 mb-4">Bar Model</h3>
              <div className="w-full max-w-xs mx-auto">
                {/* Whole bar background */}
                <div className="h-16 bg-gray-200 rounded-xl overflow-hidden flex border-2 border-gray-300">
                  {/* Colored portions */}
                  <div className="flex h-full transition-all duration-300">
                    {Array.from({ length: denominator }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 border-r border-white last:border-0 transition-all duration-300 ${
                          i < numerator ? "bg-green-500" : "bg-gray-100"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {/* Labels */}
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>0</span>
                  <span>1 whole</span>
                </div>
                {/* Fraction display */}
                <div className="text-2xl font-bold text-green-600 mt-4">
                  {numerator} / {denominator}
                </div>
              </div>
            </div>
          </div>
          
          {/* Fraction Value */}
          <div className="text-center mt-8 p-4 bg-gray-50 rounded-2xl">
            <p className="text-gray-600 mb-2">Decimal Value:</p>
            <p className="text-3xl font-bold text-purple-600">
              {denominator > 0 ? (numerator / denominator).toFixed(2) : "undefined"}
            </p>
          </div>
        </div>
        
        {/* Simplification & Equivalents */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Simplification */}
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <h3 className="font-bold text-gray-700 mb-4 text-lg">🔬 Simplify</h3>
            {canSimplify ? (
              <div className="text-center">
                <p className="text-gray-600 mb-2">This fraction can be simplified!</p>
                <div className="text-2xl font-bold text-blue-600">
                  {numerator}/{denominator} = {simplifiedFraction.num}/{simplifiedFraction.den}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p>This fraction is already in its simplest form!</p>
                <div className="text-2xl font-bold text-blue-600 mt-2">
                  {numerator}/{denominator}
                </div>
              </div>
            )}
          </div>
          
          {/* Equivalents */}
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <h3 className="font-bold text-gray-700 mb-4 text-lg">🔗 Equivalent Fractions</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {equivalentFractions.map((eq, i) => (
                <button
                  key={i}
                  onClick={() => { setNumerator(eq.num); setDenominator(eq.den); }}
                  className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl font-semibold transition-all duration-300"
                >
                  {eq.num}/{eq.den}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Check My Answer Button (Challenge Mode) */}
        {mode === "challenge" && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 text-center">
            <button
              onClick={checkAnswer}
              className="px-10 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xl font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              ✅ Check My Answer
            </button>
            
            {/* Feedback Panel */}
            {showFeedback && (
              <div className={`mt-6 p-6 rounded-2xl transition-all duration-300 ${
                isCorrect ? "bg-green-100 border-2 border-green-400" : "bg-red-100 border-2 border-red-400"
              }`}>
                <div className="text-2xl font-bold mb-2">
                  {isCorrect ? "🎉 Correct!" : "❌ Try Again!"}
                </div>
                <p className="text-lg">{hint}</p>
                {!isCorrect && (
                  <p className="text-sm text-gray-600 mt-2">Attempts: {attempts}</p>
                )}
              </div>
            )}
            
            {/* New Challenge Button */}
            {isCorrect && (
              <button
                onClick={generateChallenge}
                className="mt-6 px-8 py-3 bg-blue-500 text-white font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                🔄 New Challenge
              </button>
            )}
          </div>
        )}
        
        {/* Educational Value Footer */}
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h3 className="font-bold text-gray-700 mb-4 text-lg">💡 What You'll Learn</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <span className="text-gray-600">Understand what numerators and denominators represent in fractions</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <span className="text-gray-600">Visualize fractions using pie charts and bar models</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <span className="text-gray-600">Find equivalent fractions by multiplying or dividing top and bottom numbers</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <span className="text-gray-600">Simplify fractions to their smallest form</span>
            </li>
          </ul>
        </div>
        
      </div>
    </div>
  );
}
