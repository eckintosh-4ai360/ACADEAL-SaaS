import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Calendar, 
  Flag, 
  History, 
  RotateCcw, 
  Target, 
  Award, 
  BookOpen, 
  HelpCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  Milestone
} from "lucide-react";

const HISTORICAL_EVENTS = [
  { 
    id: "bond-1844", 
    year: "1844", 
    title: "The Bond of 1844", 
    description: "An agreement between Fante chiefs and the British.",
    period: "colonial",
    emoji: "📜"
  },
  { 
    id: "ugcc-1947", 
    year: "1947", 
    title: "Formation of UGCC", 
    description: "The United Gold Coast Convention was formed for self-government.",
    period: "independence",
    emoji: "🤝"
  },
  { 
    id: "cpp-1949", 
    year: "1949", 
    title: "Formation of CPP", 
    description: "Kwame Nkrumah formed the Convention People's Party.",
    period: "independence",
    emoji: "🚩"
  },
  { 
    id: "independence-1957", 
    year: "1957", 
    title: "Independence Day", 
    description: "Ghana became the first sub-Saharan African nation to gain independence.",
    period: "independence",
    emoji: "🇬🇭"
  },
  { 
    id: "republic-1960", 
    year: "1960", 
    title: "Republic Status", 
    description: "Ghana officially became a republic with Nkrumah as President.",
    period: "republic",
    emoji: "🏛️"
  }
];

const TIMELINE_SLOTS = [
  { id: "slot-0", label: "Pre-Independence Growth", period: "colonial" },
  { id: "slot-1", label: "The Struggle Begins", period: "independence" },
  { id: "slot-2", label: "Political Awakening", period: "independence" },
  { id: "slot-3", label: "Freedom attained", period: "independence" },
  { id: "slot-4", label: "Birth of a Republic", period: "republic" }
];

