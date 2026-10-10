import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Coins, 
  Banknote, 
  Plus, 
  Minus, 
  Trash2, 
  RefreshCcw, 
  CheckCircle2, 
  AlertCircle,
  Award,
  BookOpen,
  ArrowRight,
  ChevronLeft
} from "lucide-react";

const DENOMINATIONS = [
  { id: "p1", value: 0.01, label: "1p", type: "coin", color: "bg-orange-200", textColor: "text-orange-800", emoji: "🟠" },
  { id: "p5", value: 0.05, label: "5p", type: "coin", color: "bg-slate-200", textColor: "text-slate-800", emoji: "⚪" },
  { id: "p10", value: 0.10, label: "10p", type: "coin", color: "bg-yellow-200", textColor: "text-yellow-800", emoji: "🟡" },
  { id: "p20", value: 0.20, label: "20p", type: "coin", color: "bg-slate-300", textColor: "text-slate-900", emoji: "🔘" },
  { id: "p50", value: 0.50, label: "50p", type: "coin", color: "bg-yellow-100", textColor: "text-yellow-700", emoji: "🧭" },
  { id: "c1", value: 1.00, label: "GH₵1", type: "coin", color: "bg-yellow-500", textColor: "text-white", emoji: "🪙" },
  { id: "c2", value: 2.00, label: "GH₵2", type: "note", color: "bg-orange-500", textColor: "text-white", emoji: "💵" },
  { id: "c5", value: 5.00, label: "GH₵5", type: "note", color: "bg-blue-500", textColor: "text-white", emoji: "💶" },
  { id: "c10", value: 10.00, label: "GH₵10", type: "note", color: "bg-yellow-600", textColor: "text-white", emoji: "💷" },
  { id: "c20", value: 20.00, label: "GH₵20", type: "note", color: "bg-purple-600", textColor: "text-white", emoji: "💰" },
  { id: "c50", value: 50.00, label: "GH₵50", type: "note", color: "bg-cyan-600", textColor: "text-white", emoji: "🏦" },
  { id: "c100", value: 100.00, label: "GH₵100", type: "note", color: "bg-emerald-600", textColor: "text-white", emoji: "🏛️" },
  { id: "c200", value: 200.00, label: "GH₵200", type: "note", color: "bg-amber-600", textColor: "text-white", emoji: "💎" },
];

