import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Music, Info, HelpCircle, CheckCircle2, XCircle, Play, Volume2, ChevronLeft } from "lucide-react";

export default function GhanaianInstrumentsIdentifier() {
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [quizTarget, setQuizTarget] = useState(null);
  const [feedback, setFeedback] = useState({ show: false, correct: false });
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);

  const instruments = useMemo(() => [
    {
      id: "fontomfrom",
      name: "Fontomfrom",
      type: "Percussion (Drum)",
      origin: "Akan (Ashanti)",
      description: "A majestic set of talking drums used in royal courts to communicate messages and honor chiefs.",
      features: ["Large size", "Deep pitch", "Carved wood", "Animal skin head"],
      fact: "They were traditionally used to 'speak' and signal the arrival of a King.",
      color: "#D97706", // Orange-ish wood
      accent: "#B45309",
      soundType: "low-thump"
    },
    {
      id: "kpanlogo",
      name: "Kpanlogo",
      type: "Percussion (Drum)",
      origin: "Ga (Greater Accra)",
      description: "A tapered hand drum used for recreational music and the famous Kpanlogo dance.",
      features: ["Peg-tuned", "Played with hands", "Tapered base", "High-energy rhythm"],
      fact: "It emerged in the 1960s as a symbol of youth culture and independence in Ghana.",
      color: "#059669", // Green
      accent: "#047857",
      soundType: "mid-slap"
    },
    {
      id: "atenteben",
      name: "Atenteben",
      type: "Woodwind (Flute)",
      origin: "Akan / Kwahu",
      description: "A vertical bamboo flute capable of playing both traditional and modern classical music.",
      features: ["Bamboo body", "Vertical blowing", "6-7 finger holes", "Clear, melodic tone"],
      fact: "Originally used in funeral dirges, it is now played in many contemporary orchestras.",
      color: "#2563EB", // Blue
      accent: "#1D4ED8",
      soundType: "high-whistle"
    }
  ], []);

  // Audio simulation (Web Audio API)
  const playSound = useCallback((type) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === "low-thump") {
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(60, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      } else if (type === "mid-slap") {
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.6, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      } else {
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      }

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1);
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), 500);
    } catch (e) {
      console.log("Audio not supported or blocked");
    }
  }, []);

  const startQuiz = useCallback(() => {
    const randomInst = instruments[Math.floor(Math.random() * instruments.length)];
    setQuizTarget(randomInst);
    setQuizMode(true);
    setFeedback({ show: false, correct: false });
    setSelectedInstrument(null);
  }, [instruments]);

  const handleInstrumentClick = (inst) => {
    setSelectedInstrument(inst);
    playSound(inst.soundType);

    if (quizMode) {
      setAttempts(a => a + 1);
      if (inst.id === quizTarget.id) {
        setScore(s => s + 1);
        setFeedback({ show: true, correct: true });
        setTimeout(() => {
          startQuiz();
        }, 1500);
      } else {
        setFeedback({ show: true, correct: false });
      }
    }
  };

  // SVG Components for Instruments
  const InstrumentVisual = ({ type, color, accent, active }) => {
    if (type === "fontomfrom") {
      return (
        <svg viewBox="0 0 200 200" className={`w-full h-full drop-shadow-md transition-transform ${active ? 'scale-110' : 'hover:scale-105'}`}>
          {/* Main Drum Body */}
          <path d="M60 40 Q100 35 140 40 L135 160 Q100 170 65 160 Z" fill={color} stroke={accent} strokeWidth="3" />
          {/* Carvings */}
          <path d="M80 70 L120 70 M80 100 L120 100 M80 130 L120 130" stroke={accent} strokeWidth="2" strokeDasharray="4 2" />
          {/* Top Skin */}
          <ellipse cx="100" cy="40" rx="40" ry="10" fill="#FDE68A" stroke={accent} strokeWidth="2" />
          {/* Vibration waves */}
          {active && (
            <g className="animate-ping opacity-25">
              <ellipse cx="100" cy="40" rx="60" ry="20" fill="none" stroke={color} strokeWidth="2" />
            </g>
          )}
        </svg>
      );
    }
    if (type === "kpanlogo") {
      return (
        <svg viewBox="0 0 200 200" className={`w-full h-full drop-shadow-md transition-transform ${active ? 'scale-110' : 'hover:scale-105'}`}>
          {/* Tapered Body */}
          <path d="M70 50 Q100 45 130 50 L115 170 Q100 175 85 170 Z" fill={color} stroke={accent} strokeWidth="3" />
          {/* Tuning Pegs */}
          <circle cx="70" cy="65" r="4" fill={accent} />
          <circle cx="130" cy="65" r="4" fill={accent} />
          <circle cx="75" cy="85" r="4" fill={accent} />
          <circle cx="125" cy="85" r="4" fill={accent} />
          {/* Top Skin */}
          <ellipse cx="100" cy="50" rx="30" ry="8" fill="#FEF3C7" stroke={accent} strokeWidth="2" />
          {active && (
            <g className="animate-bounce">
              <path d="M90 30 L110 30" stroke={color} strokeWidth="3" strokeLinecap="round" />
            </g>
          )}
        </svg>
      );
    }
    if (type === "atenteben") {
      return (
        <svg viewBox="0 0 200 200" className={`w-full h-full drop-shadow-md transition-transform ${active ? 'scale-110' : 'hover:scale-105'}`}>
          {/* Bamboo Tube */}
          <rect x="90" y="30" width="20" height="140" rx="4" fill={color} stroke={accent} strokeWidth="3" />
          {/* Finger Holes */}
          {[60, 80, 100, 120, 140].map(y => (
            <circle key={y} cx="100" cy={y} r="3" fill="#111" />
          ))}
          {/* Mouthpiece */}
          <path d="M90 40 L110 40" stroke="#FFF" strokeWidth="2" />
          {active && (
            <g className="animate-pulse">
              <path d="M120 40 Q140 30 130 20" fill="none" stroke={color} strokeWidth="2" />
              <path d="M130 60 Q150 50 140 40" fill="none" stroke={color} strokeWidth="2" />
            </g>
          )}
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      {/* Header */}
      <header className="mb-8 text-center animate-in fade-in slide-in-from-top duration-700">
        <div className="text-6xl mb-4">🥁</div>
        <h1 className="text-3xl md:text-4xl font-black text-blue-900 mb-2">
          Ghanaian Instruments Identifier
        </h1>
        <p className="text-lg text-slate-600 mb-4">Explore the sounds and stories of Ghana's musical heritage!</p>
        <div className="flex flex-wrap justify-center gap-3">
          <span className="px-4 py-1 bg-blue-100 text-blue-700 rounded-full font-bold text-sm border-2 border-blue-200 uppercase tracking-wider">
            Primary 4–6
          </span>
          <span className="px-4 py-1 bg-orange-100 text-orange-700 rounded-full font-bold text-sm border-2 border-orange-200">
            ⏱️ 10 min
          </span>
        </div>
      </header>

      {/* How to Use */}
      <section className="bg-white p-6 rounded-2xl shadow-lg border-l-8 border-blue-500 mb-8 transform transition-all hover:scale-[1.01]">
        <h2 className="flex items-center gap-2 text-xl font-bold text-blue-800 mb-3">
          <HelpCircle className="w-6 h-6" /> How to Use
        </h2>
        <p className="text-slate-700 leading-relaxed font-medium">
          Click on any instrument to see its details and hear its sound. When you are ready, 
          press <strong className="text-blue-600">"Take the Challenge"</strong> to test your knowledge!
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Interactive Control Zone & Visual Area */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-slate-100 relative overflow-hidden h-[400px] flex items-center justify-center">
             <div className="absolute top-4 left-4 flex gap-2">
                <Music className={`w-6 h-6 ${isPlaying ? 'text-orange-500 animate-bounce' : 'text-slate-300'}`} />
             </div>
             
             {/* Selection Stage */}
             <div className="grid grid-cols-3 gap-4 w-full h-full py-12">
               {instruments.map((inst) => (
                 <button
                   key={inst.id}
                   onClick={() => handleInstrumentClick(inst)}
                   className={`relative group rounded-2xl transition-all h-full p-2 flex flex-col items-center justify-between
                     ${selectedInstrument?.id === inst.id ? 'bg-slate-50 ring-4 ring-blue-400' : 'hover:bg-slate-50 opacity-80 hover:opacity-100'}
                   `}
                 >
                   <div className="w-full h-3/4 flex items-center justify-center pointer-events-none">
                     <InstrumentVisual 
                       type={inst.id} 
                       color={inst.color} 
                       accent={inst.accent} 
                       active={selectedInstrument?.id === inst.id && isPlaying} 
                     />
                   </div>
                   <span className={`text-xs md:text-sm font-bold uppercase tracking-tighter ${selectedInstrument?.id === inst.id ? 'text-blue-600' : 'text-slate-500'}`}>
                     {inst.name}
                   </span>
                   {selectedInstrument?.id === inst.id && (
                     <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1 border-2 border-white">
                       <Volume2 className="w-4 h-4" />
                     </div>
                   )}
                 </button>
               ))}
             </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4">
            {!quizMode ? (
              <button
                onClick={startQuiz}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-black text-xl shadow-lg border-b-4 border-blue-900 active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center gap-3"
              >
                <Play className="fill-current" /> TAKE THE CHALLENGE
              </button>
            ) : (
              <div className="bg-orange-50 p-6 rounded-2xl border-4 border-orange-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-orange-800 font-black text-xl">THE CHALLENGE</span>
                  <button 
                    onClick={() => {setQuizMode(false); setSelectedInstrument(null);}}
                    className="text-orange-600 font-bold hover:underline"
                  >
                    Exit Goal
                  </button>
                </div>
                <p className="text-slate-800 font-bold text-lg mb-4 text-center">
                  "Which instrument is from the <span className="underline decoration-orange-500 decoration-4">{quizTarget?.origin}</span> people?"
                </p>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${(score/5)*100}%` }}></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Visual Output Area / Description */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border-4 border-slate-100 min-h-[400px] flex flex-col items-center">
          {selectedInstrument ? (
            <div className="w-full animate-in zoom-in duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl" style={{ backgroundColor: `${selectedInstrument.color}20` }}>
                  <Music style={{ color: selectedInstrument.color }} />
                </div>
                <div>
                  <h3 className="text-3xl font-black" style={{ color: selectedInstrument.accent }}>
                    {selectedInstrument.name}
                  </h3>
                  <p className="text-slate-500 font-bold uppercase text-sm tracking-widest">{selectedInstrument.type}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="flex items-center gap-2 font-bold text-slate-700 mb-2">
                    <Info className="w-4 h-4 text-blue-500" /> Origin: {selectedInstrument.origin}
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-lg italic">"{selectedInstrument.description}"</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {selectedInstrument.features.map((feature, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedInstrument.color }}></div>
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="bg-yellow-50 p-4 rounded-2xl border-2 border-yellow-200">
                  <p className="text-yellow-800 text-sm">
                    <strong className="block text-yellow-900 mb-1 font-black">🌟 FUN FACT:</strong>
                    {selectedInstrument.fact}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
              <Music className="w-24 h-24 mb-6" />
              <p className="text-2xl font-black">Choose a Drum <br/>or the Flute!</p>
            </div>
          )}

          {/* Feedback Overlay */}
          {feedback.show && (
            <div className={`mt-auto w-full p-4 rounded-2xl flex items-center gap-4 transition-all animate-in slide-in-from-bottom-4 duration-300 ${feedback.correct ? 'bg-green-100 border-2 border-green-500 animate-bounce' : 'bg-red-100 border-2 border-red-500'}`}>
              {feedback.correct ? (
                <>
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                  <div>
                    <p className="font-black text-green-800 text-xl">✅ FANTASTIC!</p>
                    <p className="text-green-700 font-bold">You know your Ghanaian culture!</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-10 h-10 text-red-600" />
                  <div>
                    <p className="font-black text-red-800 text-xl">❌ NOT QUITE!</p>
                    <p className="text-red-700 font-bold">Try clicking a different instrument.</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Score / Feedback Panel */}
      {quizMode && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-2xl shadow-md border-b-4 border-blue-500 text-center">
            <p className="text-slate-500 text-xs font-bold uppercase">Correct</p>
            <p className="text-3xl font-black text-blue-600">{score}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-md border-b-4 border-orange-500 text-center">
            <p className="text-slate-500 text-xs font-bold uppercase">Attempts</p>
            <p className="text-3xl font-black text-orange-600">{attempts}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-md border-b-4 border-green-500 text-center">
            <p className="text-slate-500 text-xs font-bold uppercase">Accuracy</p>
            <p className="text-3xl font-black text-green-600">
              {attempts === 0 ? "0%" : `${Math.round((score / attempts) * 100)}%`}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-md border-b-4 border-purple-500 text-center">
            <p className="text-slate-500 text-xs font-bold uppercase">Level</p>
            <p className="text-3xl font-black text-purple-600">
              {score < 3 ? "Beginner" : score < 6 ? "Skilled" : "Master"}
            </p>
          </div>
        </div>
      )}

      {/* Educational Value Footer */}
      <footer className="bg-slate-800 text-slate-300 p-8 rounded-3xl">
        <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
          <Info className="w-6 h-6 text-blue-400" /> Learning Path: Ghanaian Heritage
        </h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <li className="flex items-start gap-3">
            <span className="p-1 bg-green-500 rounded-full mt-1"></span>
            <span>Identify instruments by their <strong>visual shape and sound</strong>.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="p-1 bg-blue-500 rounded-full mt-1"></span>
            <span>Connect musical tools to their specific <strong>ethnic origin (Akan, Ga)</strong>.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="p-1 bg-yellow-500 rounded-full mt-1"></span>
            <span>Understand the <strong>cultural roles</strong> (royalty vs recreation) of music.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="p-1 bg-red-500 rounded-full mt-1"></span>
            <span>Differentiate between <strong>percussion and woodwind</strong> categories.</span>
          </li>
        </ul>
      </footer>

      {/* Styles for animation */}
      <style jsx>{`
        @keyframes thump {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        .drum-pulse {
          animation: thump 0.2s ease-in-out;
        }
      `}</style>
    </div>
  );
}
