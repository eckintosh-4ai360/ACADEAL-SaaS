import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Info,
  CheckCircle,
  XCircle,
  Calculator,
  TrendingUp,
  Presentation,
  Focus,
  Target,
  Activity,
  ChevronLeft
} from "lucide-react";

export default function FunctionGraphingTool() {
  // Make sure the name matches the requested default export
  const [funcType, setFuncType] = useState("linear"); // 'linear' or 'quadratic'

  // Equation Coefficients: y = ax^2 + bx + c
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);

  // Challenge Mode State
  const [targetA, setTargetA] = useState(1);
  const [targetB, setTargetB] = useState(1);
  const [targetC, setTargetC] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Generate a new random target function
  const generateNewTarget = useCallback(() => {
    const minC = -5;
    const maxC = 5;
    const newC = Math.floor(Math.random() * (maxC - minC + 1) + minC);
    const newB = Math.floor(Math.random() * 5) - 2; // -2 to 2

    if (funcType === "quadratic") {
      const newA = Math.random() > 0.5 ? 1 : -1;
      setTargetA(newA);
    } else {
      setTargetA(0); // linear
    }

    setTargetB(newB !== 0 ? newB : 1);
    setTargetC(newC);
    setAttempts(0);
    setFeedback(null);
  }, [funcType]);

  // Initial challenge generation
  useEffect(() => {
    generateNewTarget();
    if (funcType === "linear") setA(0);
    else setA(1);
  }, [funcType, generateNewTarget]);

  const handleCheckAnswer = () => {
    setAttempts((prev) => prev + 1);

    let isCorrect = false;
    if (funcType === "linear") {
      isCorrect = b === targetB && c === targetC;
    } else {
      isCorrect = a === targetA && b === targetB && c === targetC;
    }

    if (isCorrect) {
      setFeedback("correct");
    } else {
      setFeedback("incorrect");
    }
  };

  const formatEquation = (a: number, b: number, c: number, type: string) => {
    let eq = "y = ";
    if (type === "quadratic" && a !== 0) {
      if (a === 1) eq += "x²";
      else if (a === -1) eq += "-x²";
      else eq += `${a}x²`;
    }

    if (b !== 0 || (type === "linear" && b === 0)) {
      if (type === "quadratic" && a !== 0 && b > 0) eq += " + ";
      else if (type === "linear" || (a === 0 && b > 0))
        eq += ""; // leading b
      else if (b < 0) eq += " - ";

      const absB = Math.abs(b);
      if (absB === 1) eq += "x";
      else if (b === 0 && type === "linear") eq += "0x";
      else eq += `${absB}x`;
    }

    if (c !== 0) {
      if (c > 0 && (a !== 0 || b !== 0)) eq += " + ";
      else if (c < 0 && (a !== 0 || b !== 0)) eq += " - ";
      else if (c < 0) eq += "-";
      eq += `${Math.abs(c)}`;
    }

    if (
      (type === "quadratic" && a === 0 && b === 0 && c === 0) ||
      (type === "linear" && b === 0 && c === 0)
    ) {
      eq = "y = 0";
    }

    return eq;
  };

  // --- SVG Data Computation ---
  const SVG_SIZE = 400;
  const PLANESIZE = 10; // -10 to +10, total 20 units
  const SCALE = Math.floor(SVG_SIZE / (PLANESIZE * 2)); // 20 pixels per unit

  // Generate path data mapping Cartesian coordinates to SVG coordinates
  const generatePathData = (a: number, b: number, c: number, type: string) => {
    let d = "";
    for (let x = -PLANESIZE; x <= PLANESIZE; x += 0.2) {
      const y = type === "quadratic" ? a * x * x + b * x + c : b * x + c;
      const svgX = SVG_SIZE / 2 + x * SCALE;
      const svgY = SVG_SIZE / 2 - y * SCALE; // inverted Y for SVG

      // Limit drawing slightly outside bounds to avoid huge numbers
      if (svgY > -50 && svgY < SVG_SIZE + 50) {
        if (d === "") d += `M ${svgX} ${svgY} `;
        else d += `L ${svgX} ${svgY} `;
      }
    }
    return d;
  };

  const currentPath = useMemo(
    () => generatePathData(a, b, c, funcType),
    [a, b, c, funcType],
  );
  const targetPath = useMemo(
    () => generatePathData(targetA, targetB, targetC, funcType),
    [targetA, targetB, targetC, funcType],
  );

  // Key points for labels
  const yIntercept = { x: 0, y: c };

  // Calculate x-intercept(s) if applicable inside bounds
  const xIntercepts = useMemo(() => {
    if (funcType === "linear" && b !== 0) {
      return [{ x: -c / b, y: 0 }];
    } else if (funcType === "quadratic" && a !== 0) {
      const discriminant = b * b - 4 * a * c;
      if (discriminant > 0) {
        return [
          { x: (-b + Math.sqrt(discriminant)) / (2 * a), y: 0 },
          { x: (-b - Math.sqrt(discriminant)) / (2 * a), y: 0 },
        ];
      } else if (discriminant === 0) {
        return [{ x: -b / (2 * a), y: 0 }];
      }
    }
    return [];
  }, [funcType, a, b, c]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 bg-slate-50 rounded-3xl shadow-2xl border border-slate-200 text-slate-800 font-sans">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-indigo-900 text-white p-6 rounded-2xl shadow-md mb-6 transition-all duration-300">
        <div className="flex items-center gap-4">
          <span className="text-5xl">📈</span>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Function Graphing Tool
            </h1>
            <p className="text-indigo-200 mt-1 font-medium">
              Visualize linear and quadratic equations instantly
            </p>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col items-end gap-2">
          <span className="px-4 py-1.5 bg-teal-500 text-white text-sm font-bold uppercase tracking-wider rounded-full flex items-center gap-1 shadow-sm">
            <Target className="w-4 h-4" /> JHS 1–3
          </span>
          <span className="text-sm text-indigo-200 font-medium">
            ⏳ Est. Time: 25 min
          </span>
        </div>
      </div>

      {/* 2. HOW TO USE */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-indigo-100 mb-6 flex gap-4 items-start">
        <div className="bg-indigo-100 p-3 rounded-full text-indigo-600">
          <Info className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-indigo-900 mb-1">
            How to Use This Tool
          </h3>
          <p className="text-slate-600 leading-relaxed">
            Choose a line or a curve (quadratic), then use the sliders to change
            numbers. Watch how the shape moves! Try to match your red line to
            the dashed target outline to complete the challenge.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 3. INTERACTIVE CONTROL ZONE */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-teal-600" /> Controls
            </h3>

            {/* Function Type Selector */}
            <div className="flex w-full mb-6 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFuncType("linear")}
                className={`flex-1 py-3 text-sm md:text-md font-bold rounded-lg transition-all duration-300 ${
                  funcType === "linear"
                    ? "bg-white text-indigo-700 shadow-md"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Linear (Line)
              </button>
              <button
                onClick={() => setFuncType("quadratic")}
                className={`flex-1 py-3 text-sm md:text-md font-bold rounded-lg transition-all duration-300 ${
                  funcType === "quadratic"
                    ? "bg-white text-indigo-700 shadow-md"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Quadratic (Curve)
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
              <p className="text-center text-2xl font-mono font-bold text-indigo-800 py-2">
                {formatEquation(a, b, c, funcType)}
              </p>
            </div>

            <div className="space-y-6">
              {/* Slider for 'a' (Quadratic only) */}
              {funcType === "quadratic" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                    <label>A (Width/Direction)</label>
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
                      {a}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="1"
                    value={a}
                    onChange={(e) => setA(Number(e.target.value) || 1)} // avoid strict 0 if possible, but handle if 0
                    className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}

              {/* Slider for 'b' */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                  <label>B (Slope / Shift)</label>
                  <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full">
                    {b}
                  </span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="1"
                  value={b}
                  onChange={(e) => setB(Number(e.target.value))}
                  className="w-full accent-teal-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Slider for 'c' */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                  <label>C (Y-Intercept)</label>
                  <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                    {c}
                  </span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="1"
                  value={c}
                  onChange={(e) => setC(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 5. SCORE / FEEDBACK PANEL */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-500" /> Challenge Mode
              </h3>
              <button
                onClick={generateNewTarget}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-full transition-colors"
              >
                New Target
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Match the target dashed line shown on the graph!
              <br />
              <span className="font-mono text-xs bg-slate-100 px-2 rounded hidden">
                Expected: {formatEquation(targetA, targetB, targetC, funcType)}
              </span>
            </p>

            <button
              onClick={handleCheckAnswer}
              className="w-full min-h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex justify-center items-center gap-2"
            >
              Check My Answer
            </button>

            {feedback && (
              <div
                className={`mt-4 p-4 rounded-xl flex items-start gap-3 transition-all duration-300 ${feedback === "correct" ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`}
              >
                {feedback === "correct" ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4
                    className={`font-bold ${feedback === "correct" ? "text-emerald-800" : "text-rose-800"}`}
                  >
                    {feedback === "correct" ? "Correct! 🎉" : "Try Again! 🤔"}
                  </h4>
                  <p
                    className={`text-sm mt-1 ${feedback === "correct" ? "text-emerald-700" : "text-rose-700"}`}
                  >
                    {feedback === "correct"
                      ? "Awesome job! You matched the function perfectly."
                      : `Hint: Try adjusting the ${a !== targetA && funcType === "quadratic" ? "'A' value to change width/direction" : b !== targetB ? "'B' value to change the slope/position" : "'C' value to adjust up/down"}.`}
                  </p>
                  <div className="mt-2 text-xs font-semibold opacity-70">
                    Attempts: {attempts}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. LIVE VISUAL OUTPUT AREA */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
            <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-md text-xs font-bold text-slate-500 shadow-sm border border-slate-100">
              Live Graph
            </div>
          </div>

          <div className="w-full aspect-square max-w-[400px] bg-slate-50 rounded-xl border-2 border-slate-200 relative">
            <svg
              viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
              className="w-full h-full text-slate-300"
            >
              {/* Grid Lines */}
              {Array.from({ length: PLANESIZE * 2 + 1 }).map((_, i) => (
                <g key={i}>
                  <line
                    x1={i * SCALE}
                    y1="0"
                    x2={i * SCALE}
                    y2={SVG_SIZE}
                    stroke="currentColor"
                    strokeWidth={i === PLANESIZE ? "2" : "0.5"}
                    strokeDasharray={i === PLANESIZE ? "" : "4 4"}
                  />
                  <line
                    x1="0"
                    y1={i * SCALE}
                    x2={SVG_SIZE}
                    y2={i * SCALE}
                    stroke="currentColor"
                    strokeWidth={i === PLANESIZE ? "2" : "0.5"}
                    strokeDasharray={i === PLANESIZE ? "" : "4 4"}
                  />
                  {/* Axis labels */}
                  {i !== PLANESIZE && i % 2 === 0 && (
                    <>
                      <text
                        x={i * SCALE}
                        y={SVG_SIZE / 2 + 15}
                        fontSize="10"
                        fill="#64748b"
                        textAnchor="middle"
                      >
                        {i - PLANESIZE}
                      </text>
                      <text
                        x={SVG_SIZE / 2 - 15}
                        y={i * SCALE + 4}
                        fontSize="10"
                        fill="#64748b"
                        textAnchor="end"
                      >
                        {PLANESIZE - i}
                      </text>
                    </>
                  )}
                </g>
              ))}

              <text
                x={SVG_SIZE - 10}
                y={SVG_SIZE / 2 - 10}
                fontSize="12"
                fontWeight="bold"
                fill="#334155"
              >
                X
              </text>
              <text
                x={SVG_SIZE / 2 + 10}
                y={15}
                fontSize="12"
                fontWeight="bold"
                fill="#334155"
              >
                Y
              </text>

              {/* Target Function Path (Dashed) */}
              <path
                d={targetPath}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="4"
                strokeDasharray="8 8"
                className="transition-all duration-300 pointer-events-none"
              />

              {/* Current Function Path */}
              <path
                d={currentPath}
                fill="none"
                stroke="#e11d48" // Rose 600
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300 drop-shadow-md"
              />

              {/* Key Points: Y-Intercept */}
              {yIntercept.y >= -PLANESIZE && yIntercept.y <= PLANESIZE && (
                <g
                  className="transition-all duration-300"
                  transform={`translate(${SVG_SIZE / 2}, ${SVG_SIZE / 2 - yIntercept.y * SCALE})`}
                >
                  <circle r="6" fill="#10b981" stroke="white" strokeWidth="2" />
                  <rect
                    x="8"
                    y="-20"
                    width="70"
                    height="20"
                    fill="white"
                    rx="4"
                    className="shadow-sm"
                    fillOpacity="0.9"
                    stroke="#e2e8f0"
                  />
                  <text
                    x="12"
                    y="-6"
                    fontSize="10"
                    fontWeight="bold"
                    fill="#334155"
                  >
                    Y-Int (0, {c})
                  </text>
                </g>
              )}

              {/* Key Points: X-Intercepts */}
              {xIntercepts.map(
                (pt, idx) =>
                  pt.x >= -PLANESIZE &&
                  pt.x <= PLANESIZE && (
                    <g
                      key={`x-int-${idx}`}
                      className="transition-all duration-300"
                      transform={`translate(${SVG_SIZE / 2 + pt.x * SCALE}, ${SVG_SIZE / 2})`}
                    >
                      <circle
                        r="6"
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth="2"
                      />
                      <rect
                        x="-35"
                        y="10"
                        width="70"
                        height="20"
                        fill="white"
                        rx="4"
                        className="shadow-sm"
                        fillOpacity="0.9"
                        stroke="#e2e8f0"
                      />
                      <text
                        x="0"
                        y="24"
                        fontSize="10"
                        fontWeight="bold"
                        fill="#334155"
                        textAnchor="middle"
                      >
                        X-Int ({pt.x.toFixed(1)}, 0)
                      </text>
                    </g>
                  ),
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* 6. EDUCATIONAL VALUE FOOTER */}
      <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
        <h4 className="text-indigo-900 font-bold mb-3 flex items-center gap-2">
          <Presentation className="w-5 h-5 text-indigo-600" /> What We Are
          Learning:
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <li className="flex items-start gap-2 text-sm text-indigo-800">
            <div className="mt-1 bg-indigo-200 rounded-full p-1">
              <TrendingUp className="w-3 h-3 text-indigo-700" />
            </div>
            <span>
              Understand how changing numerical values affects the position and
              shape of a graph on a coordinate plane.
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-indigo-800">
            <div className="mt-1 bg-indigo-200 rounded-full p-1">
              <Focus className="w-3 h-3 text-indigo-700" />
            </div>
            <span>
              Identify key features like the <b>y-intercept</b> and exactly
              where the line cuts the axes.
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-indigo-800">
            <div className="mt-1 bg-indigo-200 rounded-full p-1">
              <Activity className="w-3 h-3 text-indigo-700" />
            </div>
            <span>
              Discover the difference between a straight line (linear) and a
              curved parabola (quadratic).
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-indigo-800">
            <div className="mt-1 bg-indigo-200 rounded-full p-1">
              <CheckCircle className="w-3 h-3 text-indigo-700" />
            </div>
            <span>
              Build algebraic intuition by matching equations to their visual
              representations in real-time.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
