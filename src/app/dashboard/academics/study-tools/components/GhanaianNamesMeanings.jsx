import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, RefreshCw, Star, Info, Award, ChevronLeft } from "lucide-react";

export default function GhanaianNamesMeanings() {
  const [targetName, setTargetName] = useState(null);
  const [selectedDay, setSelectedDay] = useState("");
  const [feedback, setFeedback] = useState({ status: "idle", message: "" });
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);

  const daysOfWeek = useMemo(() => [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  ], []);

  const akanNames = useMemo(() => [
    { name: "Kwasi", day: "Sunday", gender: "Boy", color: "#FF6B6B" },
    { name: "Akosua", day: "Sunday", gender: "Girl", color: "#FF6B6B" },
    { name: "Kojo", day: "Monday", gender: "Boy", color: "#FFD93D" },
    { name: "Adwoa", day: "Monday", gender: "Girl", color: "#FFD93D" },
    { name: "Kwabena", day: "Tuesday", gender: "Boy", color: "#6BCB77" },
    { name: "Abena", day: "Tuesday", gender: "Girl", color: "#6BCB77" },
    { name: "Kwaku", day: "Wednesday", gender: "Boy", color: "#4D96FF" },
    { name: "Akua", day: "Wednesday", gender: "Girl", color: "#4D96FF" },
    { name: "Yaw", day: "Thursday", gender: "Boy", color: "#9C88FF" },
    { name: "Yaa", day: "Thursday", gender: "Girl", color: "#9C88FF" },
    { name: "Kofi", day: "Friday", gender: "Boy", color: "#FF9F43" },
    { name: "Afia", day: "Friday", gender: "Girl", color: "#FF9F43" },
    { name: "Kwame", day: "Saturday", gender: "Boy", color: "#00CEC9" },
    { name: "Ama", day: "Saturday", gender: "Girl", color: "#00CEC9" }
  ], []);

  const pickNewName = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * akanNames.length);
    setTargetName(akanNames[randomIndex]);
    setSelectedDay("");
    setFeedback({ status: "idle", message: "" });
  }, [akanNames]);

  useEffect(() => {
    pickNewName();
  }, [pickNewName]);

  const handleCheckAnswer = () => {
    if (!selectedDay) return;
    setAttempts(a => a + 1);
    
    if (selectedDay === targetName.day) {
      setFeedback({ status: "correct", message: "Correct! You did a great job!" });
      setScore(s => s + 1);
    } else {
      setFeedback({ 
        status: "incorrect", 
        message: `Try again! Hint: ${targetName.name} is born on the ${targetName.day === "Sunday" ? "first" : "same"} day as... wait, it starts with ${targetName.day.charAt(0)}!` 
      });
    }
  };

  const getCalendarDayColor = (day) => {
    return selectedDay === day ? targetName?.color || "#4D96FF" : "#E2E8F0";
  };

  if (!targetName) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-white rounded-3xl shadow-xl border-4 border-[#4D96FF]/20 font-sans">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-center bg-[#4D96FF] text-white p-6 rounded-2xl shadow-sm mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-5xl border-4 border-white rounded-full p-2 bg-white/20">🇬🇭</span>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Ghanaian Names & Meanings</h1>
            <p className="text-[#FFD93D] font-semibold text-lg mt-1">Discover the day you were born!</p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <span className="bg-[#FF6B6B] text-white px-4 py-2 rounded-full font-bold text-sm shadow-md flex items-center gap-2">
            <Award size={18} /> KG 1–2
          </span>
          <span className="bg-[#6BCB77] text-white px-4 py-2 rounded-full font-bold text-sm shadow-md flex items-center gap-2">
            ⏱️ 9 min
          </span>
        </div>
      </header>

      {/* How to Use Box */}
      <div className="bg-[#FFF4E6] border-2 border-[#FF9F43] p-5 rounded-2xl mb-8 flex items-start gap-4 shadow-sm">
        <Info className="text-[#FF9F43] mt-1 shrink-0" size={32} />
        <div>
          <h3 className="font-bold text-xl text-[#FF9F43] mb-2">How to Play!</h3>
          <p className="text-lg text-gray-700 leading-relaxed">
            Look at the beautiful Ghanaian name below. Click on the day of the week you think it means. Watch the calendar color up! Press <b>Check My Answer</b> to see if you are a star! 🌟
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Interactive Control Zone */}
        <section className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-100 shadow-inner flex flex-col items-center">
          <div className="text-center mb-6">
            <p className="text-gray-500 font-medium mb-2 uppercase tracking-wide">Who is this?</p>
            <div 
              className="text-6xl font-black py-4 px-8 rounded-2xl text-white shadow-lg transition-all duration-300 transform hover:scale-105"
              style={{ backgroundColor: targetName.color }}
            >
              {targetName.name}
            </div>
            <p className="mt-3 text-xl text-gray-600 font-semibold">
              Gender: {targetName.gender} {targetName.gender === "Boy" ? "👦🏾" : "👧🏾"}
            </p>
          </div>

          <div className="w-full">
            <h4 className="text-center font-bold text-gray-700 mb-4 text-xl">Select their birth day:</h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 w-full">
              {daysOfWeek.map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`relative p-3 rounded-2xl font-bold text-lg transition-all duration-300 
                    ${selectedDay === day 
                      ? "text-white shadow-md transform scale-105 ring-4 ring-offset-2 ring-opacity-50" 
                      : "bg-white text-gray-600 border-2 border-gray-200 hover:border-[#4D96FF] hover:bg-[#F0F7FF]"
                    }
                  `}
                  style={{ 
                    backgroundColor: selectedDay === day ? targetName.color : "",
                    borderColor: selectedDay === day ? targetName.color : "",
                    "--tw-ring-color": targetName.color
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Live Visual Output Area */}
        <section className="bg-white p-6 rounded-2xl border-2 border-gray-100 shadow-md flex flex-col items-center justify-center relative overflow-hidden">
          <h3 className="font-bold text-2xl mb-4 text-gray-700 text-center">Interactive Calendar</h3>
          
          {/* Dynamic SVG Visual */}
          <div className="w-full max-w-sm aspect-square relative transition-all duration-300">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
              <rect x="10" y="10" width="80" height="80" rx="10" fill="white" stroke="#CBD5E1" strokeWidth="2" />
              {/* Calendar rings */}
              <path d="M 25 5 L 25 15 M 75 5 L 75 15" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
              {/* Header */}
              <rect x="10" y="10" width="80" height="25" rx="10" fill={selectedDay ? targetName.color : "#94A3B8"} className="transition-all duration-300" />
              <rect x="10" y="25" width="80" height="10" fill={selectedDay ? targetName.color : "#94A3B8"} className="transition-all duration-300" />
              
              <text x="50" y="28" fill="white" fontSize="12" fontWeight="bold" textAnchor="middle" className="transition-all duration-300">
                {selectedDay ? selectedDay.toUpperCase() : "CHOOSE A DAY"}
              </text>
              
              <circle cx="50" cy="60" r="20" fill={getCalendarDayColor(targetName.day)} className="transition-all duration-500 opacity-20" />
              <text x="50" y="66" fill={selectedDay ? targetName.color : "#94A3B8"} fontSize="20" fontWeight="black" textAnchor="middle" className="transition-all duration-300">
                {selectedDay ? "⭐" : "?"}
              </text>
              {selectedDay && (
                <text x="50" y="85" fill="#475569" fontSize="8" fontWeight="bold" textAnchor="middle">
                  {targetName.name} means {selectedDay}
                </text>
              )}
            </svg>
          </div>
        </section>
      </div>

      {/* Score / Feedback Panel */}
      <div className="mt-8 bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex gap-4 items-center">
            <button
              onClick={handleCheckAnswer}
              disabled={!selectedDay || feedback.status === "correct"}
              className="px-8 py-4 bg-[#6BCB77] hover:bg-[#5BB866] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xl font-extrabold rounded-full shadow-[0_6px_0_#4E9E57] active:shadow-none active:translate-y-[6px] transition-all duration-150 flex items-center gap-3"
            >
              <CheckCircle2 size={28} /> Check My Answer
            </button>
            <button
              onClick={pickNewName}
              className="p-4 bg-[#FF9F43] hover:bg-[#E88E3B] text-white rounded-full shadow-[0_6px_0_#CB7A28] active:shadow-none active:translate-y-[6px] transition-all duration-150"
              aria-label="Next Name"
              title="Next Name"
            >
              <RefreshCw size={28} />
            </button>
          </div>
          
          <div className="flex gap-6 text-center sm:text-right">
            <div className="bg-gray-50 px-6 py-3 rounded-2xl border-2 border-gray-100">
              <span className="block text-gray-500 text-sm font-bold uppercase">Attempts</span>
              <span className="text-3xl font-black text-gray-700">{attempts}</span>
            </div>
            <div className="bg-[#FFF8CC] px-6 py-3 rounded-2xl border-2 border-[#FFD93D]">
              <span className="block text-[#B89B00] text-sm font-bold uppercase flex items-center gap-1 justify-center"><Star size={14}/> Score</span>
              <span className="text-3xl font-black text-[#B89B00]">{score}</span>
            </div>
          </div>
        </div>

        {feedback.status !== "idle" && (
          <div className={`mt-6 p-5 rounded-2xl border-2 flex items-center gap-4 transition-all duration-300 transform translate-y-0 opacity-100
              ${feedback.status === "correct" ? "bg-[#E8F8EE] border-[#6BCB77]" : "bg-[#FFF0F0] border-[#FF6B6B]"}
            `}
          >
            {feedback.status === "correct" ? (
              <CheckCircle2 size={40} className="text-[#6BCB77] shrink-0" />
            ) : (
              <XCircle size={40} className="text-[#FF6B6B] shrink-0" />
            )}
            <p className={`text-xl font-bold ${feedback.status === "correct" ? "text-[#4E9E57]" : "text-[#E65656]"}`}>
              {feedback.message}
            </p>
          </div>
        )}
      </div>

      {/* Educational Value Footer */}
      <footer className="mt-8 bg-[#F8FAFC] p-6 rounded-2xl border-t-4 border-[#4D96FF]/30 text-gray-600">
        <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
          <Award className="text-[#4D96FF]" size={20} /> Today we are learning to:
        </h4>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-medium">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF6B6B]"></span> Connect written names to spoken Ghanaian names
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FFD93D]"></span> Understand days of the week in cultural context
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#6BCB77]"></span> Distinguish between boy and girl naming traditions
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4D96FF]"></span> Practice hand-eye coordination with interactive selection
          </li>
        </ul>
      </footer>
    </div>
  );
}
