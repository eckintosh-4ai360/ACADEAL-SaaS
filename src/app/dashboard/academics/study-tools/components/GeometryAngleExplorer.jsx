"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { 
  CheckCircle2, 
  XCircle, 
  Info, 
  RotateCcw, 
  Target, 
  Award, 
  PlayCircle, 
  Star, 
  Move,
  Play,
  BookOpen,
  ChevronLeft
} from "lucide-react";

export default function GeometryAngleExplorer() {
  const [hasStarted, setHasStarted] = useState(false);
  
  // Protractor State
  const [angle, setAngle] = useState(60);
  const [attempted, setAttempted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [selectedClassification, setSelectedClassification] = useState("");
  const [activeTab, setActiveTab] = useState("protractor");

  // Triangle State
  const [triangleVerts, setTriangleVerts] = useState([
    { x: 50, y: 150 },
    { x: 250, y: 150 },
    { x: 150, y: 50 }
  ]);
  const [draggingVertex, setDraggingVertex] = useState(null);
  const svgRef = useRef(null);

  const classificationOptions = ["Acute", "Right", "Obtuse", "Straight", "Reflex"];

  const getCorrectClassification = useCallback((a) => {
    if (a < 90) return "Acute";
    if (a === 90) return "Right";
    if (a > 90 && a < 180) return "Obtuse";
    if (a === 180) return "Straight";
    return "Reflex";
  }, []);

  const handleAngleChange = useCallback((e) => {
    setAngle(parseInt(e.target.value));
    setAttempted(false);
    setIsCorrect(null);
    setSelectedClassification("");
  }, []);

  const handleCheck = useCallback(() => {
    if (!selectedClassification) return;
    
    setAttempts(prev => prev + 1);
    setAttempted(true);
    
    const correct = getCorrectClassification(angle);
    if (selectedClassification === correct) {
      setIsCorrect(true);
      setScore(prev => prev + 1);
    } else {
      setIsCorrect(false);
    }
  }, [selectedClassification, angle, getCorrectClassification]);

  const generateRandomAngle = useCallback(() => {
    const randomAngle = Math.floor(Math.random() * 359) + 1;
    setAngle(randomAngle);
    setAttempted(false);
    setIsCorrect(null);
    setSelectedClassification("");
  }, []);

  // Calculate coordinates for the angle lines in SVG
  const centerX = 150;
  const centerY = 150;
  const radius = 100;
  
  const endX = useMemo(() => centerX + radius * Math.cos((angle - 90) * (Math.PI / 180)), [angle]);
  const endY = useMemo(() => centerY + radius * Math.sin((angle - 90) * (Math.PI / 180)), [angle]);

  const startXBase = centerX + radius * Math.cos((-90) * (Math.PI / 180));
  const startYBase = centerY + radius * Math.sin((-90) * (Math.PI / 180));

  const largeArcFlag = angle > 180 ? 1 : 0;
  const arcPath = `M ${startXBase} ${startYBase} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  const arcPathSector = `M ${centerX} ${centerY} L ${startXBase} ${startYBase} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

  // Calculate triangle angles and side lengths
  const calculateDistance = (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  
  const a = calculateDistance(triangleVerts[1], triangleVerts[2]);
  const b = calculateDistance(triangleVerts[0], triangleVerts[2]);
  const c = calculateDistance(triangleVerts[0], triangleVerts[1]);

  const calcAngle = useCallback((side1, side2, oppSide) => {
    if (side1 === 0 || side2 === 0) return 0;
    const cosVal = (Math.pow(side1, 2) + Math.pow(side2, 2) - Math.pow(oppSide, 2)) / (2 * side1 * side2);
    const clampedCos = Math.max(-1, Math.min(1, cosVal));
    return Math.round(Math.acos(clampedCos) * (180 / Math.PI));
  }, []);

  const rawAngleA = calcAngle(b, c, a);
  const rawAngleB = calcAngle(a, c, b);
  const rawAngleC = calcAngle(a, b, c);

  // Reconcile small rounding errors to sum exactly to 180° for educational clarity
  const diff = 180 - (rawAngleA + rawAngleB + rawAngleC);
  const angleA = rawAngleA;
  const angleB = rawAngleB;
  const angleC = rawAngleC + diff;
  const sumAngles = angleA + angleB + angleC;

  // Triangle Dragging Logic
  const handlePointerDown = (index) => (e) => {
    e.target.setPointerCapture(e.pointerId);
    setDraggingVertex(index);
  };

  const handlePointerMove = (e) => {
    if (draggingVertex !== null && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = Math.max(10, Math.min(290, e.clientX - rect.left));
      const y = Math.max(10, Math.min(190, e.clientY - rect.top));
      
      setTriangleVerts(prev => {
        const next = [...prev];
        next[draggingVertex] = { x, y };
        return next;
      });
    }
  };

  const handlePointerUp = (e) => {
    if (draggingVertex !== null) {
      e.target.releasePointerCapture(e.pointerId);
      setDraggingVertex(null);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER LANDING SCREEN
  // ---------------------------------------------------------------------------
  if (!hasStarted) {
    return (
      <div className="w-full max-w-4xl mx-auto rounded-[2rem] shadow-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 text-white font-sans border-4 border-indigo-400/30 flex flex-col items-center justify-center p-8 md:p-12 text-center min-h-[600px] relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <svg width="100%" height="100%">
            <circle cx="15%" cy="20%" r="60" fill="none" stroke="white" strokeWidth="4" />
            <path d="M 85% 20% L 95% 45% L 75% 45% Z" fill="none" stroke="white" strokeWidth="4" />
            <rect x="80%" y="70%" width="80" height="80" transform="rotate(25 80% 70%)" fill="none" stroke="white" strokeWidth="4" />
            <circle cx="10%" cy="80%" r="30" fill="white" />
          </svg>
        </div>
        
        <div className="z-10 bg-white/10 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] border border-white/20 shadow-2xl max-w-2xl w-full">
          <div className="text-8xl md:text-9xl mb-6 drop-shadow-2xl">📐</div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-300">
            Geometry Angle Explorer
          </h1>
          <p className="text-lg md:text-xl text-indigo-100 font-medium mb-8 max-w-lg mx-auto leading-relaxed">
            Drag the protractor, explore triangles, and test your knowledge of acute, right, obtuse, and reflex angles!
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 mb-10 text-xs md:text-sm font-bold">
            <div className="bg-indigo-950/60 px-4 py-2 rounded-full flex items-center gap-2 border border-indigo-500 shadow-inner">
              <Award className="text-yellow-400" size={18} /> JHS 1–3
            </div>
            <div className="bg-indigo-950/60 px-4 py-2 rounded-full flex items-center gap-2 border border-indigo-500 shadow-inner">
              <PlayCircle className="text-emerald-400" size={18} /> 18 Min
            </div>
            <div className="bg-indigo-950/60 px-4 py-2 rounded-full flex items-center gap-2 border border-indigo-500 shadow-inner">
              <Target className="text-pink-400" size={18} /> Numeracy
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => setHasStarted(true)} 
            className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white px-12 py-6 rounded-full text-2xl font-black shadow-lg transition-all w-full md:w-auto mx-auto flex items-center justify-center gap-3 mt-4"
          >
            ▶️ PLAY NOW
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER INTERACTIVE APP
  // ---------------------------------------------------------------------------
  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl shadow-2xl overflow-hidden bg-white text-slate-800 font-sans border-2 border-indigo-100 animate-in fade-in duration-500">
      {/* ── BACK BUTTON ── */}
      <div className="p-4 bg-slate-50 border-b border-indigo-100">
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
      </div>

      {/* HEADER */}
      <header className="bg-gradient-to-r from-indigo-800 to-purple-900 p-6 md:p-8 text-white text-center shadow-md relative">
        <div className="absolute top-4 right-4 bg-indigo-600/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border border-indigo-400">
          <Award size={14} className="text-yellow-300" />
          <span className="hidden sm:inline">Level:</span> JHS 1–3
        </div>
        <div className="absolute top-4 left-4 bg-purple-600/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border border-purple-400">
          <PlayCircle size={14} className="text-pink-300" />
          <span className="hidden sm:inline">Time:</span> 18 min
        </div>
        
        <div className="text-5xl md:text-6xl mb-3 drop-shadow-md">📐</div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
          Geometry Angle Explorer
        </h1>
        <p className="text-indigo-200 text-base md:text-lg font-medium max-w-2xl mx-auto">
          Master angle measurement and classification in a fun, interactive way!
        </p>
      </header>

      <div className="p-4 md:p-8 bg-slate-50">
        
        {/* HOW TO USE BOX */}
        <div className="mb-8 bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 md:p-6 shadow-sm">
          <h2 className="text-blue-800 font-black flex items-center gap-2 mb-2 text-xl">
            <Info className="text-blue-600" /> How to Use
          </h2>
          <p className="text-blue-900 leading-relaxed text-base md:text-lg font-medium">
            {activeTab === "protractor" 
              ? "Change the angle using the slider below the protractor. Look carefully at the shape! Select the correct angle type on the right and tap 'Check My Answer' to see how you did."
              : "Drag the colorful dots (vertices) to change the shape of the triangle. Watch how the three interior angles change but always magically add up to 180°!"}
          </p>
        </div>

        {/* TABS CONTROLS */}
        <div className="flex w-full mb-8 rounded-xl bg-slate-200 p-1.5 shadow-inner">
          <button 
            className={`flex-1 py-3 md:py-4 flex items-center justify-center gap-2 text-base md:text-lg font-bold rounded-lg transition-all duration-300 ${activeTab === "protractor" ? "bg-white text-indigo-800 shadow-md transform scale-[1.01]" : "text-slate-500 hover:bg-slate-300"}`}
            onClick={() => setActiveTab("protractor")}
          >
            <Target size={20} className={activeTab === "protractor" ? "text-indigo-600" : ""} />
            Protractor Mode
          </button>
          <button 
            className={`flex-1 py-3 md:py-4 flex items-center justify-center gap-2 text-base md:text-lg font-bold rounded-lg transition-all duration-300 ${activeTab === "triangle" ? "bg-white text-indigo-800 shadow-md transform scale-[1.01]" : "text-slate-500 hover:bg-slate-300"}`}
            onClick={() => setActiveTab("triangle")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={activeTab === "triangle" ? "text-indigo-600" : ""}>
              <path d="M12 2L2 22h20L12 2z"></path>
            </svg>
            Triangle Mode
          </button>
        </div>

        {/* MAIN INTERACTIVE WORKSPACE */}
        <div className="flex flex-col lg:flex-row gap-6 md:gap-8 min-h-[480px]">
          
          {/* ========================================================= */}
          {/* LEFT COLUMN: VISUALIZATION */}
          {/* ========================================================= */}
          <div className="flex-1 bg-white rounded-3xl shadow-inner border-2 border-slate-200 p-4 md:p-8 flex flex-col items-center justify-center overflow-hidden relative">
            
            {activeTab === "protractor" && (
              <div className="relative w-full max-w-sm flex flex-col items-center animate-in zoom-in-95 duration-300">
                <div className="text-4xl md:text-5xl font-black text-indigo-900 mb-6 bg-indigo-50 px-8 py-3 rounded-2xl shadow-sm border-2 border-indigo-100 tracking-tight">
                  {angle}°
                </div>
                
                <svg width="300" height="300" viewBox="0 0 300 300" className="drop-shadow-lg w-full h-auto max-w-[300px]">
                  <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="6 6"/>
                  <circle cx={centerX} cy={centerY} r={radius + 40} fill="none" stroke="#f1f5f9" strokeWidth="2" />
                  
                  <path d={arcPathSector} fill="rgba(99, 102, 241, 0.15)" stroke="none" className="transition-all duration-300 ease-out" />
                  <path d={arcPath} fill="none" stroke="#6366f1" strokeWidth="10" strokeLinecap="round" className="transition-all duration-300 ease-out" />
                  
                  <line x1={centerX} y1={centerY} x2={centerX} y2={centerY - radius - 25} stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
                  
                  <line 
                    x1={centerX} 
                    y1={centerY} 
                    x2={centerX + (radius + 25) * Math.cos((angle - 90) * (Math.PI / 180))} 
                    y2={centerY + (radius + 25) * Math.sin((angle - 90) * (Math.PI / 180))} 
                    stroke="#4f46e5" 
                    strokeWidth="6" 
                    strokeLinecap="round"
                    className="transition-all duration-300 ease-out shadow-lg"
                  />
                  
                  <circle cx={centerX} cy={centerY} r="10" fill="#312e81" className="shadow-lg" />
                  <circle cx={centerX} cy={centerY} r="4" fill="#ffffff" />
                </svg>

                <div className="w-full mt-10 bg-indigo-50 p-5 rounded-2xl border-2 border-indigo-100 shadow-sm relative">
                  <div className="flex justify-between text-sm md:text-base font-black text-indigo-800 mb-3 px-1">
                    <span>1°</span>
                    <span>180°</span>
                    <span>359°</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="359"
                    value={angle}
                    onChange={handleAngleChange}
                    className="w-full h-4 bg-indigo-200 rounded-full appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-300/50 transition-all border border-indigo-300"
                  />
                </div>
              </div>
            )}

            {activeTab === "triangle" && (
              <div className="relative w-full flex flex-col items-center h-full justify-between animate-in zoom-in-95 duration-300">
                
                {/* Scoreboard for Triangle Angles */}
                <div className="flex flex-wrap justify-center gap-3 w-full mb-6 relative z-10">
                  <div className="bg-red-50 text-red-700 w-24 py-2 rounded-xl font-bold border-2 border-red-200 flex flex-col items-center shadow-sm">
                    <span className="text-xs uppercase tracking-wider mb-0.5">Ang A</span>
                    <span className="text-xl">{angleA}°</span>
                  </div>
                  <div className="bg-green-50 text-green-700 w-24 py-2 rounded-xl font-bold border-2 border-green-200 flex flex-col items-center shadow-sm">
                    <span className="text-xs uppercase tracking-wider mb-0.5">Ang B</span>
                    <span className="text-xl">{angleB}°</span>
                  </div>
                  <div className="bg-blue-50 text-blue-700 w-24 py-2 rounded-xl font-bold border-2 border-blue-200 flex flex-col items-center shadow-sm">
                    <span className="text-xs uppercase tracking-wider mb-0.5">Ang C</span>
                    <span className="text-xl">{angleC}°</span>
                  </div>
                  <div className="bg-purple-100 text-purple-900 w-28 py-2 rounded-xl font-black border-2 border-purple-300 flex flex-col items-center shadow-md transform scale-105">
                    <span className="text-xs uppercase tracking-wider mb-0.5 opacity-80">Total</span>
                    <span className="text-2xl">{sumAngles}°</span>
                  </div>
                </div>
                
                {/* Triangle Drag Area */}
                <div className="bg-slate-50 border-dashed border-4 border-slate-200 rounded-2xl relative w-full h-[280px] flex items-center justify-center overflow-hidden shadow-inner">
                  <svg 
                    ref={svgRef}
                    width="300" 
                    height="200" 
                    viewBox="0 0 300 200" 
                    className="overflow-visible touch-none"
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  >
                    {/* Fill */}
                    <polygon 
                      points={`${triangleVerts[0].x},${triangleVerts[0].y} ${triangleVerts[1].x},${triangleVerts[1].y} ${triangleVerts[2].x},${triangleVerts[2].y}`} 
                      fill="rgba(139, 92, 246, 0.15)" 
                      stroke="#8b5cf6" 
                      strokeWidth="4" 
                      strokeLinejoin="round" 
                      className="transition-colors duration-300"
                    />
                    
                    {/* Interactive Vertices */}
                    <g 
                      onPointerDown={handlePointerDown(0)} 
                      className="cursor-pointer group hover:scale-110 transition-transform origin-center" 
                      style={{ transformOrigin: `${triangleVerts[0].x}px ${triangleVerts[0].y}px` }}
                    >
                      <circle cx={triangleVerts[0].x} cy={triangleVerts[0].y} r="16" fill="transparent" />
                      <circle cx={triangleVerts[0].x} cy={triangleVerts[0].y} r="10" fill="#ef4444" stroke="white" strokeWidth="3" className="shadow-lg group-hover:fill-red-400" />
                      <text x={triangleVerts[0].x - 22} y={triangleVerts[0].y - 15} fill="#ef4444" fontWeight="900" fontSize="18">A</text>
                    </g>
                    
                    <g 
                      onPointerDown={handlePointerDown(1)} 
                      className="cursor-pointer group hover:scale-110 transition-transform origin-center"
                      style={{ transformOrigin: `${triangleVerts[1].x}px ${triangleVerts[1].y}px` }}
                    >
                      <circle cx={triangleVerts[1].x} cy={triangleVerts[1].y} r="16" fill="transparent" />
                      <circle cx={triangleVerts[1].x} cy={triangleVerts[1].y} r="10" fill="#22c55e" stroke="white" strokeWidth="3" className="shadow-lg group-hover:fill-green-400" />
                      <text x={triangleVerts[1].x + 15} y={triangleVerts[1].y + 20} fill="#22c55e" fontWeight="900" fontSize="18">B</text>
                    </g>
                    
                    <g 
                      onPointerDown={handlePointerDown(2)} 
                      className="cursor-pointer group hover:scale-110 transition-transform origin-center"
                      style={{ transformOrigin: `${triangleVerts[2].x}px ${triangleVerts[2].y}px` }}
                    >
                      <circle cx={triangleVerts[2].x} cy={triangleVerts[2].y} r="16" fill="transparent" />
                      <circle cx={triangleVerts[2].x} cy={triangleVerts[2].y} r="10" fill="#3b82f6" stroke="white" strokeWidth="3" className="shadow-lg group-hover:fill-blue-400" />
                      <text x={triangleVerts[2].x + 15} y={triangleVerts[2].y - 15} fill="#3b82f6" fontWeight="900" fontSize="18">C</text>
                    </g>
                  </svg>
                  
                  <div className="absolute bottom-3 right-3 text-xs md:text-sm text-slate-600 font-bold bg-white/90 px-3 py-1.5 rounded-lg border-2 border-slate-200 shadow-sm flex items-center gap-2 backdrop-blur-sm pointer-events-none">
                    <Move size={16} className="text-indigo-500" /> Drag the colored dots!
                  </div>
                </div>
                
                {/* Quick Shape Presets */}
                <div className="w-full mt-6 grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => setTriangleVerts([{x:150,y:170}, {x:250,y:50}, {x:50,y:50}])}
                    className="py-3 text-sm md:text-base font-bold bg-white border-2 border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-600 transition-all shadow-sm active:scale-95"
                  >
                    Equilateral
                  </button>
                  <button 
                    onClick={() => setTriangleVerts([{x:50,y:170}, {x:250,y:170}, {x:50,y:50}])}
                    className="py-3 text-sm md:text-base font-bold bg-white border-2 border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-600 transition-all shadow-sm active:scale-95"
                  >
                    Right
                  </button>
                  <button 
                    onClick={() => setTriangleVerts([{x:40,y:170}, {x:260,y:170}, {x:200,y:50}])}
                    className="py-3 text-sm md:text-base font-bold bg-white border-2 border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-600 transition-all shadow-sm active:scale-95"
                  >
                    Obtuse
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: INTERACTIVE CONTROLS & INFO */}
          {/* ========================================================= */}
          {activeTab === "protractor" && (
            <div className="flex-1 flex flex-col gap-6 w-full animate-in slide-in-from-right-8 duration-500">
              
              {/* Controls Pad */}
              <div className="bg-white rounded-3xl shadow-md border-2 border-slate-200 p-6 md:p-8">
                <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-5 flex items-center gap-3">
                  <Target className="text-pink-500 bg-pink-100 p-1.5 rounded-lg w-9 h-9" /> 
                  Classify It!
                </h3>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {classificationOptions.map(option => (
                    <button
                      key={option}
                      onClick={() => setSelectedClassification(option)}
                      className={`
                        min-h-[3rem] py-3 px-2 rounded-xl text-base md:text-lg font-bold transition-all duration-200 border-2 shadow-sm
                        ${selectedClassification === option 
                          ? "bg-indigo-600 border-indigo-700 text-white transform scale-105 shadow-indigo-200 shadow-lg z-10" 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"}
                      `}
                    >
                      {option}
                    </button>
                  ))}
                  
                  <button
                    onClick={generateRandomAngle}
                    className="col-span-2 min-h-[3.5rem] mt-2 py-3 px-4 rounded-xl text-base md:text-lg font-bold transition-all duration-200 border-2 shadow-sm bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <RotateCcw size={22} className="stroke-[3]" /> Generate Random Angle
                  </button>
                </div>

                <div className="flex gap-4 items-center">
                  <button
                    onClick={handleCheck}
                    disabled={!selectedClassification || (attempted && isCorrect)}
                    className={`
                      flex-1 min-h-[4rem] py-4 rounded-xl text-lg md:text-2xl font-black text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-3
                      ${!selectedClassification 
                        ? 'bg-slate-300 cursor-not-allowed text-slate-400 border-slate-200 border-2 shadow-none' 
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-200 border-b-4 border-emerald-700 active:translate-y-1 active:border-b-0'}
                    `}
                  >
                    <CheckCircle2 size={28} className="stroke-[3]" /> Check Answer
                  </button>
                </div>
              </div>

              {/* Feedback Pad */}
              <div className="bg-white rounded-3xl shadow-md border-2 border-slate-200 p-6 md:p-8 flex-1 flex flex-col justify-center">
                {attempted ? (
                  <div className={`p-6 rounded-2xl border-4 flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-4 transition-all duration-500 transform ${isCorrect ? 'bg-emerald-50 border-emerald-400 text-emerald-900 scale-100' : 'bg-rose-50 border-rose-400 text-rose-900 scale-100 animate-shake'}`}>
                    <div className="shrink-0 bg-white rounded-full p-2 shadow-sm border-2 border-current">
                      {isCorrect ? <CheckCircle2 className="text-emerald-500 w-10 h-10 stroke-[3]" /> : <XCircle className="text-rose-500 w-10 h-10 stroke-[3]" />}
                    </div>
                    <div>
                      <h4 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">
                        {isCorrect ? "Brilliant!" : "Not Quite!"}
                      </h4>
                      <p className="text-base md:text-lg font-semibold opacity-90 leading-snug">
                        {isCorrect 
                          ? `Yes! ${angle}° perfectly matches an ${selectedClassification.toLowerCase()} angle.`
                          : `Hint: Think about where ${angle}° sits compared to 90° (Right) and 180° (Straight).`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 border-4 border-dashed border-slate-100 rounded-2xl p-6 bg-slate-50/50">
                    <Star size={64} className="text-slate-200 mb-4" fill="currentColor" />
                    <p className="text-lg md:text-xl font-bold text-center max-w-[200px]">Select an angle and check your answer!</p>
                  </div>
                )}
                
                {/* Score counters */}
                <div className="mt-8 pt-6 flex items-center justify-between border-t-2 border-slate-100 w-full px-2">
                  <div className="text-slate-600 font-black text-lg flex items-center gap-3">
                    Attempts
                    <span className="text-2xl text-indigo-700 bg-indigo-100 px-4 py-1.5 rounded-xl shadow-inner min-w-[3rem] text-center border border-indigo-200">
                      {attempts}
                    </span>
                  </div>
                  <div className="text-slate-600 font-black text-lg flex items-center gap-3">
                    Score
                    <span className="text-2xl text-emerald-700 bg-emerald-100 px-4 py-1.5 rounded-xl shadow-inner min-w-[3rem] text-center border border-emerald-200">
                      {score}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "triangle" && (
            <div className="flex-1 flex flex-col gap-6 w-full animate-in slide-in-from-right-8 duration-500">
              <div className="bg-white rounded-3xl shadow-md border-2 border-slate-200 p-6 md:p-8 h-full flex flex-col">
                <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
                  <BookOpen className="text-indigo-500 bg-indigo-100 p-1.5 rounded-lg w-9 h-9 shadow-sm" /> 
                  Triangle Rules
                </h3>
                
                <div className="text-slate-700 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 md:p-8 rounded-2xl border-2 border-indigo-100 flex-1 flex flex-col justify-center shadow-inner">
                  <ul className="space-y-6">
                    <li className="flex items-start gap-4">
                      <span className="bg-indigo-600 text-white rounded-xl w-10 h-10 flex items-center justify-center shrink-0 mt-0.5 font-black text-lg shadow-md border-2 border-indigo-300">1</span>
                      <span className="text-lg leading-snug"><strong>The Magic Rule:</strong> No matter how you stretch or move a triangle, its 3 interior angles will ALWAYS add up to exactly 180°.</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="bg-pink-500 text-white rounded-xl w-10 h-10 flex items-center justify-center shrink-0 mt-0.5 font-black text-lg shadow-md border-2 border-pink-300">2</span>
                      <span className="text-lg leading-snug"><strong>Right Triangle:</strong> Has exactly one 90° angle. The other two must add up to 90°.</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="bg-teal-500 text-white rounded-xl w-10 h-10 flex items-center justify-center shrink-0 mt-0.5 font-black text-lg shadow-md border-2 border-teal-300">3</span>
                      <span className="text-lg leading-snug"><strong>Equilateral:</strong> All sides and angles are equal! Meaning all three angles are strictly 60°.</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="bg-amber-500 text-white rounded-xl w-10 h-10 flex items-center justify-center shrink-0 mt-0.5 font-black text-lg shadow-md border-2 border-amber-300">4</span>
                      <span className="text-lg leading-snug"><strong>Obtuse Triangle:</strong> Has exactly one angle that is greater than 90°.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER: EDUCATIONAL VALUES */}
      <footer className="bg-slate-900 p-6 md:p-8 text-slate-200">
        <h4 className="text-emerald-400 font-black mb-4 flex items-center gap-2 uppercase tracking-wider text-sm md:text-base">
          <Award size={18} className="text-emerald-500" /> Key Learning Benefits
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm md:text-base font-medium opacity-90">
          <li className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] mt-1.5 shrink-0" />
            Connects complex vocabulary (acute, obtuse) strictly to simple visual bounds.
          </li>
          <li className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] mt-1.5 shrink-0" />
            Interactive sliders build strong spatial estimation before formal measurement.
          </li>
          <li className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] mt-1.5 shrink-0" />
            Immediate success/failure feedback loop fixes misconceptions safely in real time.
          </li>
          <li className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] mt-1.5 shrink-0" />
            Hands-on proof of the 180° triangle interior axiom directly through manipulation.
          </li>
        </ul>
      </footer>
    </div>
  );
}
