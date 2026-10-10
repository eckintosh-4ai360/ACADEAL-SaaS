import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FAMILY_MEMBERS = [
  { id: "grandpa", emoji: "👴", name: "Grandpa", color: "#6366f1", fact: "Grandpa is your parent's father." },
  { id: "grandma", emoji: "👵", name: "Grandma", color: "#ec4899", fact: "Grandma is your parent's mother." },
  { id: "dad",     emoji: "👨", name: "Dad",     color: "#3b82f6", fact: "Dad is your father." },
  { id: "mum",     emoji: "👩", name: "Mum",     color: "#e879f9", fact: "Mum is your mother." },
  { id: "uncle",   emoji: "👨‍🦱", name: "Uncle",   color: "#0ea5e9", fact: "Uncle is your parent's brother." },
  { id: "aunt",    emoji: "👩‍🦱", name: "Aunt",    color: "#f43f5e", fact: "Aunt is your parent's sister." },
  { id: "brother", emoji: "👦", name: "Brother", color: "#10b981", fact: "A brother is a boy with the same parents as you." },
  { id: "sister",  emoji: "👧", name: "Sister",  color: "#f59e0b", fact: "A sister is a girl with the same parents as you." },
  { id: "me",      emoji: "🧒", name: "Me",      color: "#8b5cf6", fact: "This is you in the family tree!" },
  { id: "cousin",  emoji: "👶", name: "Cousin",  color: "#14b8a6", fact: "A cousin is your aunt or uncle's child." },
];

const TREE_SLOTS = [
  { id: "slot1", label: "Grandparents", allowed: ["grandpa", "grandma"], x: 150, y: 50 },
  { id: "slot2", label: "Grandparents", allowed: ["grandpa", "grandma"], x: 250, y: 50 },
  { id: "slot3", label: "Parents",      allowed: ["dad", "mum", "uncle", "aunt"], x: 120, y: 140 },
  { id: "slot4", label: "Parents",      allowed: ["dad", "mum", "uncle", "aunt"], x: 200, y: 140 },
  { id: "slot5", label: "Aunts/Uncles", allowed: ["uncle", "aunt"], x: 280, y: 140 },
  { id: "slot6", label: "Kids",         allowed: ["brother", "sister", "me"], x: 100, y: 230 },
  { id: "slot7", label: "Kids",         allowed: ["brother", "sister", "me"], x: 160, y: 230 },
  { id: "slot8", label: "Cousins",      allowed: ["cousin"], x: 280, y: 230 },
];

// ─── SVG Tree ───────────────────────────────────────────────────────────────

