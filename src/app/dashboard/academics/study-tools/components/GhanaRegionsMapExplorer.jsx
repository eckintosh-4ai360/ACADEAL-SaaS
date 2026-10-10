import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Map as MapIcon, 
  MapPin, 
  Info, 
  Award, 
  RefreshCcw, 
  CheckCircle2, 
  Navigation,
  BookOpen,
  ChevronLeft
} from "lucide-react";

const REGIONS_DATA = [
  { id: "GA", name: "Greater Accra", capital: "Accra", fact: "The smallest region but contains the national capital.", color: "#4D96FF", x: 230, y: 340, path: "M 210,330 L 250,330 L 245,355 L 215,355 Z" },
  { id: "AS", name: "Ashanti", capital: "Kumasi", fact: "Home of the famous Ashanti Kingdom and Kente weaving.", color: "#6BCB77", x: 140, y: 260, path: "M 120,220 L 180,220 L 190,290 L 130,300 Z" },
  { id: "WE", name: "Western", capital: "Sekondi-Takoradi", fact: "Known for the beautiful beaches and Ghana's first oil discovery.", color: "#FFD93D", x: 80, y: 340, path: "M 60,300 L 110,310 L 100,380 L 70,380 Z" },
  { id: "CE", name: "Central", capital: "Cape Coast", fact: "Famous for historical castles and the Kakum National Park.", color: "#FF6B6B", x: 150, y: 345, path: "M 115,315 L 170,310 L 180,360 L 120,370 Z" },
  { id: "EA", name: "Eastern", capital: "Koforidua", fact: "Home to the Akosombo Dam which provides electricity.", color: "#845EC2", x: 210, y: 280, path: "M 185,240 L 235,245 L 240,320 L 185,300 Z" },
  { id: "VO", name: "Volta", capital: "Ho", fact: "Known for the highest mountains in Ghana, like Mt. Afadjato.", color: "#D65DB1", x: 260, y: 260, path: "M 245,210 L 280,215 L 275,320 L 245,320 Z" },
  { id: "NO", name: "Northern", capital: "Tamale", fact: "The largest region in Ghana with a rich cultural heritage.", color: "#FF9671", x: 190, y: 130, path: "M 140,100 L 240,95 L 245,170 L 160,180 Z" },
  { id: "UE", name: "Upper East", capital: "Bolgatanga", fact: "Famous for beautiful straw baskets and leather works.", color: "#008F7A", x: 215, y: 40, path: "M 185,15 L 245,20 L 235,65 L 185,60 Z" },
  { id: "UW", name: "Upper West", capital: "Wa", fact: "Home to the Wechiau Hippo Sanctuary on the Black Volta.", color: "#0089BA", x: 100, y: 50, path: "M 65,25 L 140,20 L 135,90 L 80,95 Z" },
  { id: "BO", name: "Bono", capital: "Sunyani", fact: "Considered the breadbasket of Ghana due to food production.", color: "#C34A36", x: 90, y: 210, path: "M 55,180 L 120,175 L 115,245 L 65,250 Z" },
  { id: "BE", name: "Bono East", capital: "Techiman", fact: "Hosts the famous Boabeng-Fiema Monkey Sanctuary.", color: "#FF8066", x: 155, y: 200, path: "M 130,165 L 195,160 L 180,225 L 125,230 Z" },
  { id: "AH", name: "Ahafo", capital: "Goaso", fact: "Rich in mineral resources including gold and cocoa.", color: "#4B4453", x: 80, y: 260, path: "M 60,255 L 115,250 L 110,295 L 55,295 Z" },
  { id: "SV", name: "Savannah", capital: "Damongo", fact: "Home to Mole National Park, Ghana's biggest wildlife park.", color: "#B0A8B9", x: 120, y: 120, path: "M 75,100 L 155,105 L 145,170 L 60,165 Z" },
  { id: "NE", name: "North East", capital: "Nalerigu", fact: "Famous for the Gambaga Scarp and ancient rock carvings.", color: "#00D2FC", x: 220, y: 80, path: "M 180,70 L 255,75 L 255,115 L 185,120 Z" },
  { id: "OT", name: "Oti", capital: "Dambai", fact: "Created from the northern part of the Volta Region.", color: "#009EFA", x: 260, y: 190, path: "M 245,175 L 285,180 L 280,230 L 245,225 Z" },
  { id: "WN", name: "Western North", capital: "Wiawso", fact: "Vast forest reserves and Ghana's major cocoa producing area.", color: "#935FF2", x: 60, y: 310, path: "M 35,280 L 85,285 L 75,340 L 40,335 Z" }
];

