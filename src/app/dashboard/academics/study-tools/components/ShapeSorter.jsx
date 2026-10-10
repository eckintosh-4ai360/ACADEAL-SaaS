"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, RotateCcw, Star, XCircle, Info, Clock, PlayCircle, ChevronLeft } from "lucide-react";

export default function ShapeSorter() {
  const [shapes] = useState([
    { id: "circle", name: "Circle", color: "#FF6B6B", corners: 0, points: null },
    { id: "square", name: "Square", color: "#4D96FF", corners: 4, points: "20,20 80,20 80,80 20,80" },
    { id: "triangle", name: "Triangle", color: "#FFD93D", corners: 3, points: "50,15 90,85 10,85" },
    { id: "rectangle", name: "Rectangle", color: "#6BCB77", corners: 4, points: "10,25 90,25 90,75 10,75" }
  ]);

  const [placements, setPlacements] = useState({
    circle: null,
    square: null,
    triangle: null,
    rectangle: null
  });

  const [selectedShape, setSelectedShape] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [bankOrder, setBankOrder] = useState([]);
  const [outlineOrder, setOutlineOrder] = useState([]);

  useEffect(() => {
    const shuffledBank = [...shapes].sort(() => Math.random() - 0.5);
    const shuffledOutlines = [...shapes].sort(() => Math.random() - 0.5);
    setBankOrder(shuffledBank);
    setOutlineOrder(shuffledOutlines);
  }, [shapes]);

  const placeShape = useCallback((shapeId, targetId) => {
    setPlacements((prev) => {
      const newPlacements = { ...prev };
      Object.keys(newPlacements).forEach((key) => {
        if (newPlacements[key] === shapeId) newPlacements[key] = null;
      });
      newPlacements[targetId] = shapeId;
      return newPlacements;
    });
    setSelectedShape(null);
    setFeedback(null);
  }, []);

  const handleDragStart = (e, shapeId) => {
    e.dataTransfer.setData("shapeId", shapeId);
    setSelectedShape(shapeId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    const shapeId = e.dataTransfer.getData("shapeId") || selectedShape;
    if (shapeId) {
      placeShape(shapeId, targetId);
    }
  };

  const handleShapeClick = (shapeId) => {
    if (selectedShape === shapeId) {
      setSelectedShape(null);
    } else {
      setSelectedShape(shapeId);
    }
  };

  const handleOutlineClick = (targetId) => {
    if (selectedShape) {
      placeShape(selectedShape, targetId);
    } else if (placements[targetId]) {
      setPlacements((prev) => ({ ...prev, [targetId]: null }));
      setFeedback(null);
    }
  };

  const checkAnswers = () => {
    setAttempts((a) => a + 1);
    const isAllPlaced = Object.values(placements).every((val) => val !== null);
    
    if (!isAllPlaced) {
      setFeedback({ type: "error", message: "Keep going! Place all the shapes first." });
      return;
    }

    const isAllCorrect = Object.entries(placements).every(([target, shape]) => target === shape);
    if (isAllCorrect) {
      setFeedback({ type: "success", message: "Correct! You match the shapes perfectly! 🎉" });
    } else {
      setFeedback({ type: "error", message: "Try again! Some shapes are not right. Hint: match the corners!" });
    }
  };

  const resetGame = () => {
    setPlacements({ circle: null, square: null, triangle: null, rectangle: null });
    setFeedback(null);
    setSelectedShape(null);
    setAttempts(0);
    setBankOrder([...shapes].sort(() => Math.random() - 0.5));
    setOutlineOrder([...shapes].sort(() => Math.random() - 0.5));
  };

  const renderShapeSvg = (shape, isOutline = false, isInteractive = false) => {
    const isSelected = selectedShape === shape.id;

    const renderCorners = () => {
      if (isOutline || !isInteractive || shape.id === "circle") return null;
      
      const pointsArray = shape.points.split(" ").map((p) => {
        const [x, y] = p.split(",").map(Number);
        return { x, y };
      });

      return pointsArray.map((p, i) => (
        <circle 
          key={i} 
          cx={p.x} 
          cy={p.y} 
          r="5" 
          fill="#fff" 
          stroke="#475569" 
          strokeWidth="2" 
          className="animate-pulse" 
        />
      ));
    };

    const isPlaced = Object.values(placements).includes(shape.id);
    const dropShadow = isOutline ? "none" : (isPlaced ? "drop-shadow(0px 2px 3px rgba(0,0,0,0.3))" : "drop-shadow(0px 6px 8px rgba(0,0,0,0.2))");

    const svgClassName = `w-20 h-20 md:w-32 md:h-32 transition-all duration-300 ${
      isInteractive ? "cursor-pointer hover:scale-110" : ""
    } ${isSelected ? "scale-110 ring-4 ring-yellow-400 rounded-xl bg-yellow-50/50" : ""}`;

    return (
      <svg viewBox="0 0 100 100" className={svgClassName} style={{ filter: dropShadow }}>
        {shape.id === "circle" ? (
          <circle
            cx="50"
            cy="50"
            r="40"
            fill={isOutline ? "transparent" : shape.color}
            stroke={isOutline ? "#cbd5e1" : "#fff"}
            strokeWidth={isOutline ? "4" : "3"}
            strokeDasharray={isOutline ? "8 8" : "0"}
            className="transition-colors duration-300"
          />
        ) : (
          <polygon
            points={shape.points}
            fill={isOutline ? "transparent" : shape.color}
            stroke={isOutline ? "#cbd5e1" : "#fff"}
            strokeWidth={isOutline ? "4" : "3"}
            strokeDasharray={isOutline ? "8 8" : "0"}
            className="transition-colors duration-300"
          />
        )}
        {renderCorners()}
      </svg>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 bg-white rounded-[3rem] shadow-2xl font-sans text-slate-800">
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 bg-blue-50/80 p-6 rounded-[2rem] border-4 border-blue-100 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="text-5xl md:text-7xl bg-white p-4 rounded-3xl shadow-md transform rotate-3">
            🎨
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-blue-700 tracking-tight drop-shadow-sm">Shape Sorter</h1>
            <p className="text-lg md:text-xl text-blue-500 font-bold mt-1">Match the colorful shapes to their outlines!</p>
          </div>
        </div>
        <div className="flex flex-row md:flex-col gap-3">
          <span className="inline-flex items-center px-5 py-2 rounded-2xl text-base font-extrabold bg-green-100 text-green-700 border-2 border-green-200 shadow-sm">
            <Star className="w-6 h-6 mr-2 fill-green-500 text-green-500" /> KG 1-2
          </span>
          <span className="inline-flex items-center px-5 py-2 rounded-2xl text-base font-extrabold bg-orange-100 text-orange-700 border-2 border-orange-200 shadow-sm">
            <Clock className="w-6 h-6 mr-2 text-orange-600" /> 8 mins
          </span>
        </div>
      </div>

      {/* 2. How to Use */}
      <div className="bg-yellow-50/80 p-6 rounded-3xl mb-10 border-4 border-yellow-200 flex items-start gap-5 shadow-sm">
        <div className="bg-yellow-200 p-3 rounded-2xl shrink-0">
          <Info className="w-8 h-8 text-yellow-700" />
        </div>
        <div>
          <h3 className="text-xl md:text-2xl font-extrabold text-yellow-800 mb-2">How to Play</h3>
          <p className="text-lg md:text-xl text-yellow-700 leading-relaxed font-semibold">
            Tap a colorful shape, then tap the matching dotted outline! You can also drag them. 
            Look closely at the glowing dots on the corners to find the perfect fit! 
          </p>
        </div>
      </div>

      {/* 3 & 4. Interactive Control Zone & Live Visual Output */}
      <div className="bg-slate-50 p-6 md:p-10 rounded-[2.5rem] mb-10 border-4 border-slate-100 shadow-inner">
        
        {/* Outlines (Drop Targets) */}
        <div className="mb-14">
          <h4 className="text-center text-2xl font-black text-slate-400 mb-8 uppercase tracking-widest">Outlines</h4>
          <div className="flex flex-wrap justify-center gap-4 md:gap-12">
            {outlineOrder.map((outline) => {
              const placedShapeId = placements[outline.id];
              const placedShape = shapes.find((s) => s.id === placedShapeId);
              const isActiveTarget = selectedShape && !placedShapeId;
              
              return (
                 <div 
                  key={`target-${outline.id}`}
                  className={`relative flex flex-col items-center justify-center p-4 md:p-6 rounded-3xl transition-all duration-300 min-w-[140px] min-h-[140px] shadow-sm
                    ${isActiveTarget ? "bg-blue-100/50 outline-dashed outline-4 outline-blue-400 cursor-pointer" : "bg-white border-4 border-dashed border-slate-200"}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, outline.id)}
                  onClick={() => handleOutlineClick(outline.id)}
                >
                  {placedShape ? (
                    <div 
                      draggable
                      onDragStart={(e) => handleDragStart(e, placedShape.id)}
                      onClick={(e) => {
                         e.stopPropagation();
                         handleShapeClick(placedShape.id);
                      }}
                      className="absolute inset-0 flex items-center justify-center z-10"
                    >
                      {renderShapeSvg(placedShape, false, true)}
                    </div>
                  ) : (
                    renderShapeSvg(outline, true)
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Shape Bank (Draggable Sources) */}
        <div className="bg-white p-8 rounded-[2rem] border-4 border-slate-200 shadow-sm relative">
           <h4 className="text-center text-2xl font-black text-slate-400 mb-8 uppercase tracking-widest">Your Shapes</h4>
           <div className="flex flex-wrap justify-center gap-6 md:gap-14 min-h-[160px] items-center">
            {bankOrder.map((shape) => {
              const isPlaced = Object.values(placements).includes(shape.id);
              
              return (
                <div 
                  key={`bank-${shape.id}`}
                  className={`flex flex-col items-center transition-all duration-500 ${isPlaced ? "opacity-0 pointer-events-none scale-50" : "opacity-100 scale-100"}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, shape.id)}
                  onClick={() => handleShapeClick(shape.id)}
                >
                  {renderShapeSvg(shape, false, true)}
                  <div className="mt-4 text-center">
                    <span className="block font-extrabold text-xl text-slate-600">{shape.name}</span>
                    <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full mt-2 inline-block border-2 border-slate-200">
                      {shape.corners === 0 ? "No corners" : `${shape.corners} corners`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Score / Feedback Panel */}
      <div className="flex flex-col items-center bg-white p-8 rounded-[2.5rem] shadow-xl border-4 border-slate-50 mb-10">
        <div className="flex flex-wrap justify-center gap-6 mb-8 w-full">
          <button 
            onClick={checkAnswers}
            className="flex-1 max-w-sm flex items-center justify-center px-8 py-5 min-h-16 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-3xl text-2xl font-black transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-200"
          >
            <PlayCircle className="w-8 h-8 mr-3" /> Check Answer
          </button>
          <button 
            onClick={resetGame}
            className="flex-none flex items-center justify-center px-8 py-5 min-h-16 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-3xl text-xl font-bold transition-all hover:scale-105 active:scale-95 border-2 border-slate-200"
          >
            <RotateCcw className="w-7 h-7 mr-2" /> Restart
          </button>
        </div>

        {feedback && (
          <div className={`flex items-center p-6 rounded-3xl w-full text-xl md:text-2xl font-black transition-all ${
            feedback.type === "success" 
            ? "bg-green-100 text-green-800 border-4 border-green-300 shadow-inner" 
            : "bg-red-100 text-red-800 border-4 border-red-300 shadow-inner animate-pulse"
          }`}>
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-10 h-10 mr-4 shrink-0 text-green-600" />
            ) : (
              <XCircle className="w-10 h-10 mr-4 shrink-0 text-red-600" />
            )}
            {feedback.message}
          </div>
        )}
      </div>

      {/* 6. Educational Value Footer */}
      <div className="bg-purple-100/50 p-8 rounded-[2rem] border-4 border-purple-100">
        <h4 className="text-xl md:text-2xl font-black text-purple-800 mb-5 flex items-center">
          <Star className="w-7 h-7 mr-3 text-purple-600" /> What We're Learning
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-purple-700 font-bold text-lg">
          <li className="flex items-center bg-white/60 p-4 rounded-2xl shadow-sm">
            <div className="w-3 h-3 rounded-full bg-purple-500 mr-4 shrink-0"></div>
            Identifying and naming basic 2D shapes
          </li>
          <li className="flex items-center bg-white/60 p-4 rounded-2xl shadow-sm">
            <div className="w-3 h-3 rounded-full bg-purple-500 mr-4 shrink-0"></div>
            Recognizing properties like corners and sides
          </li>
          <li className="flex items-center bg-white/60 p-4 rounded-2xl shadow-sm">
            <div className="w-3 h-3 rounded-full bg-purple-500 mr-4 shrink-0"></div>
            Hand-eye coordination and fine motor control
          </li>
          <li className="flex items-center bg-white/60 p-4 rounded-2xl shadow-sm">
            <div className="w-3 h-3 rounded-full bg-purple-500 mr-4 shrink-0"></div>
            Spatial awareness and visual discrimination
          </li>
        </ul>
      </div>
    </div>
  );
}
