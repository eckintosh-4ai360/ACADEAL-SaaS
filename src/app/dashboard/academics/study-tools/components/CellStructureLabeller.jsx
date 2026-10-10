"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, RotateCcw, Info, GripVertical, Dna, ArrowRight, Settings2, ChevronLeft } from "lucide-react";

const ORGANELLES = {
  nucleus: { id: "nucleus", label: "Nucleus", types: ["animal", "plant"], color: "#8b5cf6" },
  membrane: { id: "membrane", label: "Cell Membrane", types: ["animal", "plant"], color: "#ec4899" },
  mitochondria: { id: "mitochondria", label: "Mitochondria", types: ["animal", "plant"], color: "#f97316" },
  cytoplasm: { id: "cytoplasm", label: "Cytoplasm", types: ["animal", "plant"], color: "#0ea5e9" },
  wall: { id: "wall", label: "Cell Wall", types: ["plant"], color: "#22c55e" },
  chloroplast: { id: "chloroplast", label: "Chloroplast", types: ["plant"], color: "#10b981" },
  vacuole: { id: "vacuole", label: "Large Vacuole", types: ["plant"], color: "#3b82f6" },
};

export default function CellStructureLabeller() {
  const [cellType, setCellType] = useState("animal");
  const [draggedItem, setDraggedItem] = useState(null);
  const [placedLabels, setPlacedLabels] = useState({});
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState(null);

  const availableOrganelles = Object.values(ORGANELLES).filter(o => o.types.includes(cellType));
  
  // Unplaced labels are those that haven't been placed correctly yet.
  const unplacedLabels = availableOrganelles.filter(
    (o) => placedLabels[o.id] !== o.id
  );

  useEffect(() => {
    // Reset state when cell type changes
    setPlacedLabels({});
    setAttempts(0);
    setFeedback(null);
  }, [cellType]);

  const handleDragStart = (e, organelleId) => {
    setDraggedItem(organelleId);
    e.dataTransfer.setData("organelleId", organelleId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetZoneId) => {
    e.preventDefault();
    const droppedId = e.dataTransfer.getData("organelleId") || draggedItem;
    
    if (droppedId) {
      // Temporarily place the label
      setPlacedLabels(prev => ({ ...prev, [targetZoneId]: droppedId }));
      setDraggedItem(null);
    }
  };

  const checkAnswers = () => {
    setAttempts(prev => prev + 1);
    
    let allCorrect = true;
    let anyWrong = false;
    
    // Check if every target zone has the correct label
    availableOrganelles.forEach(org => {
      if (placedLabels[org.id] !== org.id && placedLabels[org.id]) {
        anyWrong = true;
      }
      if (placedLabels[org.id] !== org.id) {
        allCorrect = false;
      }
    });

    if (allCorrect) {
      setFeedback({ type: "success", message: "Correct! Every organelle is perfectly placed." });
    } else if (anyWrong) {
      setFeedback({ type: "error", message: "Try again! Some labels are in the wrong spots." });
      setPlacedLabels(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(zone => {
          if (next[zone] !== zone) {
            delete next[zone];
          }
        });
        return next;
      });
    } else {
      setFeedback({ type: "info", message: "Keep going! You still have labels left to place." });
    }
  };

  const resetActivity = () => {
    setPlacedLabels({});
    setAttempts(0);
    setFeedback(null);
  };

  const TargetZone = ({ id, x, y, label }) => {
    const placedItem = placedLabels[id];
    const organelle = placedItem ? ORGANELLES[placedItem] : null;

    return (
      <div 
        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-2"
        style={{ left: `${x}%`, top: `${y}%` }}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, id)}
      >
        <div className={`
          w-4 h-4 rounded-full border-2 bg-white flex-shrink-0 z-10
          ${placedItem ? 'border-teal-500' : 'border-slate-400 border-dashed animate-pulse'}
        `} />
        
        <div className="w-12 h-0.5 bg-slate-300 absolute left-4"></div>
        
        <div className={`
          ml-12 w-36 h-10 rounded-lg flex items-center justify-center text-sm font-semibold shadow-sm transition-all
          ${organelle 
            ? 'bg-white text-slate-800 border-l-4' 
            : 'bg-slate-100/80 border-2 border-dashed border-slate-300 text-slate-400'}
        `}
        style={organelle ? { borderLeftColor: organelle.color } : {}}>
          {organelle ? organelle.label : 'Drop here'}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 bg-slate-50 font-sans min-h-screen">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      <div className="bg-white rounded-2xl p-6 shadow-lg mb-6 flex flex-col md:flex-row justify-between items-start md:items-center border-t-8 border-teal-500">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center text-3xl shadow-inner">
            🔬
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Cell Structure Labeller</h1>
            <p className="text-slate-500 text-sm md:text-base font-medium">Explore and compare plant and animal cells!</p>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3 text-sm font-bold">
          <span className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> JHS 1-3
          </span>
          <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-full flex items-center gap-2">
            ⏱ 18 min
          </span>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6 shadow-sm flex items-start gap-4">
        <Info className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="block text-blue-900 mb-1">How to Play:</strong>
          <p className="text-blue-800 text-sm md:text-base leading-relaxed">
            Drag the organelle labels from the word bank onto the correct empty dotted boxes next to the cell. Use the switch above the cell to compare animal and plant cell structures!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden flex flex-col">
          
          <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-center gap-4">
            <button
              onClick={() => setCellType("animal")}
              className={`px-6 py-3 rounded-full font-bold transition-all ${
                cellType === "animal" 
                  ? "bg-teal-600 text-white shadow-md scale-105" 
                  : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              🐶 Animal Cell
            </button>
            <button
              onClick={() => setCellType("plant")}
              className={`px-6 py-3 rounded-full font-bold transition-all ${
                cellType === "plant" 
                  ? "bg-green-600 text-white shadow-md scale-105" 
                  : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              🌱 Plant Cell
            </button>
          </div>

          <div className="relative flex-1 min-h-[500px] w-full bg-slate-50 flex items-center justify-center p-8 overflow-hidden">
            <div className="relative w-full max-w-[400px] aspect-square transition-all duration-500">
              
              {cellType === "animal" ? (
                <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-xl transition-all duration-300">
                  <path d="M200,40 C300,30 360,100 350,200 C340,300 280,360 200,350 C100,340 40,280 50,180 C60,80 120,50 200,40 Z" 
                        fill="#fce7f3" stroke="#f472b6" strokeWidth="8" />
                  
                  <circle cx="200" cy="180" r="50" fill="#c4b5fd" stroke="#8b5cf6" strokeWidth="6" />
                  <circle cx="210" cy="170" r="15" fill="#8b5cf6" />
                  
                  <g transform="translate(100, 200) rotate(-30)">
                    <ellipse cx="0" cy="0" rx="30" ry="15" fill="#ffedd5" stroke="#f97316" strokeWidth="4" />
                    <path d="M -20,0 Q -10,-10 0,0 T 20,0" fill="none" stroke="#f97316" strokeWidth="3" />
                  </g>
                  <g transform="translate(280, 250) rotate(45)">
                    <ellipse cx="0" cy="0" rx="25" ry="12" fill="#ffedd5" stroke="#f97316" strokeWidth="4" />
                    <path d="M -15,0 Q -5,-8 5,0 T 15,0" fill="none" stroke="#f97316" strokeWidth="3" />
                  </g>
                </svg>
              ) : (
                <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-xl transition-all duration-300">
                  <rect x="50" y="50" width="300" height="300" rx="20" fill="#dcfce7" stroke="#22c55e" strokeWidth="12" />
                  <rect x="60" y="60" width="280" height="280" rx="14" fill="#f0fdf4" stroke="#4ade80" strokeWidth="4" />
                  
                  <path d="M120,100 C220,90 280,120 280,200 C280,280 180,310 130,260 C80,210 80,110 120,100 Z" 
                        fill="#bae6fd" stroke="#38bdf8" strokeWidth="4" opacity="0.8" />
                  
                  <circle cx="300" cy="280" r="40" fill="#c4b5fd" stroke="#8b5cf6" strokeWidth="6" />
                  <circle cx="305" cy="275" r="12" fill="#8b5cf6" />
                  
                  <g transform="translate(100, 300) rotate(20)">
                    <ellipse cx="0" cy="0" rx="25" ry="15" fill="#bbf7d0" stroke="#10b981" strokeWidth="4" />
                    <circle cx="-10" cy="0" r="4" fill="#059669" />
                    <circle cx="0" cy="0" r="4" fill="#059669" />
                    <circle cx="10" cy="0" r="4" fill="#059669" />
                  </g>
                  <g transform="translate(280, 120) rotate(-15)">
                    <ellipse cx="0" cy="0" rx="25" ry="15" fill="#bbf7d0" stroke="#10b981" strokeWidth="4" />
                    <circle cx="-10" cy="0" r="4" fill="#059669" />
                    <circle cx="0" cy="0" r="4" fill="#059669" />
                  </g>
                  
                  <g transform="translate(150, 60) rotate(10)">
                    <ellipse cx="0" cy="0" rx="22" ry="10" fill="#ffedd5" stroke="#f97316" strokeWidth="3" />
                  </g>
                </svg>
              )}

              <div className="absolute inset-0 z-10">
                {cellType === "animal" ? (
                  <>
                    <TargetZone id="membrane" x={15} y={35} label="Cell Membrane" />
                    <TargetZone id="nucleus" x={95} y={45} label="Nucleus" />
                    <TargetZone id="cytoplasm" x={10} y={75} label="Cytoplasm" />
                    <TargetZone id="mitochondria" x={90} y={70} label="Mitochondria" />
                  </>
                ) : (
                  <>
                    <TargetZone id="wall" x={5} y={20} label="Cell Wall" />
                    <TargetZone id="membrane" x={5} y={45} label="Cell Membrane" />
                    <TargetZone id="vacuole" x={5} y={70} label="Large Vacuole" />
                    <TargetZone id="nucleus" x={95} y={75} label="Nucleus" />
                    <TargetZone id="chloroplast" x={95} y={25} label="Chloroplast" />
                    <TargetZone id="mitochondria" x={95} y={50} label="Mitochondria" />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 flex-1 flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Dna className="w-5 h-5 text-indigo-500" /> Label Bank
            </h2>
            
            <div className="flex-1">
              {unplacedLabels.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {unplacedLabels.map(organelle => (
                    <div
                      key={organelle.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, organelle.id)}
                      className="bg-white border-2 border-slate-200 rounded-xl p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-md transition-all group"
                    >
                      <GripVertical className="w-5 h-5 text-slate-400 group-hover:text-indigo-400" />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: organelle.color }}></div>
                      <span className="font-semibold text-slate-700">{organelle.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <CheckCircle2 className="w-12 h-12 text-teal-400 mb-2 opacity-50" />
                  <p className="text-slate-500 font-medium">All labels placed!</p>
                  <p className="text-sm text-slate-400 mt-1">Check your answer below.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl shadow-xl p-5 text-center">
            {feedback && (
              <div className={`
                p-4 rounded-xl mb-4 font-bold flex items-center justify-center gap-2 text-sm md:text-base animate-in slide-in-from-bottom flex-col
                ${feedback.type === "success" ? "bg-green-500 text-white" : 
                  feedback.type === "error" ? "bg-red-500 text-white" : "bg-blue-500 text-white"}
              `}>
                <div className="flex items-center gap-2">
                  {feedback.type === "success" && <CheckCircle2 className="w-5 h-5" />}
                  {feedback.type === "error" && <XCircle className="w-5 h-5" />}
                  {feedback.message}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={checkAnswers}
                className="col-span-2 bg-indigo-500 hover:bg-indigo-400 text-white min-h-[56px] text-lg font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex flex-col items-center justify-center"
              >
                Check My Answer
                <span className="text-xs font-normal text-indigo-100 mt-0.5">Attempt #{attempts + 1}</span>
              </button>
              <button
                onClick={resetActivity}
                className="col-span-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Start Over
              </button>
            </div>
          </div>

        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
           Why are we learning this?
        </h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-600 text-sm md:text-base">
          <li className="flex items-start gap-2">
            <ArrowRight className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
            <span><strong>Identify Parts:</strong> Recognize core organelles like the nucleus, mitochondria, and cell membrane.</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
            <span><strong>Compare Types:</strong> Visually distinguish plant-specific features like the cell wall and chloroplasts.</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
            <span><strong>Spatial Awareness:</strong> Connect biological terms to physical locations within a cell system.</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
            <span><strong>Active Recall:</strong> Drag-and-drop exercises build stronger long-term memory than passive reading.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
