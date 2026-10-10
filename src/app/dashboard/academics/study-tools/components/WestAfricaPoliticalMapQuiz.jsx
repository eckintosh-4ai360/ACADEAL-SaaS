import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Globe, 
  RotateCcw, 
  Target, 
  Award, 
  BookOpen, 
  HelpCircle,
  Map as MapIcon,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Info,
  ChevronLeft
} from "lucide-react";

const WEST_AFRICA_COUNTRIES = [
  { id: "benin", name: "Benin", path: "M 320 280 L 330 280 L 335 340 L 325 345 Z", color: "#FEF3C7" },
  { id: "burkina_faso", name: "Burkina Faso", path: "M 240 220 L 300 230 L 310 270 L 260 280 L 230 250 Z", color: "#D1FAE5" },
  { id: "cape_verde", name: "Cape Verde", path: "M 20 180 A 5 5 0 1 1 20 181", color: "#DBEAFE" }, // Inset/Symbolic
  { id: "cote_divoire", name: "Côte d'Ivoire", path: "M 210 290 L 255 295 L 250 350 L 200 340 Z", color: "#FEE2E2" },
  { id: "gambia", name: "Gambia", path: "M 70 215 L 100 215 L 100 220 L 70 220 Z", color: "#E0F2FE" },
  { id: "ghana", name: "Ghana", path: "M 260 295 L 295 300 L 300 360 L 255 355 Z", color: "#DCFCE7" },
  { id: "guinea", name: "Guinea", path: "M 100 240 L 150 240 L 180 270 L 150 300 L 100 280 Z", color: "#FFEDD5" },
  { id: "guinea_bissau", name: "Guinea-Bissau", path: "M 80 230 L 105 235 L 100 250 L 75 245 Z", color: "#F3E8FF" },
  { id: "liberia", name: "Liberia", path: "M 155 310 L 195 320 L 180 350 L 140 330 Z", color: "#FAFAF9" },
  { id: "mali", name: "Mali", path: "M 150 100 L 250 120 L 280 210 L 230 220 L 180 210 L 140 180 Z", color: "#CFFAFE" },
  { id: "mauritania", name: "Mauritania", path: "M 100 60 L 180 60 L 200 130 L 130 180 L 80 160 Z", color: "#FCE7F3" },
  { id: "niger", name: "Niger", path: "M 290 130 L 380 150 L 390 250 L 330 260 L 310 220 Z", color: "#FEF9C3" },
  { id: "nigeria", name: "Nigeria", path: "M 335 270 L 400 280 L 400 370 L 340 380 Z", color: "#E2E8F0" },
  { id: "senegal", name: "Senegal", path: "M 70 190 L 130 200 L 140 230 L 90 240 L 60 230 Z", color: "#F0FDFA" },
  { id: "sierra_leone", name: "Sierra Leone", path: "M 120 290 L 150 300 L 140 330 L 110 320 Z", color: "#F5F3FF" },
  { id: "togo", name: "Togo", path: "M 300 300 L 315 300 L 320 350 L 305 355 Z", color: "#F59E0B" }
];

