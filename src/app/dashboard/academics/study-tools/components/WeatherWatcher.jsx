import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Sun, 
  CloudRain, 
  Cloud, 
  Wind, 
  CheckCircle2, 
  HelpCircle,
  RefreshCcw,
  ChevronLeft
} from "lucide-react";

const WEATHER_TYPES = [
  { id: "sunny", label: "Sunny", icon: Sun, color: "text-amber-500", bg: "bg-amber-100", border: "border-amber-300" },
  { id: "rainy", label: "Rainy", icon: CloudRain, color: "text-blue-500", bg: "bg-blue-100", border: "border-blue-300" },
  { id: "cloudy", label: "Cloudy", icon: Cloud, color: "text-gray-500", bg: "bg-gray-100", border: "border-gray-300" },
  { id: "windy", label: "Windy", icon: Wind, color: "text-teal-500", bg: "bg-teal-100", border: "border-teal-300" },
];

export default function WeatherWatcher() {
  const [targetWeather, setTargetWeather] = useState("sunny");
  const [selectedWeather, setSelectedWeather] = useState(null);
  const [feedback, setFeedback] = useState("idle"); // idle, correct, incorrect
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);

  // Pick a random weather on mount
  useEffect(() => {
    pickRandomWeather();
  }, []);

  const pickRandomWeather = useCallback(() => {
    const random = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)].id;
    setTargetWeather(random);
    setSelectedWeather(null);
    setFeedback("idle");
  }, []);

  const handleSelect = (weatherId) => {
    if (feedback === "correct") return;
    setSelectedWeather(weatherId);
    setFeedback("idle");
  };

  const checkAnswer = () => {
    if (!selectedWeather) return;
    setAttempts((prev) => prev + 1);
    if (selectedWeather === targetWeather) {
      setFeedback("correct");
      setScore((prev) => prev + 1);
    } else {
      setFeedback("incorrect");
    }
  };

  const resetGame = () => {
    pickRandomWeather();
  };

  // Helper to render the scene
  const renderScene = () => {
    switch (targetWeather) {
      case "sunny":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="40" fill="url(#sunGlow)" className="animate-pulse" />
            <circle cx="50" cy="50" r="20" fill="#f59e0b" />
            {Array.from({ length: 8 }).map((_, i) => (
              <line
                key={i}
                x1="50"
                y1="25"
                x2="50"
                y2="10"
                stroke="#f59e0b"
                strokeWidth="4"
                strokeLinecap="round"
                transform={`rotate(${i * 45} 50 50)`}
              />
            ))}
          </svg>
        );
      case "rainy":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
            <path
              d="M 30 50 Q 30 30 50 30 Q 70 30 70 50 A 20 20 0 0 1 50 70 A 20 20 0 0 1 30 50 Z"
              fill="#94a3b8"
            />
            <path
              d="M 20 60 Q 30 40 50 50 Q 80 40 80 60"
              fill="none"
              stroke="#64748b"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-50"
            />
            <circle cx="35" cy="55" r="15" fill="#94a3b8" />
            <circle cx="65" cy="55" r="15" fill="#94a3b8" />
            <circle cx="50" cy="45" r="20" fill="#94a3b8" />
            
            {/* Raindrops */}
            {[
              { x: 35, y: 70, delay: "0s" },
              { x: 50, y: 75, delay: "0.2s" },
              { x: 65, y: 70, delay: "0.4s" },
              { x: 42, y: 80, delay: "0.1s" },
              { x: 58, y: 80, delay: "0.3s" },
            ].map((drop, i) => (
              <line
                key={i}
                x1={drop.x}
                y1={drop.y}
                x2={drop.x - 5}
                y2={drop.y + 10}
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
                style={{ animation: `raining 1s infinite linear ${drop.delay}` }}
              />
            ))}
            <style jsx>{`
              @keyframes raining {
                0% { transform: translateY(0); opacity: 1; }
                100% { transform: translateY(20px); opacity: 0; }
              }
            `}</style>
          </svg>
        );
      case "cloudy":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <g className="animate-[bounce_4s_ease-in-out_infinite]">
              <circle cx="35" cy="55" r="15" fill="#e2e8f0" />
              <circle cx="65" cy="55" r="15" fill="#e2e8f0" />
              <circle cx="50" cy="45" r="20" fill="#e2e8f0" />
              <rect x="35" y="45" width="30" height="25" fill="#e2e8f0" rx="5" />
            </g>
            <g className="animate-[bounce_5s_ease-in-out_infinite]" transform="translate(20, -10) scale(0.7)">
              <circle cx="35" cy="55" r="15" fill="#cbd5e1" />
              <circle cx="65" cy="55" r="15" fill="#cbd5e1" />
              <circle cx="50" cy="45" r="20" fill="#cbd5e1" />
              <rect x="35" y="45" width="30" height="25" fill="#cbd5e1" rx="5" />
            </g>
          </svg>
        );
      case "windy":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Wind lines */}
            <path
              d="M 10 30 Q 30 20 60 30 T 90 20"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="10 5"
              className="animate-[dash_2s_linear_infinite]"
            />
            <path
              d="M 20 50 Q 50 40 70 60 T 95 50"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="15 10"
              className="animate-[dash_3s_linear_infinite]"
            />
            <path
              d="M 5 70 Q 40 80 60 70 T 80 85"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="8 6"
              className="animate-[dash_2.5s_linear_infinite]"
            />
            {/* Leaves blowing */}
            <path d="M 40 40 Q 45 35 50 40 Q 45 45 40 40" fill="#84cc16" className="animate-[spin_3s_linear_infinite]" />
            <path d="M 70 70 Q 75 65 80 70 Q 75 75 70 70" fill="#84cc16" className="animate-[spin_2s_linear_infinite]" />
            <path d="M 80 30 Q 85 25 90 30 Q 85 35 80 30" fill="#84cc16" className="animate-[spin_4s_linear_infinite]" />
            
            <style jsx>{`
              @keyframes dash {
                to { stroke-dashoffset: -40; }
              }
            `}</style>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 bg-white rounded-2xl shadow-lg border border-gray-100 font-sans">
      {/* ── BACK BUTTON ── */}
      <div className="mb-4">
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
      </div>

      {/* 1. Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b pb-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="text-5xl bg-blue-50 p-3 rounded-2xl">🌦️</div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Weather Watcher
            </h1>
            <p className="text-gray-500 font-medium">
              Match the weather icon to today's magical picture!
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm">
          <span className="bg-red-100 text-red-700 font-bold px-3 py-1 rounded-full border border-red-200">
            Nursery Unit
          </span>
          <span className="flex items-center text-gray-500 font-medium">
            <RefreshCcw className="w-4 h-4 mr-1" /> 5 min
          </span>
        </div>
      </div>

      {/* 2. How to Use Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
        <h2 className="text-blue-800 font-bold mb-2 flex items-center gap-2">
          <HelpCircle className="w-5 h-5" /> How to Play
        </h2>
        <p className="text-blue-700 text-lg">
          Look at the picture in the big window. Is it sunny, rainy, cloudy, or windy?
          Tap the big button that matches the weather to see if you are right!
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-center">
        {/* 4. Live Visual Output Area */}
        <div className="bg-sky-50 rounded-3xl p-6 border-4 border-sky-100 shadow-inner flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden transition-colors duration-500">
          <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-sky-800 font-bold text-sm shadow-sm flex items-center gap-2">
            👀 Today's View
          </div>
          <div className="w-64 h-64">
            {renderScene()}
          </div>
        </div>

        {/* 3. Interactive Control Zone */}
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            {WEATHER_TYPES.map((weather) => {
              const Icon = weather.icon;
              const isSelected = selectedWeather === weather.id;
              
              return (
                <button
                  key={weather.id}
                  onClick={() => handleSelect(weather.id)}
                  disabled={feedback === "correct"}
                  className={`
                    h-24 md:h-32 flex flex-col items-center justify-center gap-2 rounded-2xl
                    border-4 transition-all duration-300 transform active:scale-95
                    ${isSelected 
                      ? `${weather.bg} ${weather.border} shadow-md scale-105` 
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'}
                  `}
                >
                  <Icon 
                    className={`w-10 h-10 md:w-12 md:h-12 ${weather.color} ${isSelected ? 'animate-bounce' : ''}`} 
                  />
                  <span className={`text-lg md:text-xl font-bold ${isSelected ? weather.color : 'text-gray-600'}`}>
                    {weather.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 5. Score / Feedback Panel */}
          <div className="bg-gray-50 p-6 rounded-2xl border flex flex-col items-center text-center gap-4">
            <div className="flex justify-between w-full text-sm font-bold text-gray-500 px-2">
              <span>Score: {score}</span>
              <span>Attempts: {attempts}</span>
            </div>

            {feedback === "idle" && (
              <button
                onClick={checkAnswer}
                disabled={!selectedWeather}
                className={`w-full py-4 text-xl font-bold rounded-xl text-white transition-all transform active:scale-95
                  ${selectedWeather 
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-md' 
                    : 'bg-gray-300 cursor-not-allowed'}
                `}
              >
                Check My Answer!
              </button>
            )}

            {feedback === "correct" && (
              <div className="w-full animate-in fade-in zoom-in duration-300">
                <div className="bg-green-100 text-green-700 p-4 rounded-xl border border-green-200 mb-4 flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-8 h-8" />
                  <span className="text-xl font-bold">Great Job! It is {WEATHER_TYPES.find(w => w.id === targetWeather)?.label}!</span>
                </div>
                <button
                  onClick={resetGame}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 text-white text-xl font-bold rounded-xl shadow-md transition-transform active:scale-95"
                >
                  Play Again
                </button>
              </div>
            )}

            {feedback === "incorrect" && (
              <div className="w-full animate-in shake duration-300">
                <div className="bg-red-100 text-red-700 p-4 rounded-xl border border-red-200 mb-4 font-bold text-lg">
                  ❌ Try Again! Look closely at the picture.
                </div>
                <button
                  onClick={checkAnswer}
                  disabled={!selectedWeather}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-transform active:scale-95"
                >
                  Check Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Educational Value Footer */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <h3 className="text-gray-500 font-bold mb-3 text-sm uppercase tracking-wider">
          Learning Benefits
        </h3>
        <ul className="grid md:grid-cols-2 gap-2">
          {[
            "Develops observational skills identifying environmental changes",
            "Builds early science vocabulary (sunny, cloudy, rainy, windy)",
            "Enhances fine motor skills through touch interactions",
            "Connects visual symbols to real-world weather phenomena"
          ].map((benefit, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-600 text-sm">
              <span className="text-blue-500 mt-0.5">•</span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
