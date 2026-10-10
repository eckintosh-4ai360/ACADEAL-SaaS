import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Ruler, 
  RotateCcw, 
  Target, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  ChevronRight,
  Scale,
  Droplets,
  ArrowRightLeft,
  Timer,
  ChevronLeft
} from "lucide-react";

export default function MeasurementConversionStation() {
  const [measurementType, setMeasurementType] = useState("length"); // length, mass, capacity
  const [value, setValue] = useState(1);
  const [gameMode, setGameMode] = useState(false);
  const [targetValue, setTargetValue] = useState(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState(null);

  const units = useMemo(() => ({
    length: [
      { id: "cm", label: "Centimetres (cm)", factor: 100000 },
      { id: "m", label: "Metres (m)", factor: 1000 },
      { id: "km", label: "Kilometres (km)", factor: 1 }
    ],
    mass: [
      { id: "g", label: "Grams (g)", factor: 1000 },
      { id: "kg", label: "Kilograms (kg)", factor: 1 }
    ],
    capacity: [
      { id: "ml", label: "Millilitres (ml)", factor: 1000 },
      { id: "l", label: "Litres (l)", factor: 1 }
    ]
  }), []);

  const currentUnits = units[measurementType];
  const baseUnit = currentUnits[currentUnits.length - 1]; // km, kg, or l

  const conversions = useMemo(() => {
    return currentUnits.map(unit => {
      const convertedValue = (value * (baseUnit.factor / unit.factor));
      return {
        ...unit,
        value: convertedValue.toLocaleString(undefined, { maximumFractionDigits: 3 })
      };
    });
  }, [value, currentUnits, baseUnit]);

  const generateChallenge = useCallback(() => {
    const randomUnitIdx = Math.floor(Math.random() * currentUnits.length);
    const randomUnit = currentUnits[randomUnitIdx];
    const randomValue = (Math.random() * 5 + 0.5).toFixed(1);
    
    setTargetValue({
      unit: randomUnit,
      val: parseFloat(randomValue),
      displayVal: (parseFloat(randomValue) * (baseUnit.factor / randomUnit.factor)).toLocaleString(undefined, { maximumFractionDigits: 3 })
    });
    setFeedback(null);
  }, [currentUnits, baseUnit]);

  const toggleMode = () => {
    if (!gameMode) {
      generateChallenge();
    }
    setGameMode(!gameMode);
    setFeedback(null);
  };

  const checkResult = () => {
    setAttempts(prev => prev + 1);
    const currentBaseValue = value;
    const targetBaseValue = targetValue.val;
    
    // Check if values match (using base unit for comparison)
    if (Math.abs(currentBaseValue - targetBaseValue) < 0.01) {
      setFeedback("correct");
      setScore(prev => prev + 10);
    } else {
      setFeedback("incorrect");
    }
  };

  const reset = () => {
    setValue(1);
    setScore(0);
    setAttempts(0);
    setFeedback(null);
    if (gameMode) generateChallenge();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-indigo-50/20 min-h-screen font-sans text-slate-800">
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
          <div className="bg-indigo-100 p-4 rounded-2xl">
            <ArrowRightLeft className="text-indigo-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Measurement Conversion Station</h1>
            <p className="text-slate-500 font-medium">Master Length, Mass, and Capacity conversions</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm">
            Primary 4–6
          </span>
          <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm flex items-center gap-1">
            <Timer size={16} /> 12 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* 2. "How to Use" box */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <BookOpen className="text-indigo-500" size={18} /> How to Use
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Select a measurement type, then move the slider to see how units change. In Challenge mode, try to match the target value!
            </p>
          </section>

          {/* 3. Interactive Control Zone */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex flex-col gap-4 mb-6">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Type</h3>
               <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => { setMeasurementType("length"); reset(); }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${measurementType === 'length' ? 'bg-indigo-500 text-white border-indigo-600 shadow-md' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'}`}
                  >
                    <Ruler size={20} />
                    <span className="text-[10px] font-bold uppercase">Length</span>
                  </button>
                  <button 
                    onClick={() => { setMeasurementType("mass"); reset(); }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${measurementType === 'mass' ? 'bg-indigo-500 text-white border-indigo-600 shadow-md' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'}`}
                  >
                    <Scale size={20} />
                    <span className="text-[10px] font-bold uppercase">Mass</span>
                  </button>
                  <button 
                    onClick={() => { setMeasurementType("capacity"); reset(); }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${measurementType === 'capacity' ? 'bg-indigo-500 text-white border-indigo-600 shadow-md' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'}`}
                  >
                    <Droplets size={20} />
                    <span className="text-[10px] font-bold uppercase">Capacity</span>
                  </button>
               </div>
            </div>

            <div className="space-y-4">
               <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Adjust {baseUnit.label}</span>
                  <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-lg">
                    {value.toFixed(2)} {baseUnit.id}
                  </span>
               </div>
               <input 
                type="range" min="0" max="10" step="0.01" value={value} 
                onChange={(e) => setValue(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
               />
               <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>0 {baseUnit.id}</span>
                  <span>10 {baseUnit.id}</span>
               </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button 
                onClick={reset}
                className="flex-1 py-3 rounded-xl border-2 border-slate-50 text-slate-400 hover:bg-slate-50 transition-all font-bold text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} /> Reset
              </button>
              <button 
                onClick={toggleMode}
                className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${gameMode ? 'bg-orange-100 text-orange-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                {gameMode ? <RotateCcw size={16} /> : <Target size={16} />}
                {gameMode ? 'Exit Quiz' : 'Try Quiz'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mt-auto">
             <div className="flex items-center gap-4">
                <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-400">
                   <Target size={24} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conversion Fact</p>
                   <p className="text-sm font-bold text-slate-600">
                    {measurementType === 'length' ? '1 km = 1,000 m = 100,000 cm' : measurementType === 'mass' ? '1 kg = 1,000 g' : '1 l = 1,000 ml'}
                   </p>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Visual Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* 4. Live Visual Output Area */}
          <div className="bg-white rounded-[3rem] shadow-xl border-8 border-slate-50 p-8 flex flex-col items-center min-h-[500px]">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-10">Unit Comparison Bars</h3>
            
            <div className="w-full space-y-12">
              {conversions.reverse().map((unit) => (
                <div key={unit.id} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="font-black text-slate-700">{unit.label}</span>
                    <span className={`text-2xl font-black ${unit.id === baseUnit.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {unit.value} {unit.id}
                    </span>
                  </div>
                  <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div 
                      className={`h-full transition-all duration-300 ${unit.id === baseUnit.id ? 'bg-indigo-500' : 'bg-indigo-300 opacity-60'}`}
                      style={{ width: `${(parseFloat(unit.value.replace(/,/g, '')) / (10 * (baseUnit.factor / unit.factor))) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Scale illustration for context */}
            <div className="mt-auto pt-10 flex items-center gap-6 text-slate-400">
               <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-1 bg-slate-100 rounded-full" />
                  <span className="text-[10px] font-bold">Small Scale</span>
               </div>
               <ChevronRight className="opacity-20" />
               <div className="flex flex-col items-center gap-3">
                  <ArrowRightLeft className="text-indigo-200" size={32} />
               </div>
               <ChevronRight className="opacity-20" />
               <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-2 bg-slate-200 rounded-full" />
                  <span className="text-[10px] font-bold">Large Scale</span>
               </div>
            </div>
          </div>

          {/* 5. Score / Feedback Panel */}
          {gameMode && (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-indigo-200 animate-in slide-in-from-bottom-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Target Measurement</p>
                  <p className="text-3xl font-black text-slate-800">
                    Set the bar to match <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-4">{targetValue?.displayVal} {targetValue?.unit.id}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {feedback === 'correct' ? (
                     <div className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl flex items-center gap-3 border border-emerald-100 animate-in zoom-in">
                        <Award size={32} />
                        <div>
                           <span className="font-bold block">Correct! ✅</span>
                           <button onClick={generateChallenge} className="text-xs underline hover:text-emerald-900 font-bold">Try Next</button>
                        </div>
                     </div>
                  ) : (
                     <button 
                       onClick={checkResult}
                       className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
                     >
                       Check Answer
                     </button>
                  )}
                </div>
              </div>

              {feedback === 'incorrect' && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl text-center text-sm font-bold animate-in fade-in">
                  ❌ Not quite! Current value is {value.toFixed(2)} {baseUnit.id}. Keep adjusting!
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between text-xs font-black text-slate-400 tracking-widest uppercase">
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
          <BookOpen className="text-indigo-600" size={24} />
          Educational Benefits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-indigo-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Understand the <strong>multiplicative relationship</strong> (x1000) between metric units.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-blue-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Visualise <strong>scale differences</strong> using proportional comparison bars.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-emerald-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Practise <strong>mental conversion</strong> of real-world measurements.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-orange-400 mt-1 shrink-0" />
            <p className="text-slate-600 text-sm">Build <strong>estimation skills</strong> by matching target metric volumes and weights.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
