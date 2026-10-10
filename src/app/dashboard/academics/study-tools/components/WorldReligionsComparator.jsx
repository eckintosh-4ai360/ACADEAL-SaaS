import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Book, Home, Calendar, Star, CheckCircle2, XCircle, HelpCircle, ArrowRightLeft, Lightbulb, ChevronLeft } from "lucide-react";

export default function WorldReligionsComparator() {
  const [rel1, setRel1] = useState("christianity");
  const [rel2, setRel2] = useState("islam");
  const [activeTab, setActiveTab] = useState("sacredText");

  const [quizQuestion, setQuizQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizStatus, setQuizStatus] = useState("idle"); 
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);

  const religionsData = {
    christianity: {
      id: "christianity",
      name: "Christianity",
      sacredText: "Bible",
      worshipPlace: "Church",
      festivals: ["Christmas", "Easter"],
      coreBelief: "Belief in Jesus Christ as the Son of God.",
      icon: "✝️",
      theme: "border-purple-600 bg-purple-50 text-purple-900",
      accent: "bg-purple-600 hover:bg-purple-700 text-white",
      svgStyle: { fill: "#f3e8ff", stroke: "#9333ea" }
    },
    islam: {
      id: "islam",
      name: "Islam",
      sacredText: "Qur'an",
      worshipPlace: "Mosque",
      festivals: ["Eid al-Fitr", "Eid al-Adha"],
      coreBelief: "Belief in one God (Allah) and Muhammad as His prophet.",
      icon: "☪️",
      theme: "border-teal-600 bg-teal-50 text-teal-900",
      accent: "bg-teal-600 hover:bg-teal-700 text-white",
      svgStyle: { fill: "#f0fdfa", stroke: "#0d9488" }
    },
    atr: {
      id: "atr",
      name: "African Traditional Religion",
      sacredText: "Oral Traditions & Proverbs",
      worshipPlace: "Shrines",
      festivals: ["Homowo", "Odwira", "Aboakyer"],
      coreBelief: "Belief in a Supreme Being, deities, and ancestors.",
      icon: "🌍",
      theme: "border-orange-600 bg-orange-50 text-orange-900",
      accent: "bg-orange-600 hover:bg-orange-700 text-white",
      svgStyle: { fill: "#fff7ed", stroke: "#ea580c" }
    }
  };

  const tabs = [
    { id: "sacredText", label: "Sacred Texts", icon: Book },
    { id: "worshipPlace", label: "Place of Worship", icon: Home },
    { id: "festivals", label: "Festivals", icon: Calendar },
    { id: "coreBelief", label: "Core Beliefs", icon: Star }
  ];

  const generateQuestion = useCallback(() => {
    const r1Data = religionsData[rel1];
    const r2Data = religionsData[rel2];
    
    const possibleTabs = ["sacredText", "worshipPlace", "festivals", "coreBelief"];
    const targetTabId = possibleTabs[Math.floor(Math.random() * possibleTabs.length)];
    const targetRel = Math.random() > 0.5 ? r1Data : r2Data;
    
    let questionText = "";
    if (targetTabId === "sacredText") {
      questionText = `Which religion uses the ${targetRel.sacredText} as its primary source of teachings?`;
    } else if (targetTabId === "worshipPlace") {
      questionText = `Followers of which religion typically worship in a ${targetRel.worshipPlace}?`;
    } else if (targetTabId === "festivals") {
      const festival = targetRel.festivals[Math.floor(Math.random() * targetRel.festivals.length)];
      questionText = `Which religion celebrates the festival of ${festival}?`;
    } else {
      questionText = `Which religion's core belief includes: "${targetRel.coreBelief.substring(0, 20)}..."?`;
    }

    setQuizQuestion({
      text: questionText,
      options: [
        { id: r1Data.id, text: r1Data.name },
        { id: r2Data.id, text: r2Data.name }
      ],
      correctAnswer: targetRel.id
    });
    setSelectedAnswer(null);
    setQuizStatus("idle");
  }, [rel1, rel2]);

  useEffect(() => {
    generateQuestion();
  }, [generateQuestion]);

  const handleCheckAnswer = () => {
    if (!selectedAnswer) return;
    
    setAttempts(prev => prev + 1);
    if (selectedAnswer === quizQuestion.correctAnswer) {
      setQuizStatus("correct");
      setScore(prev => prev + 1);
    } else {
      setQuizStatus("incorrect");
    }
  };

  const handleSwap = () => {
    setRel1(rel2);
    setRel2(rel1);
  };

  const r1 = religionsData[rel1];
  const r2 = religionsData[rel2];
  const ActiveTabIcon = tabs.find(t => t.id === activeTab)?.icon || Star;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 bg-slate-50 font-sans text-slate-800">
      {/* ── BACK BUTTON ── */}
      <div className="mb-4">
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
      </div>

      {/* 1. Header Area Space */}
      <header className="bg-white rounded-3xl p-6 shadow-xl mb-6 text-center border-t-8 border-navy-800 relative overflow-hidden flex flex-col items-center">
        <div className="absolute -right-8 -top-8 text-blue-50 opacity-10">
          <Book size={200} />
        </div>
        <div className="relative z-10">
          <div className="flex justify-center items-center space-x-3 mb-2">
            <span className="text-5xl" role="img" aria-label="balance">⚖️</span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">World Religions</h1>
          </div>
          <p className="text-lg md:text-xl text-slate-600 font-medium mb-4">Compare beliefs, practices, and traditions</p>
          <div className="flex flex-wrap justify-center gap-3">
            <span className="bg-indigo-100 text-indigo-800 font-bold px-4 py-1.5 rounded-full text-sm shadow-sm flex items-center">
              JHS 1–3 (RME)
            </span>
            <span className="bg-sky-100 text-sky-800 font-bold px-4 py-1.5 rounded-full text-sm shadow-sm flex items-center">
              ⏱️ 15 Min
            </span>
          </div>
        </div>
      </header>

      {/* 2. "How to Use" Box */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 border border-slate-200">
        <h2 className="flex items-center text-lg font-bold text-slate-800 mb-2">
          <HelpCircle className="w-6 h-6 mr-2 text-indigo-600" /> How to Use
        </h2>
        <p className="text-slate-600 text-md">
          Choose two religions from the dropdowns below to compare them side-by-side. Click on the <strong>Categories</strong> (Texts, Worship, Festivals, Beliefs) to explore their similarities and differences. Once you're ready, test your knowledge in the Quiz section!
        </p>
      </div>

      {/* 3. Interactive Control Zone */}
      <main className="bg-white rounded-3xl p-4 sm:p-6 shadow-lg border border-slate-200 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="w-full md:w-[45%]">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Religion 1</label>
            <select 
              className={`w-full p-4 rounded-xl text-lg font-bold shadow-sm border-2 outline-none appearance-none transition-colors cursor-pointer ${r1.theme}`}
              value={rel1} 
              onChange={(e) => setRel1(e.target.value)}
            >
              {Object.values(religionsData).map(r => (
                <option key={r.id} value={r.id} disabled={r.id === rel2}>{r.icon} {r.name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleSwap}
            className="p-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-transform active:scale-95 shadow-sm hidden md:block"
            aria-label="Swap Religions"
          >
            <ArrowRightLeft className="w-6 h-6" />
          </button>

          <div className="w-full md:w-[45%]">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-left md:text-right">Religion 2</label>
            <select 
              className={`w-full p-4 rounded-xl text-lg font-bold shadow-sm border-2 outline-none appearance-none transition-colors cursor-pointer md:text-right ${r2.theme}`}
              value={rel2} 
              onChange={(e) => setRel2(e.target.value)}
            >
              {Object.values(religionsData).map(r => (
                <option key={r.id} value={r.id} disabled={r.id === rel1}>{r.icon} {r.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-8">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 sm:px-6 rounded-full font-bold text-sm sm:text-base transition-all duration-300 ${isActive ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* 4. Live Visual Output Area */}
        <div className="relative w-full overflow-visible bg-slate-50 rounded-2xl border-2 border-slate-100 mb-8 p-4 py-12 flex justify-center">
          <svg width="100%" height="200" viewBox="0 0 600 200" className="max-w-3xl drop-shadow-md overflow-visible">
            {/* Connection Paths */}
            <path d="M 150 100 Q 300 20 450 100" fill="none" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 8" className="opacity-60 transition-all duration-500" />
            
            {/* Left Religion Visual */}
            <g className="transition-transform duration-500" style={{ transformOrigin: "150px 100px" }}>
              <circle cx="150" cy="100" r="70" fill={r1.svgStyle.fill} stroke={r1.svgStyle.stroke} strokeWidth="6" className="transition-all duration-300" />
              <foreignObject x="80" y="30" width="140" height="140">
                <div className="flex flex-col items-center justify-center w-full h-full p-2 text-center">
                  <span className="text-4xl mb-1">{r1.icon}</span>
                  <span className="text-sm font-bold opacity-80" style={{ color: r1.svgStyle.stroke }}>{r1.name}</span>
                </div>
              </foreignObject>
            </g>

            {/* Right Religion Visual */}
            <g className="transition-transform duration-500" style={{ transformOrigin: "450px 100px" }}>
              <circle cx="450" cy="100" r="70" fill={r2.svgStyle.fill} stroke={r2.svgStyle.stroke} strokeWidth="6" className="transition-all duration-300" />
              <foreignObject x="380" y="30" width="140" height="140">
                <div className="flex flex-col items-center justify-center w-full h-full p-2 text-center">
                  <span className="text-4xl mb-1">{r2.icon}</span>
                  <span className="text-sm font-bold opacity-80" style={{ color: r2.svgStyle.stroke }}>{r2.name}</span>
                </div>
              </foreignObject>
            </g>

            {/* Center Node representing Active Tab */}
            <g className="transition-all duration-500" style={{ transformOrigin: "300px 100px" }}>
              <circle cx="300" cy="70" r="40" fill="white" stroke="#4f46e5" strokeWidth="5" className="transition-all duration-300 shadow-2xl" />
              <foreignObject x="260" y="30" width="80" height="80">
                <div className="flex items-center justify-center w-full h-full text-indigo-600 transition-all duration-300 animate-bounce">
                  <ActiveTabIcon size={32} />
                </div>
              </foreignObject>
            </g>
          </svg>
        </div>

        {/* Dynamic Content Panels based on Active Tab */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-slate-800 text-white font-black text-sm w-12 h-12 rounded-full items-center justify-center border-4 border-white shadow-lg">
            VS
          </div>

          {[r1, r2].map((rel, idx) => (
            <div key={`${rel.id}-${idx}`} className={`p-6 rounded-2xl border-2 transition-all duration-500 ${rel.theme}`}>
              <div className="min-h-[140px] flex flex-col items-center justify-center text-center bg-white/80 p-5 rounded-xl shadow-inner backdrop-blur-sm">
                
                <h3 className="text-xs uppercase font-extrabold tracking-widest mb-3 opacity-60">
                   {tabs.find(t => t.id === activeTab)?.label}
                </h3>
                
                {activeTab === "sacredText" && (
                  <span className="text-2xl md:text-3xl font-extrabold">{rel.sacredText}</span>
                )}
                {activeTab === "worshipPlace" && (
                  <span className="text-2xl md:text-3xl font-extrabold">{rel.worshipPlace}</span>
                )}
                {activeTab === "coreBelief" && (
                  <p className="text-lg md:text-xl font-semibold italic text-slate-800">"{rel.coreBelief}"</p>
                )}
                {activeTab === "festivals" && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {rel.festivals.map(f => (
                      <span key={f} className={`px-4 py-2 rounded-xl font-bold shadow-sm ${rel.accent}`}>{f}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* 5. Score / Feedback Panel */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl mb-6 flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1 w-full">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wide">Knowledge Check</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold mb-6 min-h-[64px]">
            {quizQuestion?.text}
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {quizQuestion?.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { setSelectedAnswer(opt.id); setQuizStatus("idle"); }}
                className={`p-4 rounded-xl font-bold text-lg transition-all border-2 flex items-center justify-between
                  ${selectedAnswer === opt.id 
                    ? 'bg-white text-slate-900 border-white scale-[1.02] shadow-lg' 
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'}`}
              >
                <span>{opt.text}</span>
                {selectedAnswer === opt.id && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleCheckAnswer}
              disabled={!selectedAnswer || quizStatus === "correct"}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center transition-all 
                ${!selectedAnswer ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                  : quizStatus === 'correct' ? 'bg-emerald-500 text-white' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-[1.02]'}`}
            >
              Check Answer
            </button>
            
            {quizStatus === "correct" && (
              <button
                onClick={generateQuestion}
                className="px-6 py-3 rounded-xl font-bold text-slate-900 bg-white hover:bg-slate-100 shadow-lg transition-all"
              >
                Next Question ➔
              </button>
            )}
          </div>

          <div className="mt-4 min-h-[32px]">
            {quizStatus === "correct" && (
              <p className="text-emerald-400 font-bold flex items-center"><CheckCircle2 className="mr-2" size={20}/> Correct! Great job.</p>
            )}
            {quizStatus === "incorrect" && (
              <p className="text-rose-400 font-bold flex items-center"><XCircle className="mr-2" size={20}/> Try Again! Check the comparison above.</p>
            )}
          </div>
        </div>

        {/* Scorecard */}
        <div className="bg-slate-800 p-6 rounded-2xl border-2 border-slate-700 text-center w-full md:w-48 shadow-inner shrink-0 flex flex-col items-center justify-center">
          <div className="text-4xl mb-2">🏆</div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Score</p>
          <div className="text-5xl font-black text-white">{score}</div>
          <p className="text-slate-500 text-sm mt-2">Attempts: {attempts}</p>
        </div>
      </div>

      {/* 6. Educational Value Footer */}
      <footer className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
         <h4 className="font-bold text-indigo-900 flex items-center mb-3">
           <Lightbulb className="mr-2 text-indigo-600" size={20} /> What are we learning?
         </h4>
         <ul className="grid md:grid-cols-2 gap-3">
           <li className="flex items-start">
             <span className="text-indigo-500 mr-2 mt-0.5">•</span>
             <span className="text-indigo-800 text-sm"><strong>Comparative Analysis:</strong> Understanding similarities and differences between major world religions.</span>
           </li>
           <li className="flex items-start">
             <span className="text-indigo-500 mr-2 mt-0.5">•</span>
             <span className="text-indigo-800 text-sm"><strong>Cultural Appreciation:</strong> Building tolerance and respect for diverse religious practices and beliefs.</span>
           </li>
           <li className="flex items-start">
             <span className="text-indigo-500 mr-2 mt-0.5">•</span>
             <span className="text-indigo-800 text-sm"><strong>Vocabulary Building:</strong> Learning key terminology associated with different faith traditions.</span>
           </li>
           <li className="flex items-start">
             <span className="text-indigo-500 mr-2 mt-0.5">•</span>
             <span className="text-indigo-800 text-sm"><strong>Information Retrieval:</strong> Practicing how to extract specific information to answer questions.</span>
           </li>
         </ul>
      </footer>

    </div>
  );
}
