import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Thermometer, 
  RotateCcw, 
  Target, 
  Award, 
  BookOpen, 
  Waves,
  Zap,
  Flame,
  Snowflake,
  Info,
  ChevronLeft
} from "lucide-react";

export default function StatesofMatterVisualizer() {
  const [temperature, setTemperature] = useState(20); // Celsius
  const [quizMode, setQuizMode] = useState(false);
  const [quizTarget, setQuizTarget] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);

  // Particle positions - static for initial render, updated by animation
  const [particles, setParticles] = useState(() => 
    Array.from({ length: 48 }, (_, i) => ({
      id: i,
      x: Math.random() * 340 + 30,
      y: Math.random() * 340 + 30,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2
    }))
  );

  const stateInfo = useMemo(() => {
    if (temperature <= 0) {
      return {
        label: "Solid (Ice)",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        particleColor: "#60A5FA",
        speed: 0.2,
        jitter: 1.5,
        description: "Particles are tightly packed and only vibrate in place."
      };
    } else if (temperature < 100) {
      return {
        label: "Liquid (Water)",
        color: "text-sky-600",
        bgColor: "bg-sky-50",
        borderColor: "border-sky-200",
        particleColor: "#38BDF8",
        speed: 1.5,
        jitter: 3,
        description: "Particles are close together but can slide past each other."
      };
    } else {
      return {
        label: "Gas (Steam)",
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        particleColor: "#FB923C",
        speed: 6,
        jitter: 10,
        description: "Particles move quickly and are far apart from each other."
      };
    }
  }, [temperature]);

  // Animation loop
  useEffect(() => {
    let animationFrame;
    const updateParticles = () => {
      setParticles(prev => prev.map(p => {
        let { x, y, vx, vy } = p;
        
        if (temperature <= 0) {
          // Vibrating in a grid-like structure for solid
          const row = Math.floor(p.id / 7);
          const col = p.id % 7;
          const targetX = 80 + col * 40;
          const targetY = 80 + row * 40;
          x = targetX + (Math.random() - 0.5) * stateInfo.jitter;
          y = targetY + (Math.random() - 0.5) * stateInfo.jitter;
        } else if (temperature < 100) {
          // Flowing at the bottom for liquid
          x += vx * stateInfo.speed;
          y += vy * stateInfo.speed;
          
          // Boundaries with "gravity" feel for liquid
          if (x < 30 || x > 370) vx *= -1;
          if (y < 250 || y > 370) vy *= -1;
          
          // Constrain within liquid area
          x = Math.max(30, Math.min(370, x));
          y = Math.max(250, Math.min(370, y));
        } else {
          // Rapid movement for gas
          x += vx * stateInfo.speed;
          y += vy * stateInfo.speed;
          
          // Bounce off all walls
          if (x < 30 || x > 370) vx *= -1;
          if (y < 30 || y > 370) vy *= -1;
          
          x = Math.max(30, Math.min(370, x));
          y = Math.max(30, Math.min(370, y));
        }

        return { ...p, x, y, vx, vy };
      }));
      animationFrame = requestAnimationFrame(updateParticles);
    };

    animationFrame = requestAnimationFrame(updateParticles);
    return () => cancelAnimationFrame(animationFrame);
  }, [temperature, stateInfo.speed, stateInfo.jitter]);

  const generateQuiz = useCallback(() => {
    const states = ["Solid", "Liquid", "Gas"];
    const target = states[Math.floor(Math.random() * states.length)];
    setQuizTarget(target);
    setFeedback(null);
  }, []);

  const toggleQuiz = () => {
    if (!quizMode) {
      generateQuiz();
    }
    setQuizMode(!quizMode);
    setFeedback(null);
  };

  const checkAnswer = () => {
    setAttempts(prev => prev + 1);
    const currentState = temperature <= 0 ? "Solid" : temperature < 100 ? "Liquid" : "Gas";
    
    if (currentState === quizTarget) {
      setFeedback("correct");
      setScore(prev => prev + 10);
    } else {
      setFeedback("incorrect");
    }
  };

  const reset = () => {
    setTemperature(20);
    setFeedback(null);
    setScore(0);
    setAttempts(0);
    if (quizMode) generateQuiz();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-slate-50/50 min-h-screen font-sans text-slate-800">
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
            <Zap className="text-blue-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">States of Matter Visualizer</h1>
            <p className="text-slate-500 font-medium">Explore how temperature changes particles</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm">
            Primary 4–6
          </span>
          <span className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full border border-orange-200 shadow-sm flex items-center gap-1">
            <Thermometer size={16} /> 15 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* 2. "How to Use" box */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <BookOpen className="text-blue-500" size={18} /> How to Use
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Slide the temperature bar to heat up or cool down the substance. Watch how the particles move in each state!
            </p>
          </section>

          {/* 3. Interactive Control Zone */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-8">
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Temperature</span>
                  <span className={`text-xl font-black ${stateInfo.color}`}>
                    {temperature}°C
                  </span>
               </div>
               <div className="relative pt-6 pb-2">
                 <input 
                  type="range" min="-50" max="150" step="1" value={temperature} 
                  onChange={(e) => setTemperature(parseInt(e.target.value))}
                  className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 relative z-10"
                 />
                 <div className="absolute top-0 left-0 w-full flex justify-between px-1">
                    <Snowflake className="text-blue-300" size={16} />
                    <Waves className="text-sky-300" size={16} />
                    <Flame className="text-orange-300" size={16} />
                 </div>
               </div>
               <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Freezing (-50°C)</span>
                  <span>Boiling (150°C)</span>
               </div>
            </div>

            <div className={`p-4 rounded-2xl border-2 transition-all ${stateInfo.bgColor} ${stateInfo.borderColor}`}>
               <h4 className={`font-black uppercase tracking-widest text-xs mb-1 ${stateInfo.color}`}>Current State:</h4>
               <p className="text-lg font-bold text-slate-800">{stateInfo.label}</p>
               <p className="text-sm text-slate-600 mt-2 leading-relaxed">{stateInfo.description}</p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={reset}
                className="flex-1 py-3 rounded-xl border-2 border-slate-100 text-slate-400 hover:bg-slate-50 transition-all font-bold text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} /> Reset
              </button>
              <button 
                onClick={toggleQuiz}
                className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${quizMode ? 'bg-orange-100 text-orange-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {quizMode ? <RotateCcw size={16} /> : <Target size={16} />}
                {quizMode ? 'Exit Quiz' : 'Take Quiz'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex gap-4 items-start">
             <div className="bg-blue-50 p-2 rounded-lg">
                <Info size={20} className="text-blue-500" />
             </div>
             <p className="text-xs text-slate-500 leading-relaxed italic">
               <strong>Did you know?</strong> In a gas, particles can be hundreds of times further apart than in a solid or liquid!
             </p>
          </div>
        </div>

        {/* Right Column: Particle Container */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* 4. Live Visual Output Area */}
          <div className="bg-white rounded-[3rem] shadow-xl border-8 border-slate-100 p-8 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
            <svg width="400" height="400" className="bg-slate-50 rounded-2xl border border-slate-200">
              {/* Particle Container Walls */}
              <rect x="25" y="25" width="350" height="350" fill="none" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="4 4" />
              
              {/* Particles */}
              {particles.map(p => (
                <circle 
                  key={p.id} 
                  cx={p.x} 
                  cy={p.y} 
                  r={temperature > 100 ? 5 : 8} 
                  fill={stateInfo.particleColor} 
                  className="transition-colors duration-500"
                  opacity={temperature > 100 ? 0.7 : 0.9}
                />
              ))}

              {/* Temperature Overlay Effect */}
              <rect 
                x="0" y="0" width="400" height="400" 
                fill={temperature < 0 ? "#3B82F6" : temperature > 100 ? "#EF4444" : "transparent"} 
                opacity={temperature < 0 ? 0.05 : temperature > 100 ? 0.05 : 0}
                pointerEvents="none"
              />
            </svg>

            <div className="absolute top-12 left-12 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200 shadow-sm">
               <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
               <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Live Particle Simulation</span>
            </div>

            {/* State Icon Indicator */}
            <div className="absolute bottom-12 right-12 bg-white p-4 rounded-2xl border border-slate-200 shadow-lg text-center min-w-[100px]">
               <div className="text-4xl mb-1">
                 {temperature <= 0 ? "🧊" : temperature < 100 ? "💧" : "💨"}
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stateInfo.label.split(' ')[0]}</span>
            </div>
          </div>

          {/* 5. Feedback Panel */}
          {quizMode && (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-orange-200 animate-in slide-in-from-bottom-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 font-bold">
                 <div className="text-center md:text-left">
                    <p className="text-xs text-orange-400 uppercase tracking-widest mb-1">Matter Challenge</p>
                    <p className="text-2xl text-slate-800">
                      Adjust temperature to get a <span className="text-blue-600 underline underline-offset-4 decoration-blue-200">{quizTarget}</span> state!
                    </p>
                 </div>

                 <div className="flex items-center gap-4">
                    {feedback === "correct" ? (
                      <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100 animate-in zoom-in">
                        <Award size={28} />
                        <div>
                          <p className="text-sm">Excellent! ✅</p>
                          <button onClick={generateQuiz} className="text-xs underline">Next Challenge</button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={checkAnswer}
                        className="bg-orange-500 text-white px-8 py-4 rounded-2xl hover:bg-orange-600 shadow-lg shadow-orange-100 transition-all font-black text-lg active:scale-95"
                      >
                        Check My Answer
                      </button>
                    )}
                 </div>
              </div>

              {feedback === "incorrect" && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl text-center text-sm animate-in fade-in">
                  ❌ Not quite! This is currently {stateInfo.label}. Try a different temperature!
                </div>
              )}

              <div className="mt-6 flex justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest border-t border-slate-50 pt-4">
                 <span>Score: {score}</span>
                 <span>Attempts: {attempts}</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-blue-600" size={24} />
          Key Learning Outcomes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-blue-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Understand that <strong>temperature</strong> determines the physical state of matter.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-sky-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Visualize <strong>kinetic energy</strong> as the speed of moving particles.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-orange-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Observe <strong>structural differences</strong> in particle arrangement (fixed vs free).</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-red-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Recognize <strong>phase changes</strong> like melting, freezing, and evaporation.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