export default function WestAfricaPoliticalMapQuiz() {
  const [gameState, setGameState] = useState('study'); // 'study', 'quiz', 'won'
  const [currentCountry, setCurrentCountry] = useState(null);
  const [identifiedCountries, setIdentifiedCountries] = useState([]);
  const [feedback, setFeedback] = useState(null); // { status: 'correct'|'incorrect', message: string }
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedCountryId, setSelectedCountryId] = useState(null);

  const totalCountries = WEST_AFRICA_COUNTRIES.length;

  const startQuiz = useCallback(() => {
    const remaining = WEST_AFRICA_COUNTRIES.filter(c => !identifiedCountries.includes(c.id));
    if (remaining.length === 0) {
      setGameState('won');
      return;
    }
    const next = remaining[Math.floor(Math.random() * remaining.length)];
    setCurrentCountry(next);
    setGameState('quiz');
    setFeedback(null);
    setSelectedCountryId(null);
  }, [identifiedCountries]);

  const handleCountryClick = (country) => {
    if (gameState === 'study') {
      setSelectedCountryId(country.id);
      return;
    }

    if (gameState === 'quiz') {
      setSelectedCountryId(country.id);
      setAttempts(prev => prev + 1);
      
      if (country.id === currentCountry.id) {
        setFeedback({ status: 'correct', message: `✅ Correct! That is ${country.name}.` });
        setScore(prev => prev + 10);
        setIdentifiedCountries(prev => {
          const updated = [...prev, country.id];
          if (updated.length === totalCountries) {
            setTimeout(() => setGameState('won'), 1500);
          } else {
            setTimeout(startQuiz, 1500);
          }
          return updated;
        });
      } else {
        setFeedback({ status: 'incorrect', message: `❌ Try Again! That was ${country.name}. Find ${currentCountry.name}.` });
      }
    }
  };

  const resetGame = () => {
    setGameState('study');
    setIdentifiedCountries([]);
    setCurrentCountry(null);
    setFeedback(null);
    setAttempts(0);
    setScore(0);
    setSelectedCountryId(null);
  };

  const progress = (identifiedCountries.length / totalCountries) * 100;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
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
      <header className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-2xl">
            <Globe className="text-blue-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">West Africa Map Quiz</h1>
            <p className="text-slate-500 font-medium">Identify the 16 countries of West Africa</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm">
            Primary 4–6
          </span>
          <span className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full border border-orange-200 shadow-sm flex items-center gap-1">
            <Clock size={16} /> 15 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls and Info */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* 2. "How to Use" box */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <HelpCircle className="text-blue-500" size={18} /> {gameState === 'study' ? 'How to Study' : 'How to Play'}
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              {gameState === 'study' 
                ? "Click on a country on the map to see its name. When you feel ready, click 'Start Quiz' to test your memory!" 
                : `Find and click on ${currentCountry?.name} on the map. Good luck!`}
            </p>
          </section>

          {/* 3. Interactive Control Zone */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-6">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
              <div className="text-center flex-1">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Score</p>
                <p className="text-2xl font-black text-blue-600">{score}</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center flex-1">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Found</p>
                <p className="text-2xl font-black text-slate-800">{identifiedCountries.length}/{totalCountries}</p>
              </div>
            </div>

            {gameState === 'study' ? (
              <button 
                onClick={startQuiz}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Target size={20} /> Start Quiz
              </button>
            ) : (
              <button 
                onClick={resetGame}
                className="w-full py-4 border-2 border-slate-100 hover:bg-slate-50 text-slate-600 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw size={18} /> Reset Quiz
              </button>
            )}

            {gameState === 'quiz' && currentCountry && (
              <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-3xl animate-in zoom-in duration-300">
                <p className="text-xs font-black text-orange-400 uppercase tracking-widest mb-2 text-center">Your Mission</p>
                <p className="text-xl font-black text-slate-800 text-center uppercase tracking-tight">Click on: <br/><span className="text-3xl text-orange-600 underline decoration-orange-200">{currentCountry.name}</span></p>
              </div>
            )}
            
            {/* Selected Info in Study Mode */}
            {gameState === 'study' && selectedCountryId && (
                <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl flex items-center gap-4 animate-in fade-in duration-300">
                    <div className="text-3xl">📍</div>
                    <div>
                        <p className="text-xs font-black text-blue-400 uppercase mb-1">Selected</p>
                        <p className="text-xl font-bold text-slate-800">{WEST_AFRICA_COUNTRIES.find(c => c.id === selectedCountryId)?.name}</p>
                    </div>
                </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex gap-4 items-start">
            <Info size={24} className="text-slate-300 shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed italic">
              <strong>Geography Fact:</strong> ECOWAS is the regional political and economic union of fifteen countries located in West Africa.
            </p>
          </div>
        </div>

        {/* Right Column: Live Visual Output Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-[3rem] shadow-xl border-8 border-slate-50 p-4 md:p-8 relative overflow-hidden min-h-[500px] flex flex-col">
            
            {/* Progress Bar Container */}
            <div className="mb-6 px-4">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Political Alignment</span>
                <span className="text-sm font-bold text-blue-600">{Math.round(progress)}% Complete</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative flex items-center justify-center">
              <svg viewBox="0 0 450 450" className="w-full h-full max-w-[500px] max-h-[500px]">
                {/* Ocean Background */}
                <rect width="450" height="450" fill="#F0F9FF" rx="40" />
                
                {/* Compass Rose */}
                <g transform="translate(400, 400) scale(0.5)" className="opacity-20">
                    <circle r="40" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="4 2" />
                    <path d="M 0 -50 L 10 0 L 0 50 L -10 0 Z" fill="#64748b" />
                    <path d="M -50 0 L 0 -10 L 50 0 L 0 10 Z" fill="#64748b" />
                    <text x="0" y="-55" textAnchor="middle" className="text-[12px] font-black fill-slate-500">N</text>
                </g>

                {/* Countries Group */}
                <g>
                  {WEST_AFRICA_COUNTRIES.map((country) => (
                    <path
                      key={country.id}
                      d={country.path}
                      fill={identifiedCountries.includes(country.id) ? '#3B82F6' : country.color}
                      stroke="#FFFFFF"
                      strokeWidth={selectedCountryId === country.id ? "3" : "1.5"}
                      className={`
                        transition-all duration-500 cursor-pointer
                        ${gameState === 'quiz' && !identifiedCountries.includes(country.id) ? 'hover:brightness-95' : ''}
                        ${gameState === 'study' ? 'hover:fill-blue-200' : ''}
                      `}
                      onClick={() => handleCountryClick(country)}
                    />
                  ))}
                </g>
                
                {/* Visual labels for identified countries in Quiz mode or selected in Study mode */}
                {WEST_AFRICA_COUNTRIES.map(country => {
                    const isIdentified = identifiedCountries.includes(country.id);
                    const isSelected = selectedCountryId === country.id;
                    if (isIdentified || (gameState === 'study' && isSelected)) {
                        // Rough centroid calculation for labels
                        const getLabelPos = (id) => {
                            const centers = {
                                "mali": [200, 160], "niger": [340, 190], "nigeria": [360, 320], "ghana": [275, 330],
                                "cote_divoire": [225, 320], "guinea": [140, 270], "senegal": [100, 215], "mauritania": [140, 110],
                                "burkina_faso": [270, 250], "benin": [325, 310], "togo": [310, 325], "sierra_leone": [130, 310],
                                "liberia": [170, 335], "guinea_bissau": [90, 240], "gambia": [85, 218], "cape_verde": [20, 195]
                            };
                            return centers[id] || [0, 0];
                        };
                        const [lx, ly] = getLabelPos(country.id);
                        return (
                            <text
                                key={`label-${country.id}`}
                                x={lx} y={ly}
                                textAnchor="middle"
                                className="text-[8px] font-black pointer-events-none fill-white drop-shadow-sm select-none"
                                style={{ fill: isIdentified ? 'white' : '#1e3a8a' }}
                            >
                                {country.id === 'cote_divoire' ? "C. d'Ivoire" : country.id === 'cape_verde' ? "C. Verde" : country.name}
                            </text>
                        );
                    }
                    return null;
                })}
              </svg>

              {/* Feedback Overlay */}
              {feedback && (
                <div className={`
                    absolute top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg font-bold text-sm
                    flex items-center gap-2 animate-in slide-in-from-top-4 duration-300
                    ${feedback.status === 'correct' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}
                `}>
                    {feedback.status === 'correct' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    {feedback.message}
                </div>
              )}

              {/* Completion Screen */}
              {gameState === 'won' && (
                <div className="absolute inset-0 bg-blue-600/95 rounded-[3rem] flex flex-col items-center justify-center text-white px-8 text-center animate-in fade-in duration-500 z-10">
                    <div className="bg-white/20 p-6 rounded-full mb-6">
                        <Award size={80} className="animate-bounce" />
                    </div>
                    <h2 className="text-4xl font-black mb-2">Regional Expert! 🏆</h2>
                    <p className="text-blue-100 mb-8 max-w-sm">You have correctly identified every country in West Africa. You are a geography star!</p>
                    <div className="bg-white/10 p-4 rounded-3xl border border-white/20 mb-8">
                        <p className="text-xs font-black uppercase tracking-widest text-blue-200 mb-1">Final Performance</p>
                        <p className="text-3xl font-black">Score: {score} pts</p>
                        <p className="text-sm font-bold opacity-80 mt-1">{attempts} Total Taps</p>
                    </div>
                    <button 
                        onClick={resetGame}
                        className="bg-white text-blue-600 px-10 py-4 rounded-2xl font-black text-lg hover:bg-blue-50 transition-all active:scale-95 shadow-xl"
                    >
                        Learn More Countries
                    </button>
                </div>
              )}
            </div>

            {/* Label Inset */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest mr-2">Ecosystems:</span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                    <div className="w-2 h-2 rounded-full bg-blue-100" /> Sahel / Savanna
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                    <div className="w-2 h-2 rounded-full bg-emerald-100" /> Forest / Coastal
                </span>
            </div>
          </div>
        </div>
      </main>

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-blue-600" size={24} />
          What You'll Learn
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <MapIcon size={14} className="text-blue-600" />
            </div>
            <p className="text-slate-600 text-sm">Successfully identify all <strong>16 countries</strong> that make up the West Africa sub-region.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Globe size={14} className="text-blue-600" />
            </div>
            <p className="text-slate-600 text-sm">Understand the <strong>political boundaries</strong> and neighbors of Ghana and its sister nations.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <CheckCircle2 size={14} className="text-blue-600" />
            </div>
            <p className="text-slate-600 text-sm">Practice <strong>active recall</strong> to build long-term memory of geographical maps.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <ChevronRight size={14} className="text-blue-600" />
            </div>
            <p className="text-slate-600 text-sm">Prepare for upper Primary and JHS <strong>Social Studies</strong> curricula regarding African geography.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
