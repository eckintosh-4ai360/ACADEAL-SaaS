"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { 
  Plus, 
  Minus, 
  RotateCcw, 
  Check, 
  ArrowRight, 
  Lightbulb, 
  Move, 
  RefreshCw, 
  FlipHorizontal,
  Grid3X3,
  ChevronLeft
} from "lucide-react";

export default function SymmetryTransformations() {
  const [gridSize] = useState(10); // -10 to 10
  const [shape, setShape] = useState([
    { x: 2, y: 2 },
    { x: 5, y: 2 },
    { x: 2, y: 5 }
  ]);
  const [transformation, setTransformation] = useState(null);
  const [transformedShape, setTransformedShape] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [history, setHistory] = useState([]);

  // Coordinate Conversion (Grid to SVG)
  const cellSize = 30;
  const offset = gridSize * cellSize;
  
  const toSVG = (x, y) => ({
    x: offset + x * cellSize,
    y: offset - y * cellSize
  });

  const renderGrid = useMemo(() => {
    const lines = [];
    for (let i = -gridSize; i <= gridSize; i++) {
      // Vertical lines
      lines.push(
        <line 
          key={`v-${i}`} 
          x1={offset + i * cellSize} 
          y1={0} 
          x2={offset + i * cellSize} 
          y2={offset * 2} 
          stroke={i === 0 ? "#475569" : "#e2e8f0"} 
          strokeWidth={i === 0 ? 2 : 1}
        />
      );
      // Horizontal lines
      lines.push(
        <line 
          key={`h-${i}`} 
          x1={0} 
          y1={offset - i * cellSize} 
          x2={offset * 2} 
          y2={offset - i * cellSize} 
          stroke={i === 0 ? "#475569" : "#e2e8f0"} 
          strokeWidth={i === 0 ? 2 : 1}
        />
      );
    }
    return lines;
  }, [gridSize, offset, cellSize]);

  const applyTransformation = (type, params) => {
    let newShape = [];
    let notation = "";

    switch (type) {
      case "translation":
        newShape = shape.map(p => ({ x: p.x + params.dx, y: p.y + params.dy }));
        notation = `T(${params.dx}, ${params.dy})`;
        break;
      case "reflection":
        if (params.axis === "x") {
          newShape = shape.map(p => ({ x: p.x, y: -p.y }));
          notation = "Reflect over x-axis";
        } else {
          newShape = shape.map(p => ({ x: -p.x, y: p.y }));
          notation = "Reflect over y-axis";
        }
        break;
      case "rotation":
        // 90 deg clockwise: (x, y) -> (y, -x)
        if (params.angle === 90) {
          newShape = shape.map(p => ({ x: p.y, y: -p.x }));
          notation = "Rotate 90° CW";
        } else if (params.angle === 180) {
          newShape = shape.map(p => ({ x: -p.x, y: -p.y }));
          notation = "Rotate 180°";
        } else if (params.angle === 270 || params.angle === -90) {
          newShape = shape.map(p => ({ x: -p.y, y: p.x }));
          notation = "Rotate 90° CCW";
        }
        break;
      default:
        return;
    }

    setTransformedShape(newShape);
    setTransformation({ type, params, notation });
    setFeedback(null);
  };

  const handleApply = () => {
    if (!transformedShape) return;
    setHistory([...history, { shape, transformation }]);
    setShape(transformedShape);
    setTransformedShape(null);
    setTransformation(null);
    setFeedback({ type: "success", title: "Applied!", message: "Transformation added to history." });
  };

  const handleReset = () => {
    setShape([
      { x: 2, y: 2 },
      { x: 5, y: 2 },
      { x: 2, y: 5 }
    ]);
    setTransformedShape(null);
    setTransformation(null);
    setHistory([]);
    setFeedback(null);
  };

  const renderShape = (pts, color, opacity = 1, isDashed = false) => {
    const pathData = pts.map((p, i) => {
      const { x, y } = toSVG(p.x, p.y);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ') + ' Z';

    return (
      <path 
        d={pathData} 
        fill={color} 
        fillOpacity={opacity * 0.3} 
        stroke={color} 
        strokeWidth="3" 
        strokeDasharray={isDashed ? "5,5" : "none"}
      />
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-50 rounded-3xl overflow-hidden shadow-2xl font-sans text-slate-800">
      {/* ── BACK BUTTON ── */}
      <div className="p-4 bg-white border-b border-slate-100 flex items-center">
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
      </div>

      {/* Header section */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-800 p-6 sm:p-8 text-white relative">
        <div className="absolute top-6 right-6 flex gap-2">
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm border border-white/10">JHS 1–3</span>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm border border-white/10 flex items-center gap-1">⏰ 20m</span>
        </div>
        
        <div className="flex items-center gap-4 mb-3">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-white/5">
            🔄
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Symmetry & Transformations</h1>
            <p className="text-purple-200 text-lg font-medium opacity-90">Explore Translation, Rotation, and Reflection!</p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 bg-white grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Grid */}
        <div className="flex flex-col items-center lg:col-span-7 xl:col-span-6">
          <div className="bg-slate-100 p-2 sm:p-4 rounded-3xl border border-slate-200 shadow-inner relative overflow-hidden w-full flex justify-center">
            <svg 
              width="100%" 
              height="auto" 
              viewBox={`0 0 ${offset * 2} ${offset * 2}`}
              className="rounded-xl bg-white shadow-sm max-w-full"
              style={{ maxHeight: "60vh" }}
            >
              {renderGrid}
              {renderShape(shape, "#6366f1")}
              {transformedShape && renderShape(transformedShape, "#ec4899", 0.6, true)}
              
              {/* Origin Point */}
              <circle cx={offset} cy={offset} r="4" fill="#1e293b" />
              
              {/* Coordinate Labels */}
              <text x={offset + 5} y={offset - 5} fontSize="12" fontWeight="bold" fill="#475569">O(0,0)</text>
            </svg>
          </div>
          
          <div className="mt-4 flex gap-4 w-full">
            <div className="flex-1 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
              <p className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Current Coordinates</p>
              <div className="flex gap-2">
                {shape.map((p, i) => (
                  <span key={i} className="text-xs font-mono bg-white px-2 py-1 rounded border border-indigo-200">
                    ({p.x}, {p.y})
                  </span>
                ))}
              </div>
            </div>
            {transformation && (
              <div className="flex-1 bg-pink-50 p-3 rounded-xl border border-pink-100 animate-pulse">
                <p className="text-[10px] uppercase font-bold text-pink-400 mb-1">New Notation</p>
                <span className="text-xs font-mono font-bold text-pink-700">{transformation.notation}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Controls */}
        <div className="flex flex-col gap-6 lg:col-span-5 xl:col-span-6">
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex gap-4 items-start shadow-sm">
            <div className="bg-indigo-500 rounded-full p-2 text-white mt-1 shrink-0">
              <Lightbulb size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 mb-1">How to Use</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Choose a transformation below to see a preview (dashed pink). Click <strong>Apply</strong> to confirm the move and update the shape's position.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Translation Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-indigo-600">
                <Move size={18} />
                <h4 className="font-bold text-sm uppercase tracking-wider">Translation</h4>
              </div>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => applyTransformation("translation", { dx: 1, dy: 0 })} className="py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">Right (+1)</button>
                  <button onClick={() => applyTransformation("translation", { dx: -1, dy: 0 })} className="py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">Left (-1)</button>
                  <button onClick={() => applyTransformation("translation", { dx: 0, dy: 1 })} className="py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">Up (+1)</button>
                  <button onClick={() => applyTransformation("translation", { dx: 0, dy: -1 })} className="py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">Down (-1)</button>
                </div>
              </div>
            </div>

            {/* Reflection Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-emerald-600">
                <FlipHorizontal size={18} />
                <h4 className="font-bold text-sm uppercase tracking-wider">Reflection</h4>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => applyTransformation("reflection", { axis: "x" })} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">Over X-Axis (Vertical)</button>
                <button onClick={() => applyTransformation("reflection", { axis: "y" })} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">Over Y-Axis (Horizontal)</button>
              </div>
            </div>

            {/* Rotation Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-amber-600">
                <RefreshCw size={18} />
                <h4 className="font-bold text-sm uppercase tracking-wider">Rotation</h4>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => applyTransformation("rotation", { angle: 90 })} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">90° Clockwise</button>
                <button onClick={() => applyTransformation("rotation", { angle: 180 })} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">180° Rotation</button>
                <button onClick={() => applyTransformation("rotation", { angle: -90 })} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">90° Anti-Clockwise</button>
              </div>
            </div>

            {/* Summary/History */}
            <div className="bg-slate-900 rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">History</h4>
                <span className="text-[10px] bg-indigo-500 px-1.5 py-0.5 rounded">{history.length} steps</span>
              </div>
              <div className="space-y-1 h-20 overflow-y-auto pr-1 text-[10px] font-mono scrollbar-hide">
                {history.length === 0 ? (
                  <p className="text-slate-500 italic">No transformations yet...</p>
                ) : (
                  history.map((h, i) => (
                    <div key={i} className="flex justify-between border-b border-slate-800 pb-1">
                      <span>Step {i+1}:</span>
                      <span className="text-indigo-400">{h.transformation.notation}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleApply}
              disabled={!transformedShape}
              className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                transformedShape 
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-xl" 
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Check size={20} /> Apply Transformation
            </button>
            <button 
              onClick={handleReset}
              className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl border border-slate-200 active:scale-95 transition-all"
            >
              <RotateCcw size={20} />
            </button>
          </div>

          {feedback && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
              <Check className="text-emerald-600" size={18} />
              <p className="text-emerald-800 text-xs font-medium">{feedback.message}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-100/50 p-6 sm:p-8 border-t border-slate-200">
        <h4 className="font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200/80">🧠 What students are learning:</h4>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 text-sm font-medium">
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 shrink-0 mt-0.5">•</span>
            <span><strong>Coordinate Geometry:</strong> Mapping (x, y) coordinates to visual positions on a grid.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 shrink-0 mt-0.5">•</span>
            <span><strong>Logical Transformations:</strong> Understanding how mathematical rules change shape orientations.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 shrink-0 mt-0.5">•</span>
            <span><strong>Mapping Notation:</strong> Learning the notation like (x,y) → (x+a, y+b) for translations.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 shrink-0 mt-0.5">•</span>
            <span><strong>Symmetry Principles:</strong> Visualizing line symmetry and rotational symmetry interactively.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