function FamilyTreeSVG({ slots, placedMembers, activeSlotId, onDrop, onSlotClick }) {
  // Center of slots
  const cx = 200;

  return (
    <svg viewBox="0 0 400 320" className="w-full h-full select-none" style={{ minHeight: "280px" }}>
      {/* ── Background Tree Shape ── */}
      {/* Trunk */}
      <path d="M 180 320 Q 190 200 200 150 Q 210 200 220 320 Z" fill="#8B4513" />
      {/* Leaves Group - Enlarged with circles to keep drops inside the green area */}
      <circle cx="200" cy="140" r="145" fill="#22c55e" opacity="0.9" />
      <circle cx="120" cy="150" r="90" fill="#4ade80" opacity="0.8" />
      <circle cx="280" cy="150" r="90" fill="#4ade80" opacity="0.8" />
      <circle cx="200" cy="220" r="90" fill="#4ade80" opacity="0.8" />
      <circle cx="200" cy="70" r="90" fill="#4ade80" opacity="0.8" />

      {/* ── Connecting Lines (Branches) ── */}
      <g stroke="#78350f" strokeWidth="3" opacity="0.6" strokeLinecap="round">
        {/* Grandparents to Parents */}
        <line x1={200} y1={50} x2={160} y2={140} />
        <line x1={200} y1={50} x2={280} y2={140} />
        {/* Parents to Kids */}
        <line x1={160} y1={140} x2={130} y2={230} />
        {/* Aunts/Uncles to Cousins */}
        <line x1={280} y1={140} x2={280} y2={230} />
      </g>

      {/* ── Slots ── */}
      {slots.map(slot => {
        const member = placedMembers[slot.id];
        const isActive = activeSlotId === slot.id;
        
        return (
          <g key={slot.id} transform={`translate(${slot.x}, ${slot.y})`} 
             onClick={() => onSlotClick(slot.id)}
             className="cursor-pointer group hover:opacity-90 transition-opacity duration-300"
          >
            {/* Slot background */}
            <circle cx="0" cy="0" r="28" fill={member ? "white" : "#e2e8f0"} stroke={isActive ? "#fbbf24" : member ? member.color : "#94a3b8"} strokeWidth={isActive ? "4" : "2"} className={isActive ? "animate-pulse" : ""} />
            
            {member ? (
              // Placed Member
              <>
                <text x="0" y="8" textAnchor="middle" fontSize="30">{member.emoji}</text>
                {/* Small name tag */}
                <rect x="-24" y="32" width="48" height="14" rx="4" fill="white" stroke={member.color} strokeWidth="1" />
                <text x="0" y="42" textAnchor="middle" fontSize="9" fontWeight="bold" fill={member.color}>{member.name}</text>
              </>
            ) : (
              // Empty Slot
              <>
                <text x="0" y="4" textAnchor="middle" fontSize="12" fill="#94a3b8" fontWeight="bold">Drop</text>
                <text x="0" y="42" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white" className="drop-shadow-md">{slot.label}</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────

export default function MyFamilyTree() {
  const [placedMembers, setPlacedMembers] = useState({}); // { slotId: memberObj }
  const [selectedMember, setSelectedMember] = useState(null);
  const [activeSlotId, setActiveSlotId] = useState(null);
  
  const [mode, setMode] = useState("explore"); // "explore" | "quiz"
  const [quizTask, setQuizTask] = useState(null); // the member they need to place
  const [feedback, setFeedback] = useState(null);

  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);

  // Available members are those not yet placed
  const availableMembers = useMemo(() => {
    const placedIds = Object.values(placedMembers).map(m => m.id);
    return FAMILY_MEMBERS.filter(m => !placedIds.includes(m.id));
  }, [placedMembers]);

  // Actions
  const handleMemberClick = useCallback((member) => {
    setSelectedMember(member);
    setActiveSlotId(null);
    setFeedback(null);
  }, []);

  const handleSlotClick = useCallback((slotId) => {
    // If we have a selected member, try to place them
    if (selectedMember) {
      if (mode === "quiz" && quizTask) {
        setAttempts(a => a + 1);
        if (selectedMember.id !== quizTask.id) {
           setFeedback("wrong_person");
           setSelectedMember(null);
           return;
        }
      }

      const slot = TREE_SLOTS.find(s => s.id === slotId);
      if (slot.allowed.includes(selectedMember.id) || selectedMember.id === "me") {
        // Valid placement!
        setPlacedMembers(prev => ({ ...prev, [slotId]: selectedMember }));
        setSelectedMember(null);
        
        if (mode === "quiz") {
          setScore(s => s + 1);
          setFeedback("correct");
        } else {
          setFeedback("placed");
        }
      } else {
        // Invalid slot for this member type
        setFeedback("wrong_slot");
        if (mode === "quiz") setAttempts(a => a + 1);
      }
    } else {
      // If we didn't select a member first from the bank, but clicked a filled slot: remove them
      if (placedMembers[slotId]) {
        setPlacedMembers(prev => {
          const next = { ...prev };
          delete next[slotId];
          return next;
        });
        setFeedback(null);
      } else {
        // Highlight slot to hint they should click a member next
        setActiveSlotId(slotId);
      }
    }
  }, [selectedMember, mode, quizTask, placedMembers]);


  // Quiz Logic
  const startQuiz = useCallback(() => {
    setPlacedMembers({});
    setSelectedMember(null);
    setActiveSlotId(null);
    setFeedback(null);
    
    // Pick a random member to find
    const member = FAMILY_MEMBERS[Math.floor(Math.random() * FAMILY_MEMBERS.length)];
    setQuizTask(member);
    setMode("quiz");
  }, []);

  const fullReset = useCallback(() => {
    setPlacedMembers({});
    setSelectedMember(null);
    setActiveSlotId(null);
    setMode("explore");
    setQuizTask(null);
    setFeedback(null);
    setScore(0);
    setAttempts(0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-orange-50 p-3 sm:p-6 font-sans">
      {/* ── BACK BUTTON ── */}
      <div className="max-w-4xl mx-auto mb-4">
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
      </div>

      <div className="max-w-4xl mx-auto space-y-4">

        {/* ── HEADER ── */}
        <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <span className="text-5xl">👨‍👩‍👧</span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">KG 1–2</span>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">⏱ 8 min</span>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-100">🌍 Our World & People</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-800">My Family Tree</h1>
            <p className="text-sm text-gray-500 mt-0.5">Build a family tree by moving people to their correct spots!</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <div className="text-center bg-green-50 border border-green-200 rounded-xl px-4 py-2">
              <p className="text-[10px] text-green-600 font-semibold uppercase">Score</p>
              <p className="text-2xl font-black text-green-700">{score}</p>
            </div>
            <div className="text-center bg-orange-50 border border-orange-200 rounded-xl px-4 py-2">
              <p className="text-[10px] text-orange-600 font-semibold uppercase">Tries</p>
              <p className="text-2xl font-black text-orange-700">{attempts}</p>
            </div>
          </div>
        </div>

        {/* ── HOW TO USE ── */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-bold text-orange-800 mb-1">👋 How to Play</p>
          <ul className="text-sm text-orange-900 space-y-1">
            <li>👆 <strong>Tap a family member</strong> from the list below.</li>
            <li>🌳 Then <strong>tap a white circle on the tree</strong> to move them there!</li>
            <li>💡 Grandparents go at the top, parents in the middle, and kids at the bottom.</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* ── LEFT: Tree Visual Area ── */}
          <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col relative overflow-hidden">
            {/* Background clouds */}
            <div className="absolute top-4 left-4 text-4xl opacity-50">☁️</div>
            <div className="absolute top-12 right-8 text-3xl opacity-50">☁️</div>
            
            <div className="flex-1 flex items-center justify-center relative z-10 w-full max-w-sm mx-auto">
              <FamilyTreeSVG 
                slots={TREE_SLOTS} 
                placedMembers={placedMembers} 
                activeSlotId={activeSlotId}
                onSlotClick={handleSlotClick} 
              />
            </div>
            
            {/* Context Feedback */}
            <div className="absolute bottom-5 left-0 right-0 flex justify-center pointer-events-none">
              {feedback === "placed" && (
                <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold shadow-md animate-bounce border border-green-300 text-sm">
                  ✨ Excellent!
                </div>
              )}
              {feedback === "wrong_slot" && (
                <div className="bg-red-100 text-red-700 px-4 py-2 rounded-full font-bold shadow-md animate-pulse border border-red-300 text-sm">
                  🤔 Try a different spot!
                </div>
              )}
              {feedback === "wrong_person" && (
                <div className="bg-red-100 text-red-700 px-4 py-2 rounded-full font-bold shadow-md animate-pulse border border-red-300 text-sm">
                  ❌ We are looking for {quizTask?.name}!
                </div>
              )}
              {feedback === "correct" && (
                <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold shadow-md animate-bounce border border-green-300 text-sm">
                  🎉 You found them!
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Controls & Quiz Area ── */}
          <div className="flex flex-col gap-4">
            
            {/* Family Members Bank */}
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Family Members</p>
                <p className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-md">{availableMembers.length} left</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {availableMembers.map(m => (
                  <button key={`bank-${m.id}`} 
                    onClick={() => handleMemberClick(m)}
                    style={{ 
                      backgroundColor: selectedMember?.id === m.id ? m.color : "#f8fafc", 
                      color: selectedMember?.id === m.id ? "white" : "#475569",
                      borderColor: selectedMember?.id === m.id ? m.color : "#e2e8f0" 
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all active:scale-95 shadow-sm"
                  >
                    <span className="text-3xl mb-1">{m.emoji}</span>
                    <span className="text-sm font-bold">{m.name}</span>
                  </button>
                ))}
                {availableMembers.length === 0 && (
                  <div className="col-span-2 py-8 text-center text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded-xl">
                    Everyone is on the tree! 🌳
                  </div>
                )}
              </div>
            </div>

            {/* Selected Member Fact (Explore Mode) */}
            {mode === "explore" && selectedMember && (
              <div className="bg-white rounded-2xl shadow-lg border-2 p-4 flex gap-4 items-center animate-in slide-in-from-bottom-2" style={{ borderColor: selectedMember.color }}>
                <span className="text-4xl">{selectedMember.emoji}</span>
                <div>
                  <p className="font-black text-lg" style={{ color: selectedMember.color }}>{selectedMember.name}</p>
                  <p className="text-sm text-gray-600 leading-tight">{selectedMember.fact}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 animate-pulse">Tap a spot on the tree 👆</p>
                </div>
              </div>
            )}

            {/* Quiz Panel */}
            <div className="bg-white rounded-2xl shadow-lg p-5 flex-1 flex flex-col justify-center text-center">
              {mode === "explore" ? (
                <div className="py-2">
                  <p className="text-4xl mb-3">❓</p>
                  <button onClick={startQuiz} className="w-full h-14 rounded-xl bg-purple-500 text-white font-bold text-lg hover:bg-purple-600 shadow-md active:scale-95 transition-all">
                    🎯 Who is Who? (Quiz)
                  </button>
                </div>
              ) : (
                <div className="flex flex-col h-full space-y-3">
                  <p className="text-xs font-bold text-purple-500 uppercase tracking-wide border-b border-purple-100 pb-2">Your Mission</p>
                  
                  <div className="flex-1 flex flex-col justify-center items-center py-2">
                    <p className="text-4xl mb-2">{quizTask?.emoji}</p>
                    <p className="text-xl font-black text-purple-900">Where does <span className="underline decoration-wavy">{quizTask?.name}</span> go?</p>
                    <p className="text-sm text-purple-700 mt-2 bg-purple-50 px-3 py-1 rounded-full">{quizTask?.fact}</p>
                  </div>

                  {feedback === "correct" ? (
                    <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                      <button onClick={() => { setMode("explore"); setFeedback(null); }} className="h-12 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold hover:bg-gray-100 transition-colors">
                        End Quiz
                      </button>
                      <button onClick={startQuiz} className="h-12 rounded-xl bg-purple-500 text-white text-sm font-bold hover:bg-purple-600 transition-colors shadow-sm">
                        Next Person ➡️
                      </button>
                    </div>
                  ) : (
                    <div className="mt-auto pt-2">
                      <button onClick={() => { setMode("explore"); setFeedback(null); }} className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold hover:bg-gray-100 transition-colors">
                        Cancel Quiz
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* ── EDUCATIONAL FOOTER ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">📘 Learning Benefits</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Teaches basic family structure and generations</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Builds vocabulary for family descriptions (uncle, aunt, cousin)</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Develops spatial reasoning by placing cards in correct tiers</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✔</span> Interactive validation reinforces correct relationships</li>
          </ul>
        </div>
        
        <button onClick={fullReset} className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-xs font-semibold hover:bg-gray-100 transition-colors">
          🔄 Start Over (Clear Tree)
        </button>

      </div>
    </div>
  );
}