export default function GhanaCedisPesewasCounter() {
  const [wallet, setWallet] = useState([]);
  const [challenge, setChallenge] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const total = useMemo(() => {
    return wallet.reduce((sum, item) => sum + item.value, 0);
  }, [wallet]);

  const addMoney = (denom) => {
    setWallet(prev => [...prev, { ...denom, instanceId: Date.now() + Math.random() }]);
    setFeedback(null);
  };

  const removeMoney = (instanceId) => {
    setWallet(prev => prev.filter(item => item.instanceId !== instanceId));
    setFeedback(null);
  };

  const clearWallet = () => {
    setWallet([]);
    setFeedback(null);
  };

  const generateChallenge = useCallback(() => {
    const amounts = [0.50, 1.00, 2.50, 5.75, 10.20, 15.50, 20.00, 50.00, 7.35, 12.80];
    const target = amounts[Math.floor(Math.random() * amounts.length)];
    setChallenge(target);
    setWallet([]);
    setFeedback(null);
    setAttempts(0);
  }, []);

  const checkAnswer = () => {
    setAttempts(prev => prev + 1);
    const diff = Math.abs(total - challenge);
    if (diff < 0.001) {
      setFeedback("correct");
    } else {
      setFeedback("incorrect");
    }
  };

  const formatCurrency = (amount) => {
    return `GH₵ ${amount.toFixed(2)}`;
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
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
          <div className="bg-yellow-100 p-4 rounded-2xl">
            <span className="text-4xl">💰</span>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Cedis & Pesewas Counter</h1>
            <p className="text-slate-500 font-medium">Practice counting Ghanaian money</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold border border-blue-200 shadow-sm">
            Primary 1–3
          </span>
          <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-bold border border-emerald-200 shadow-sm flex items-center gap-1">
            <Coins size={16} /> 12 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* 2. How to Use Box */}
          <section className="bg-blue-50 border-l-4 border-blue-400 p-5 rounded-r-2xl shadow-sm">
            <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <Banknote size={18} /> How to Use
            </h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              Tap the notes and coins to add them to your collection. Try to match the challenge amount precisely!
            </p>
          </section>

          {/* 3. Interactive Control Zone (Denominations) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Select Money</h3>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="col-span-2">
                <span className="text-xs font-bold text-slate-400 block mb-2">Notes</span>
                <div className="grid grid-cols-3 gap-2">
                  {DENOMINATIONS.filter(d => d.type === "note").map(denom => (
                    <button
                      key={denom.id}
                      onClick={() => addMoney(denom)}
                      className={`${denom.color} ${denom.textColor} p-2 rounded-xl text-xs font-black shadow-sm hover:scale-105 transition-transform flex flex-col items-center justify-center min-h-[60px]`}
                    >
                      <span>{denom.emoji}</span>
                      <span>{denom.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2 mt-4">
                <span className="text-xs font-bold text-slate-400 block mb-2">Coins</span>
                <div className="grid grid-cols-3 gap-2">
                  {DENOMINATIONS.filter(d => d.type === "coin").map(denom => (
                    <button
                      key={denom.id}
                      onClick={() => addMoney(denom)}
                      className={`${denom.color} ${denom.textColor} p-2 rounded-full text-[10px] font-black shadow-sm hover:scale-110 transition-transform flex flex-col items-center justify-center aspect-square border-2 border-slate-300/20`}
                    >
                      <span>{denom.emoji}</span>
                      <span>{denom.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={clearWallet}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
            >
              <RefreshCcw size={16} /> Reset Workspace
            </button>
          </div>
        </div>

        {/* Right Column: Visual Workspace and Feedback */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* 4. Live Visual Output Area (Workspace) */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex-grow relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">Your Collection</h3>
                <p className="text-sm text-slate-400">Tap an item to remove it</p>
              </div>
              <div className="bg-slate-900 text-emerald-400 px-6 py-3 rounded-2xl border-4 border-slate-800 shadow-inner text-right">
                <span className="text-xs font-bold block opacity-50 uppercase tracking-widest">Total Value</span>
                <span className="text-3xl font-mono font-black">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Visual Canvas */}
            <div className="flex-grow bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-6 overflow-y-auto max-h-[400px]">
              {wallet.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                  <Coins size={64} />
                  <p className="font-bold">Workspace is empty. Add some money!</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-4 items-start content-start">
                  {wallet.map((item) => (
                    <button
                      key={item.instanceId}
                      onClick={() => removeMoney(item.instanceId)}
                      className={`relative group animate-in fade-in zoom-in-95 duration-300`}
                    >
                      <div className={`${item.color} ${item.textColor} ${item.type === 'note' ? 'w-24 h-14 rounded-lg' : 'w-14 h-14 rounded-full'} flex flex-col items-center justify-center font-black shadow-md border-2 border-white/20 transition-transform group-hover:scale-105`}>
                        <span className="text-lg">{item.emoji}</span>
                        <span className="text-[10px]">{item.label}</span>
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <Minus size={12} strokeWidth={4} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {challenge && (
              <div className="mt-6 flex flex-col items-center gap-4">
                <div className="bg-orange-500 text-white p-6 rounded-3xl w-full flex items-center justify-between shadow-lg shadow-orange-200">
                  <div>
                    <span className="text-orange-100 font-bold text-xs uppercase tracking-widest">Target amount</span>
                    <h4 className="text-3xl font-black">{formatCurrency(challenge)}</h4>
                  </div>
                  <Award size={48} className="opacity-30" />
                </div>

                {/* 5. Score / Feedback Panel */}
                <div className="w-full">
                  {!feedback ? (
                    <button
                      onClick={checkAnswer}
                      className="w-full bg-slate-900 text-white py-5 rounded-3xl font-bold text-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 group"
                    >
                      Check My Answer
                      <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {feedback === "correct" ? (
                        <div className="bg-emerald-50 border-2 border-emerald-500 p-6 rounded-3xl text-center">
                          <div className="inline-block bg-emerald-500 text-white p-3 rounded-full mb-3">
                            <CheckCircle2 size={32} />
                          </div>
                          <h4 className="text-emerald-900 font-black text-2xl mb-1">Excellent! ✅</h4>
                          <p className="text-emerald-700 font-medium mb-4">You built {formatCurrency(challenge)} perfectly!</p>
                          <button
                            onClick={generateChallenge}
                            className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-emerald-700 shadow-md transition-all"
                          >
                            New Challenge
                          </button>
                        </div>
                      ) : (
                        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl text-center">
                          <div className="inline-block bg-red-100 text-red-600 p-3 rounded-full mb-3">
                            <AlertCircle size={32} />
                          </div>
                          <h4 className="text-red-900 font-black text-2xl mb-1">Not quite! ❌</h4>
                          <p className="text-red-700 font-medium mb-4">
                            You have {formatCurrency(total)}. {total < challenge ? `You need ${formatCurrency(challenge - total)} more.` : `You have ${formatCurrency(total - challenge)} too much.`}
                          </p>
                          <button
                            onClick={() => setFeedback(null)}
                            className="bg-slate-200 text-slate-700 px-8 py-3 rounded-2xl font-bold hover:bg-slate-300 transition-all font-inter"
                          >
                            Try Again
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!challenge && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={generateChallenge}
                  className="bg-orange-500 text-white px-12 py-5 rounded-3xl font-black text-xl hover:bg-orange-600 shadow-xl shadow-orange-100 transition-all flex items-center gap-3"
                >
                  <Award size={24} />
                  Start Counting Challenge
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-emerald-600" size={24} />
          Educational Benefits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-blue-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Recognize all <strong>current GHS denominations</strong> (coins and notes).</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Practice <strong>decimal addition</strong> through currency accumulation.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-orange-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Understand <strong>real-world value</strong> of items by building exact amounts.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-purple-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Develop <strong>mental math speed</strong> for calculating change needed.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
