import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { Clock, CheckCircle2, RefreshCcw, HelpCircle, Award, ArrowRight, MousePointer2, ChevronLeft } from "lucide-react";

export default function TellingtheTimeClock() {
  // State for the current time set by the user
  const [hour, setHour] = useState(10);
  const [minute, setMinute] = useState(0);
  
  // State for the puzzle/target time
  const [targetTime, setTargetTime] = useState({ hour: 2, minute: 30 });
  const { hour: targetHour, minute: targetMinute } = targetTime;
  
  // Interaction and Feedback state
  const [isDragging, setIsDragging] = useState(null); // 'hour' or 'minute'
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);

  const svgRef = useRef(null);

  // Generate a new random target time (Hours and Half-Hours only for Primary 1-3)
  const generateNewTask = useCallback(() => {
    setTargetTime(prev => {
      let newHour, newMinute;
      // Ensure we don't get the same time twice in a row
      do {
        newHour = Math.floor(Math.random() * 12) || 12;
        newMinute = Math.random() > 0.5 ? 0 : 30;
      } while (newHour === prev.hour && newMinute === prev.minute);
      
      return { hour: newHour, minute: newMinute };
    });
    setFeedback(null);
  }, []);

  // Initial task generation
  useEffect(() => {
    generateNewTask();
  }, [generateNewTask]);

  // Calculate angles for hands
  // Minute hand: 360 degrees = 60 minutes (6 deg/min)
  // Hour hand: 360 degrees = 12 hours (30 deg/hour) + movement based on minutes
  const minuteAngle = useMemo(() => minute * 6, [minute]);
  const hourAngle = useMemo(() => (hour % 12) * 30 + (minute / 60) * 30, [hour, minute]);

  // Handle Dragging Logic
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate angle from center to mouse position
    const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    let angleDeg = (angleRad * 180) / Math.PI + 90;
    if (angleDeg < 0) angleDeg += 360;

    if (isDragging === "minute") {
      // Snapping to 5-minute intervals for better UX, or specific 0/30 for this level
      let newMin = Math.round(angleDeg / 6) % 60;
      // For Primary 1-3, we might want to snap heavily to 0 or 30
      if (Math.abs(newMin - 0) < 7 || Math.abs(newMin - 60) < 7) newMin = 0;
      else if (Math.abs(newMin - 30) < 7) newMin = 30;
      setMinute(newMin);
    } else if (isDragging === "hour") {
      // Hour hand moves between 1-12
      let newHour = Math.round(angleDeg / 30) % 12;
      if (newHour === 0) newHour = 12;
      setHour(newHour);
    }
  }, [isDragging]);

  const stopDragging = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", stopDragging);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDragging);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDragging);
    };
  }, [isDragging, handleMouseMove, stopDragging]);

  const checkAnswer = () => {
    setAttempts(prev => prev + 1);
    // Note: Comparing hour % 12 because 12 and 0 are the same position 
    const isCorrect = hour === targetHour && minute === targetMinute;
    
    if (isCorrect) {
      setFeedback("correct");
      setScore(prev => prev + 1);
    } else {
      setFeedback("incorrect");
    }
  };

  const formatTimeText = (h, m) => {
    if (m === 0) return `${h} O'clock`;
    if (m === 30) return `Half past ${h}`;
    return `${h}:${m < 10 ? '0' + m : m}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
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
          <div className="bg-orange-100 p-4 rounded-2xl">
            <span className="text-4xl">⏰</span>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Telling the Time</h1>
            <p className="text-slate-500 font-medium">Mastering Hours and Half-Hours</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold border border-blue-200 shadow-sm">
            Primary 1–3
          </span>
          <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-bold border border-emerald-200 shadow-sm flex items-center gap-1">
            <Clock size={16} /> 10 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Interactive Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* 2. How to Use Box */}
          <section className="bg-blue-50 border-l-4 border-blue-400 p-5 rounded-r-2xl shadow-sm">
            <div className="flex gap-3">
              <HelpCircle className="text-blue-500 shrink-0" />
              <div>
                <h3 className="font-bold text-blue-900 mb-1">How to Play:</h3>
                <p className="text-blue-800 text-sm leading-relaxed">
                  Look at the <strong>target time</strong> below. Use your mouse or finger to drag the big blue hand and short red hand to match it!
                </p>
              </div>
            </div>
          </section>

          {/* 4. Live Visual Output Area (Clock) */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col items-center relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 opacity-50" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-50 rounded-full -ml-12 -mb-12 opacity-50" />

            <div className="mb-6 flex flex-col items-center">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Analogue Clock</span>
              <div className="h-1 w-12 bg-slate-200 rounded-full" />
            </div>

            {/* SVG Clock */}
            <div className="relative group cursor-crosshair">
              <svg
                ref={svgRef}
                viewBox="0 0 400 400"
                className="w-full max-w-[320px] md:max-w-[380px] drop-shadow-2xl select-none"
                onMouseDown={(e) => {
                  // Simple hit detection for hands
                  // In a real app we'd use better geometry, but here we toggle based on click location
                  // For P1-3, we can also use buttons if dragging is tricky, but let's implement basic drag regions
                }}
              >
                {/* Clock Face Shadow */}
                <circle cx="205" cy="205" r="180" fill="rgba(0,0,0,0.05)" />
                
                {/* Outer Ring */}
                <circle cx="200" cy="200" r="180" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="8" />
                <circle cx="200" cy="200" r="165" fill="white" />

                {/* Hour Numbers */}
                {[...Array(12)].map((_, i) => {
                  const angle = (i + 1) * 30 * (Math.PI / 180) - Math.PI / 2;
                  const x = 200 + 135 * Math.cos(angle);
                  const y = 200 + 135 * Math.sin(angle);
                  return (
                    <text
                      key={i}
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[26px] font-black fill-slate-700 select-none"
                    >
                      {i + 1}
                    </text>
                  );
                })}

                {/* Minute Notches */}
                {[...Array(60)].map((_, i) => {
                  if (i % 5 === 0) return null;
                  const angle = i * 6 * (Math.PI / 180);
                  const x1 = 200 + 155 * Math.cos(angle);
                  const y1 = 200 + 155 * Math.sin(angle);
                  const x2 = 200 + 160 * Math.cos(angle);
                  const y2 = 200 + 160 * Math.sin(angle);
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth="2" />;
                })}

                {/* Hour Hand (Red) - Clickable */}
                <g 
                  transform={`rotate(${hourAngle}, 200, 200)`} 
                  className="cursor-pointer group/hand"
                  onMouseDown={(e) => { e.stopPropagation(); setIsDragging("hour"); }}
                >
                  <rect x="194" y="100" width="12" height="110" rx="6" fill="#ef4444" className="filter drop-shadow-md" />
                  <circle cx="200" cy="100" r="10" fill="transparent" className="group-hover/hand:fill-red-100 transition-colors" />
                </g>

                {/* Minute Hand (Blue) - Clickable */}
                <g 
                  transform={`rotate(${minuteAngle}, 200, 200)`} 
                  className="cursor-pointer group/hand"
                  onMouseDown={(e) => { e.stopPropagation(); setIsDragging("minute"); }}
                >
                  <rect x="196" y="50" width="8" height="160" rx="4" fill="#3b82f6" className="filter drop-shadow-md" />
                  <circle cx="200" cy="50" r="12" fill="transparent" className="group-hover/hand:fill-blue-100 transition-colors" />
                </g>

                {/* Center Pin */}
                <circle cx="200" cy="200" r="10" fill="#1e293b" />
                <circle cx="200" cy="200" r="4" fill="#94a3b8" />
              </svg>

              {/* Interaction Hint Overlay */}
              {!isDragging && attempts === 0 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-bounce">
                  <div className="bg-slate-900/10 p-2 rounded-full flex flex-col items-center">
                    <MousePointer2 className="text-white fill-slate-800" size={32} />
                    <span className="text-[10px] font-bold text-slate-800 uppercase mt-1">Drag Hands</span>
                  </div>
                </div>
              )}
            </div>

            {/* Sync Area - Digital Display */}
            <div className="mt-8 bg-slate-900 px-6 py-4 rounded-3xl border-4 border-slate-800 shadow-inner">
               <div className="flex items-center gap-3">
                  <span className="text-4xl md:text-5xl font-mono text-emerald-400 font-bold tracking-tighter">
                    {hour < 10 ? '0' + hour : hour}:{minute < 10 ? '0' + minute : minute}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-emerald-400/50 font-bold uppercase">Digital Time</span>
                    <span className="text-xs text-emerald-100/80 font-medium">{formatTimeText(hour, minute)}</span>
                  </div>
               </div>
            </div>
          </div>

          {/* 3. Interactive Control Zone (Secondary Controls for Accessibility) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <RefreshCcw size={14} /> Quick Adjust
            </h3>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => setMinute(0)}
                className={`px-6 py-3 rounded-2xl font-bold transition-all shadow-sm ${minute === 0 ? 'bg-blue-600 text-white translate-y-[-2px]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                :00 (O'clock)
              </button>
              <button 
                onClick={() => setMinute(30)}
                className={`px-6 py-3 rounded-2xl font-bold transition-all shadow-sm ${minute === 30 ? 'bg-blue-600 text-white translate-y-[-2px]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                :30 (Half past)
              </button>
              <div className="w-px h-10 bg-slate-200 mx-2 hidden md:block" />
              <button 
                onClick={() => setHour(prev => (prev === 12 ? 1 : prev + 1))}
                className="px-6 py-3 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center gap-2"
              >
                Add 1 Hour
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Game Logic and Feedback */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Target Challenge Card */}
          <div className="bg-orange-500 rounded-[2rem] p-6 text-white shadow-lg shadow-orange-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Award size={80} />
            </div>
            <h3 className="text-orange-100 font-bold text-sm uppercase mb-2">Current Mission</h3>
            <p className="text-2xl font-black mb-4 leading-tight">Can you set the clock to...</p>
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30 text-center">
              <span className="text-4xl font-black tracking-widest block">
                {targetHour}:{targetMinute === 0 ? '00' : '30'}
              </span>
              <span className="text-sm font-bold opacity-90 mt-1 block">
                {formatTimeText(targetHour, targetMinute)}
              </span>
            </div>
          </div>

          {/* 5. Score / Feedback Panel */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex-grow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold text-sm uppercase">Score:</span>
                <span className="bg-emerald-100 text-emerald-700 font-black px-3 py-1 rounded-lg">{score}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                <span>Attempts:</span>
                <span>{attempts}</span>
              </div>
            </div>

            {!feedback ? (
              <button
                onClick={checkAnswer}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 group"
              >
                Check My Answer
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {feedback === "correct" ? (
                  <div className="bg-emerald-50 border-2 border-emerald-500 p-6 rounded-3xl text-center">
                    <div className="inline-block bg-emerald-500 text-white p-2 rounded-full mb-3">
                      <CheckCircle2 size={32} />
                    </div>
                    <h4 className="text-emerald-900 font-black text-xl mb-1">✅ Excellent Job!</h4>
                    <p className="text-emerald-700 text-sm mb-4">You got it perfectly right! Ready for the next one?</p>
                    <button
                      onClick={generateNewTask}
                      className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all"
                    >
                      Next Challenge
                    </button>
                  </div>
                ) : (
                  <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl text-center">
                    <h4 className="text-red-900 font-black text-xl mb-1">❌ Not quite yet!</h4>
                    <p className="text-red-700 text-sm mb-4">
                      {minute !== targetMinute ? "Hint: Check the long blue hand. It should be at the " + (targetMinute === 30 ? "6 (half past)." : "12 (o'clock).") : "Hint: Move the short red hand to point near the number " + targetHour + "."}
                    </p>
                    <button
                      onClick={() => setFeedback(null)}
                      className="w-full bg-slate-200 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-300 transition-all"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button 
            onClick={generateNewTask}
            className="flex items-center justify-center gap-2 text-slate-400 font-bold hover:text-slate-600 transition-colors py-2"
          >
            <RefreshCcw size={16} /> Get New Time
          </button>
        </div>
      </main>

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <span className="p-2 bg-blue-100 rounded-lg"><Award className="text-blue-600" size={20} /></span>
          Learning Benefits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-blue-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Understands <strong>analogue</strong> vs <strong>digital</strong> relationship.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Recognizes <strong>half-past</strong> and <strong>o'clock</strong> positions.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-orange-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Develops <strong>fine motor skills</strong> through hand movement.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-purple-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Reinforces <strong>skip counting</strong> by 5s and 30s.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