export default function GhanaRegionsMapExplorer() {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [discovered, setDiscovered] = useState([]);
  const [quizMode, setQuizMode] = useState(false);
  const [quizTarget, setQuizTarget] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);

  // Initialize discovery list from localStorage could be here, but using React state as per instructions
  
  const handleRegionClick = (region) => {
    if (quizMode) {
      setAttempts(prev => prev + 1);
      if (region.id === quizTarget.id) {
        setFeedback("correct");
        if (!discovered.includes(region.id)) {
          setDiscovered(prev => [...prev, region.id]);
        }
      } else {
        setFeedback("incorrect");
      }
      setSelectedRegion(region);
    } else {
      setSelectedRegion(region);
      if (!discovered.includes(region.id)) {
        setDiscovered(prev => [...prev, region.id]);
      }
    }
  };

  const startQuiz = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * REGIONS_DATA.length);
    setQuizTarget(REGIONS_DATA[randomIndex]);
    setQuizMode(true);
    setFeedback(null);
    setSelectedRegion(null);
    setAttempts(0);
  }, []);

  const resetExplorer = () => {
    setQuizMode(false);
    setQuizTarget(null);
    setFeedback(null);
    setSelectedRegion(null);
    setAttempts(0);
  };

  const progress = Math.round((discovered.length / REGIONS_DATA.length) * 100);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 bg-blue-50/30 min-h-screen font-sans text-slate-800">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      {/* 1. Header */}
      <header className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-100 p-4 rounded-2xl">
            <span className="text-4xl text-emerald-600">🇬🇭</span>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Ghana Regions Explorer</h1>
            <p className="text-slate-500 font-medium">Discover our 16 beautiful regions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold border border-blue-200 shadow-sm">
            Primary 1–3
          </span>
          <span className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-sm font-bold border border-orange-200 shadow-sm flex items-center gap-1">
            <MapIcon size={16} /> 15 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Map Area */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* 2. How to Use Box */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex gap-3">
              <div className="bg-blue-100 p-2 rounded-lg h-fit">
                <Info className="text-blue-500" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">How to Explore:</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Click on any region on the map to see its capital city and a fun fact. Try to discover all 16 regions!
                </p>
              </div>
            </div>
          </section>

          {/* 4. Live Visual Output Area (The Map) */}
          <div className="bg-white rounded-3xl p-4 md:p-8 shadow-xl border border-white flex flex-col items-center relative overflow-hidden h-[500px] md:h-[600px] transition-all duration-500">
             {/* Simple SVG Map of Ghana */}
             <svg viewBox="0 0 300 400" className="w-full h-full drop-shadow-md select-none transition-transform hover:scale-[1.02] duration-700">
                {/* Background Ocean */}
                <rect width="300" height="400" fill="transparent" />
                
                {/* Gulf of Guinea label */}
                <text x="150" y="390" textAnchor="middle" className="text-[10px] fill-blue-300 font-bold tracking-widest uppercase">Gulf of Guinea</text>
                
                {/* Draw each region */}
                {REGIONS_DATA.map((region) => {
                  const isSelected = selectedRegion?.id === region.id;
                  const isDiscovered = discovered.includes(region.id);
                  const isTarget = quizMode && quizTarget?.id === region.id;
                  
                  return (
                    <g 
                      key={region.id} 
                      className="cursor-pointer group"
                      onClick={() => handleRegionClick(region)}
                    >
                      <path
                        d={region.path}
                        fill={isSelected ? region.color : (isDiscovered ? `${region.color}80` : "#f1f5f9")}
                        stroke={isSelected ? "white" : "#cbd5e1"}
                        strokeWidth={isSelected ? "3" : "1.5"}
                        className="transition-all duration-300 hover:opacity-100"
                      />
                      {/* Dots for Capitals */}
                      <circle 
                        cx={region.x} 
                        cy={region.y} 
                        r={isSelected ? "4" : "2"} 
                        fill={isSelected ? "white" : "#64748b"} 
                        className="pointer-events-none transition-all duration-300"
                      />
                      {/* Tooltip on Hover (very simple version for younger kids) */}
                      {!selectedRegion && (
                        <text
                          x={region.x}
                          y={region.y - 10}
                          textAnchor="middle"
                          className="opacity-0 group-hover:opacity-100 text-[8px] font-bold fill-slate-700 pointer-events-none transition-opacity bg-white"
                        >
                          {region.name}
                        </text>
                      )}
                    </g>
                  );
                })}
             </svg>

             {/* Discovery Stats */}
             <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-white shadow-sm flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Regions Discovered</span>
                <span className="text-2xl font-black text-emerald-600">{discovered.length}<span className="text-slate-300">/16</span></span>
                <div className="w-24 h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                   <div 
                    className="h-full bg-emerald-500 transition-all duration-1000" 
                    style={{ width: `${progress}%` }} 
                   />
                </div>
             </div>

             {/* Legend */}
             <div className="absolute bottom-4 left-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                   <div className="w-3 h-3 bg-emerald-500 rounded-sm opacity-50" />
                   <span>Discovered</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                   <div className="w-3 h-3 bg-slate-200 rounded-sm" />
                   <span>To Explore</span>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Interaction & Feedback */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* 3. Interactive Control Zone (Region Details) */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 min-h-[300px] flex flex-col">
            {selectedRegion ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full flex flex-col">
                <div 
                  className="w-full h-16 rounded-2xl mb-4 flex items-center justify-center text-white"
                  style={{ backgroundColor: selectedRegion.color }}
                >
                  <MapPin size={24} className="mr-2" />
                  <h2 className="text-xl font-black">{selectedRegion.name}</h2>
                </div>

                <div className="space-y-4 flex-grow">
                  <div className="bg-blue-50 p-4 rounded-2xl">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Capital City</span>
                    <p className="text-lg font-bold text-blue-900">{selectedRegion.capital}</p>
                  </div>

                  <div className="bg-emerald-50 p-4 rounded-2xl">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">Fun Cultural Fact</span>
                    <p className="text-slate-700 text-sm leading-relaxed">{selectedRegion.fact}</p>
                  </div>
                </div>

                {discovered.includes(selectedRegion.id) && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600 font-bold bg-emerald-100/50 py-2 rounded-xl">
                    <CheckCircle2 size={16} />
                    <span>Region Discovered!</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-8 opacity-40">
                <Navigation size={48} className="text-slate-300 mb-4 animate-pulse" />
                <p className="font-bold text-slate-400">Tap a region on the map to see its details here.</p>
              </div>
            )}
          </div>

          {/* 5. Score / Feedback Panel (Quiz Mode Toggle) */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            {!quizMode ? (
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-2">Ready for a challenge?</h3>
                <p className="text-sm text-slate-500 mb-6 font-medium">Test your knowledge of the regions!</p>
                <button
                  onClick={startQuiz}
                  disabled={discovered.length < 1}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Award className="group-hover:rotate-12 transition-transform" />
                  Start Region Quiz
                </button>
                {discovered.length < 1 && (
                   <p className="text-[10px] text-slate-400 mt-2 italic font-medium">Explore at least one region to start the quiz.</p>
                )}
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-2">
                   <h3 className="font-black text-orange-600 uppercase text-xs tracking-widest flex items-center gap-1">
                      <Award size={14} /> Quiz Mission
                   </h3>
                   <span className="text-xs font-bold text-slate-400">Attempts: {attempts}</span>
                </div>

                <div className="bg-orange-50 border-2 border-orange-100 p-4 rounded-2xl text-center">
                   <p className="text-sm font-medium text-slate-600 mb-1">Where is the region called:</p>
                   <p className="text-xl font-black text-orange-900 uppercase tracking-tight">{quizTarget?.name}?</p>
                </div>

                {feedback === "correct" ? (
                  <div className="bg-emerald-50 border-2 border-emerald-500 p-4 rounded-2xl text-center">
                    <h4 className="text-emerald-900 font-bold mb-1 italic">✅ Correct! Welldone!</h4>
                    <button
                      onClick={startQuiz}
                      className="mt-3 w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
                    >
                      Next Question
                    </button>
                  </div>
                ) : feedback === "incorrect" ? (
                  <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl text-center">
                    <h4 className="text-red-900 font-bold">❌ Not quite yet!</h4>
                    <p className="text-[10px] text-red-600 mt-1 uppercase font-black">Find {quizTarget?.name} on the map.</p>
                  </div>
                ) : null}

                <button
                  onClick={resetExplorer}
                  className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs"
                >
                  Back to Explorer Mode
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => setDiscovered([])}
            className="flex items-center justify-center gap-2 text-slate-400 font-bold hover:text-slate-600 transition-colors py-2 text-xs"
          >
            <RefreshCcw size={14} /> Clear Discoveries
          </button>
        </div>
      </main>

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <span className="p-2 bg-blue-100 rounded-lg"><BookOpen className="text-blue-600" size={20} /></span>
          Learning Benefits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm italic">Correctly identifies all <strong>16 administrative regions</strong> of Ghana.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-blue-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm italic">Connects each region to its <strong>Capital City</strong>.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-orange-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm italic">Builds awareness of <strong>Ghanaian culture</strong> and history.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-purple-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm italic">Enhances <strong>spatial recognition</strong> through map interaction.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