export default function GhanaIndependenceTimeline() {
  const [placedEvents, setPlacedEvents] = useState(Array(TIMELINE_SLOTS.length).fill(null));
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [incorrectSlots, setIncorrectSlots] = useState([]);

  // Shuffle events for the bank
  const eventBank = useMemo(() => {
    return [...HISTORICAL_EVENTS].sort(() => Math.random() - 0.5);
  }, []);

  const handleEventSelect = (event) => {
    if (gameWon) return;
    setSelectedEvent(event);
    setFeedback(null);
    setIncorrectSlots([]);
  };

  const handleSlotClick = (index) => {
    if (!selectedEvent || gameWon) return;

    // Check if event is already placed elsewhere
    const newPlaced = [...placedEvents];
    const existingIndex = newPlaced.findIndex(e => e?.id === selectedEvent.id);
    if (existingIndex !== -1) {
      newPlaced[existingIndex] = null;
    }

    newPlaced[index] = selectedEvent;
    setPlacedEvents(newPlaced);
    setSelectedEvent(null);
    setFeedback(null);
  };

  const removeEvent = (index) => {
    if (gameWon) return;
    const newPlaced = [...placedEvents];
    newPlaced[index] = null;
    setPlacedEvents(newPlaced);
    setFeedback(null);
  };

  const checkMyAnswer = () => {
    setAttempts(prev => prev + 1);
    const correctOrder = HISTORICAL_EVENTS.map(e => e.id);
    const currentOrder = placedEvents.map(e => e?.id);
    
    const newIncorrectSlots = [];
    let isCorrect = true;

    for (let i = 0; i < TIMELINE_SLOTS.length; i++) {
      if (currentOrder[i] !== correctOrder[i]) {
        isCorrect = false;
        if (currentOrder[i]) newIncorrectSlots.push(i);
      }
    }

    if (isCorrect) {
      setFeedback("correct");
      setScore(prev => prev + 50);
      setGameWon(true);
    } else {
      setFeedback("incorrect");
      setIncorrectSlots(newIncorrectSlots);
      setTimeout(() => setIncorrectSlots([]), 2000);
    }
  };

  const resetGame = () => {
    setPlacedEvents(Array(TIMELINE_SLOTS.length).fill(null));
    setSelectedEvent(null);
    setFeedback(null);
    setScore(0);
    setAttempts(0);
    setGameWon(false);
    setIncorrectSlots([]);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-orange-50/20 min-h-screen font-sans text-slate-800">
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
          <div className="bg-orange-100 p-4 rounded-2xl">
            <History className="text-orange-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Ghana Independence Timeline</h1>
            <p className="text-slate-500 font-medium tracking-tight">The journey to March 6th, 1957 and beyond</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm">
            Primary 4–6
          </span>
          <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full border border-red-200 shadow-sm flex items-center gap-1">
            <Clock size={16} /> 15 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Event Bank */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* 2. "How to Use" box */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <HelpCircle className="text-blue-500" size={18} /> How to Build
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              1. Tap an event card from the bank below.<br/>
              2. Tap the correct year circle on the timeline.<br/>
              3. Put all events in order to score points!
            </p>
          </section>

          {/* 3. Interactive Control Zone: Event Bank */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Historical Events</h3>
            <div className="flex flex-col gap-3">
              {eventBank.map((event) => {
                const isPlaced = placedEvents.some(e => e?.id === event.id);
                const isSelected = selectedEvent?.id === event.id;
                
                return (
                  <button
                    key={event.id}
                    onClick={() => handleEventSelect(event)}
                    disabled={isPlaced || gameWon}
                    className={`
                      p-4 rounded-2xl border-2 transition-all text-left flex items-start gap-4
                      ${isPlaced ? 'opacity-30 grayscale cursor-default' : 'hover:border-orange-300 hover:scale-[1.02]'}
                      ${isSelected ? 'border-orange-500 bg-orange-50 ring-4 ring-orange-100' : 'bg-white border-slate-50'}
                    `}
                  >
                    <span className="text-2xl pt-1">{event.emoji}</span>
                    <div>
                      <h4 className="font-black text-slate-900 leading-tight">{event.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{event.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Timeline Visual Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* 4. Live Visual Output Area */}
          <div className="bg-white rounded-[3rem] shadow-xl border-8 border-orange-50/30 p-8 relative overflow-hidden min-h-[500px] flex flex-col items-center justify-center">
            
            <div className="w-full max-w-2xl relative">
              {/* Timeline Main Line */}
              <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 rounded-full" />
              <div 
                className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-orange-400 to-red-500 -translate-y-1/2 rounded-full transition-all duration-1000" 
                style={{ width: `${(placedEvents.filter(e => e).length / TIMELINE_SLOTS.length) * 100}%` }}
              />

              <div className="relative flex justify-between items-center w-full min-h-[400px]">
                {TIMELINE_SLOTS.map((slot, index) => {
                  const event = placedEvents[index];
                  const isIncorrect = incorrectSlots.includes(index);
                  
                  return (
                    <div key={slot.id} className="flex flex-col items-center gap-6 relative z-10 w-32">
                      {/* Event Slot/Placeholder */}
                      <div className="relative w-full h-40">
                        {event ? (
                          <div 
                            className={`
                              bg-white border-2 p-3 rounded-2xl shadow-lg transition-all text-center h-full flex flex-col items-center justify-center cursor-pointer border-orange-200
                              ${gameWon ? 'border-green-400 ring-4 ring-green-100' : 'hover:scale-105'}
                              ${isIncorrect ? 'border-red-500 animate-shake' : ''}
                            `}
                            onClick={() => removeEvent(index)}
                          >
                            <span className="text-3xl mb-1">{event.emoji}</span>
                            <span className="text-[10px] font-black text-orange-600 block mb-1">{event.year}</span>
                            <p className="text-[11px] font-bold leading-tight text-slate-800">{event.title}</p>
                            <button className="absolute -top-2 -right-2 bg-slate-100 text-slate-400 w-5 h-5 rounded-full text-xs opacity-0 hover:opacity-100 transition-opacity">×</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSlotClick(index)}
                            className={`
                              w-full h-full rounded-2xl border-4 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 transition-all
                              ${selectedEvent ? 'border-orange-200 bg-orange-50/50 hover:bg-orange-50' : 'bg-slate-50/50'}
                            `}
                          >
                            <Milestone size={20} className="text-slate-200" />
                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center px-2">{slot.label}</span>
                          </button>
                        )}
                      </div>

                      {/* Timeline Junction */}
                      <div className={`
                        w-6 h-6 rounded-full border-4 transition-all duration-500
                        ${event ? 'bg-orange-500 border-white ring-2 ring-orange-200' : 'bg-white border-slate-100'}
                      `} />

                      {/* Slot Label/Year Range */}
                      <div className="text-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                          {HISTORICAL_EVENTS[index].year}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="absolute top-8 right-8 text-right">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Time progression</span>
                <div className="flex gap-1">
                   <div className="w-8 h-1 bg-orange-100 rounded-full" />
                   <div className="w-8 h-1 bg-orange-200 rounded-full" />
                   <div className="w-8 h-1 bg-orange-500 rounded-full" />
                </div>
            </div>

            {/* Completion Effects */}
            {gameWon && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-700">
                <div className="text-7xl mb-4">🇬🇭</div>
                <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter">Yen Ara Asase Ni</h2>
                <p className="text-slate-600 font-medium mb-8">You've mastered the key milestones of our history!</p>
                <div className="flex gap-4">
                   <div className="bg-orange-50 p-4 rounded-3xl border border-orange-100 text-center px-10">
                      <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Final Score</p>
                      <p className="text-3xl font-black text-orange-600">{score}</p>
                   </div>
                   <div className="bg-red-50 p-4 rounded-3xl border border-red-100 text-center px-10">
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Total Tries</p>
                      <p className="text-3xl font-black text-red-600">{attempts}</p>
                   </div>
                </div>
                <button 
                  onClick={resetGame}
                  className="mt-10 bg-orange-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-orange-200 active:scale-95 transition-all"
                >
                  Explore Again
                </button>
              </div>
            )}
          </div>

          {/* 5. Score / Feedback Panel */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-100 p-3 rounded-2xl">
                <Target className="text-yellow-600" size={24} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">History Quest</p>
                <p className="font-bold text-slate-700 leading-tight">Can you place all events in the correct chronological order?</p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              {feedback === 'correct' ? (
                <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl border border-emerald-100 animate-in zoom-in">
                  <CheckCircle2 size={24} />
                  <span className="font-extrabold uppercase tracking-tight text-sm">Ghana Osono! ✅</span>
                </div>
              ) : feedback === 'incorrect' ? (
                <div className="flex items-center gap-3 bg-red-50 text-red-700 px-6 py-3 rounded-2xl border border-red-100 animate-shake">
                  <XCircle size={24} />
                  <span className="font-bold text-sm">Not quite. Try swapping some events!</span>
                </div>
              ) : (
                <button 
                  onClick={checkMyAnswer}
                  disabled={placedEvents.includes(null)}
                  className={`
                    w-full md:w-auto px-10 py-4 rounded-2xl font-black text-lg transition-all shadow-lg
                    ${placedEvents.includes(null) ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700 active:scale-95 shadow-orange-100'}
                  `}
                >
                  Check My Answer
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-orange-600" size={24} />
          Learning Benefits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-orange-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Master <strong>chronology</strong> by ordering events from the 19th and 20th centuries.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-red-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Identify <strong>key figures</strong> such as Kwame Nkrumah and the Big Six.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-yellow-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Understand the transition from <strong>Gold Coast</strong> to Independent Ghana.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-blue-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Recognize the difference between <strong>Independence</strong> and <strong>Republic</strong> status.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
