import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function PartsofaComputerQuiz() {
  const [round, setRound] = useState(1);
  const [selectedPartId, setSelectedPartId] = useState(null);
  const [selectedFunctionId, setSelectedFunctionId] = useState(null);
  const [draggingFunctionId, setDraggingFunctionId] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState({
    status: "idle",
    message: "Pick a computer part and match it to its job.",
  });

  const [zoom, setZoom] = useState(1);
  const [highlight, setHighlight] = useState(6);
  const [showLabels, setShowLabels] = useState(true);

  const parts = useMemo(
    () => [
      {
        id: "monitor",
        name: "Monitor",
        functionName: "Shows pictures and words",
        hint: "It is the screen you look at.",
        shape: "rect",
        x: 110,
        y: 25,
        w: 180,
        h: 95,
        rx: 10,
        color: "#4D96FF",
        accent: "#0f172a",
      },
      {
        id: "system",
        name: "System Unit",
        functionName: "Does the thinking and stores data",
        hint: "It is the big box with buttons and ports.",
        shape: "rect",
        x: 305,
        y: 70,
        w: 70,
        h: 140,
        rx: 8,
        color: "#22c55e",
        accent: "#14532d",
      },
      {
        id: "keyboard",
        name: "Keyboard",
        functionName: "Lets you type letters and numbers",
        hint: "It has many small keys.",
        shape: "rect",
        x: 90,
        y: 160,
        w: 210,
        h: 45,
        rx: 8,
        color: "#f59e0b",
        accent: "#78350f",
      },
      {
        id: "mouse",
        name: "Mouse",
        functionName: "Moves the pointer and clicks",
        hint: "It fits in your hand.",
        shape: "ellipse",
        x: 315,
        y: 165,
        w: 50,
        h: 35,
        rx: 0,
        color: "#f97316",
        accent: "#7c2d12",
      },
    ],
    []
  );

  const partMap = useMemo(() => {
    const map = {};
    parts.forEach((part) => {
      map[part.id] = part;
    });
    return map;
  }, [parts]);

  const shuffle = useCallback((list) => {
    const array = [...list];
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }, []);

  const functionOrder = useMemo(
    () => shuffle(parts.map((part) => part.id)),
    [parts, shuffle, round]
  );

  const correctCount = useMemo(() => {
    return functionOrder.reduce((count, partId) => {
      return assignments[partId] === partId ? count + 1 : count;
    }, 0);
  }, [assignments, functionOrder]);

  useEffect(() => {
    setAssignments({});
    setSelectedPartId(null);
    setSelectedFunctionId(null);
    setAttempts(0);
    setFeedback({
      status: "idle",
      message: "Pick a computer part and match it to its job.",
    });
  }, [round]);

  const assign = useCallback((partId, functionId) => {
    if (!partId || !functionId) return;
    setAssignments((prev) => ({ ...prev, [partId]: functionId }));
  }, []);

  const handlePartClick = useCallback(
    (partId) => {
      if (selectedFunctionId) {
        assign(partId, selectedFunctionId);
        setSelectedFunctionId(null);
        setSelectedPartId(partId);
        return;
      }
      setSelectedPartId(partId);
    },
    [assign, selectedFunctionId]
  );

  const handleFunctionClick = useCallback(
    (functionId) => {
      if (selectedPartId) {
        assign(selectedPartId, functionId);
        setSelectedPartId(null);
        setSelectedFunctionId(functionId);
        return;
      }
      setSelectedFunctionId(functionId);
    },
    [assign, selectedPartId]
  );

  const handleClear = useCallback((partId) => {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[partId];
      return next;
    });
  }, []);

  const handleCheck = useCallback(() => {
    setAttempts((prev) => prev + 1);
    const allFilled = functionOrder.every((partId) => assignments[partId]);
    if (!allFilled) {
      setFeedback({
        status: "wrong",
        message: "❌ Try Again. Match all the parts first.",
      });
      return;
    }
    const incorrect = functionOrder.find(
      (partId) => assignments[partId] !== partId
    );
    if (!incorrect) {
      setFeedback({
        status: "correct",
        message: "✅ Correct! You matched all the parts.",
      });
      return;
    }
    setFeedback({
      status: "wrong",
      message: `❌ Try Again. Hint: ${partMap[incorrect].hint}`,
    });
  }, [assignments, functionOrder, partMap]);

  const handleFunctionDragStart = useCallback((event, functionId) => {
    event.dataTransfer.setData("text/plain", functionId);
    event.dataTransfer.effectAllowed = "move";
    setDraggingFunctionId(functionId);
  }, []);

  const handleFunctionDragEnd = useCallback(() => {
    setDraggingFunctionId(null);
  }, []);

  const handlePartDrop = useCallback(
    (event, partId) => {
      event.preventDefault();
      const functionId = event.dataTransfer.getData("text/plain");
      assign(partId, functionId);
      setDraggingFunctionId(null);
    },
    [assign]
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
  }, []);

  const highlightWidth = useMemo(
    () => Math.max(2, highlight / 2),
    [highlight]
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6">
      {/* ── BACK BUTTON ── */}
      <div className="mb-4">
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-50 via-white to-orange-50 shadow-lg p-5 md:p-8">
        <div className="absolute -top-16 -right-20 h-64 w-64 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />

        <header className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg text-4xl">
              🖥️
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-['Fredoka'] font-bold text-slate-800">
                Parts of a Computer Quiz
              </h1>
              <p className="text-sm md:text-base text-slate-600">
                Computing / ICT - Match each part to its job
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-blue-100 text-blue-700 px-4 py-1 text-sm font-semibold">
              Primary 1-3
            </span>
            <span className="rounded-full bg-orange-100 text-orange-700 px-4 py-1 text-sm font-semibold">
              10 min
            </span>
          </div>
        </header>

        <div className="relative z-10 mt-5 rounded-2xl border border-sky-100 bg-white/80 p-4 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-800">How to Use</h2>
          <p className="mt-2 text-sm text-slate-600">
            Click a highlighted computer part, then click the matching job.
            You can also drag a job onto the correct part. Use the sliders to
            zoom and change the highlight glow.
          </p>
        </div>

        <div className="relative z-10 mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6">
            <div className="rounded-2xl bg-white shadow-lg p-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Interactive Control Zone
              </h3>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Zoom
                  </label>
                  <input
                    type="range"
                    min="0.9"
                    max="1.2"
                    step="0.01"
                    value={zoom}
                    onChange={(event) =>
                      setZoom(parseFloat(event.target.value))
                    }
                    className="w-full mt-2 accent-sky-500"
                    aria-label="Zoom"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Highlight Strength
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="16"
                    step="1"
                    value={highlight}
                    onChange={(event) =>
                      setHighlight(parseInt(event.target.value, 10))
                    }
                    className="w-full mt-2 accent-orange-500"
                    aria-label="Highlight strength"
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">
                    Labels
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLabels(true)}
                      className={`min-h-12 px-4 rounded-full text-lg font-semibold transition-all duration-300 ${
                        showLabels
                          ? "bg-blue-600 text-white shadow-lg"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      Show Labels
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLabels(false)}
                      className={`min-h-12 px-4 rounded-full text-lg font-semibold transition-all duration-300 ${
                        !showLabels
                          ? "bg-orange-500 text-white shadow-lg"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      Hide Labels
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setRound((prev) => prev + 1)}
                  className="min-h-12 w-full rounded-full bg-slate-800 text-white text-lg font-semibold transition-all duration-300 hover:bg-slate-700"
                >
                  New Round
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow-lg p-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Score and Feedback
              </h3>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                <span>Correct Matches: {correctCount} / 4</span>
                <span>Attempts: {attempts}</span>
              </div>

              <button
                type="button"
                onClick={handleCheck}
                className="mt-4 min-h-12 w-full rounded-full bg-sky-600 text-white text-lg font-semibold transition-all duration-300 hover:bg-sky-500"
              >
                Check My Answer
              </button>

              <div
                className={`mt-4 rounded-xl border p-3 text-sm transition-all duration-300 ${
                  feedback.status === "correct"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : feedback.status === "wrong"
                    ? "bg-orange-50 border-orange-200 text-orange-700"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                {feedback.message}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white shadow-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-800">
                  Live Visual Output Area
                </h3>
                <div className="text-xs text-slate-600">
                  Selected:{" "}
                  {selectedPartId ? partMap[selectedPartId].name : "None"}
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                <svg
                  viewBox="0 0 400 240"
                  className="w-full h-[320px] md:h-[380px]"
                  role="img"
                  aria-label="Computer parts diagram"
                >
                  <g
                    style={{
                      transformOrigin: "center",
                      transform: `scale(${zoom})`,
                    }}
                    className="transition-all duration-300"
                  >
                    <rect
                      x="40"
                      y="200"
                      width="320"
                      height="12"
                      rx="6"
                      fill="#e2e8f0"
                    />
                    <rect
                      x="170"
                      y="120"
                      width="60"
                      height="20"
                      rx="6"
                      fill="#94a3b8"
                    />

                    {parts.map((part) => {
                      const isSelected =
                        selectedPartId === part.id ||
                        selectedFunctionId === part.id ||
                        draggingFunctionId === part.id;
                      const isAssigned = assignments[part.id];
                      const fill = isAssigned ? "#e2e8f0" : part.color;
                      const stroke = isSelected ? "#0f172a" : part.accent;

                      if (part.shape === "ellipse") {
                        return (
                          <g
                            key={part.id}
                            onDragOver={handleDragOver}
                            onDrop={(event) => handlePartDrop(event, part.id)}
                          >
                            <ellipse
                              cx={part.x + part.w / 2}
                              cy={part.y + part.h / 2}
                              rx={part.w / 2}
                              ry={part.h / 2}
                              fill={fill}
                              stroke={stroke}
                              strokeWidth={highlightWidth}
                              className="cursor-pointer transition-all duration-300"
                              onClick={() => handlePartClick(part.id)}
                              style={{
                                filter: isSelected
                                  ? `drop-shadow(0 0 ${highlight}px rgba(59,130,246,0.6))`
                                  : "none",
                              }}
                            />
                            {showLabels && (
                              <text
                                x={part.x + part.w / 2}
                                y={part.y + part.h / 2 + 5}
                                textAnchor="middle"
                                fontSize="12"
                                className="fill-slate-800 font-semibold"
                              >
                                {part.name}
                              </text>
                            )}
                          </g>
                        );
                      }

                      return (
                        <g
                          key={part.id}
                          onDragOver={handleDragOver}
                          onDrop={(event) => handlePartDrop(event, part.id)}
                        >
                          <rect
                            x={part.x}
                            y={part.y}
                            width={part.w}
                            height={part.h}
                            rx={part.rx}
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={highlightWidth}
                            className="cursor-pointer transition-all duration-300"
                            onClick={() => handlePartClick(part.id)}
                            style={{
                              filter: isSelected
                                ? `drop-shadow(0 0 ${highlight}px rgba(59,130,246,0.6))`
                                : "none",
                            }}
                          />
                          {showLabels && (
                            <text
                              x={part.x + part.w / 2}
                              y={part.y + part.h / 2 + 5}
                              textAnchor="middle"
                              fontSize="12"
                              className="fill-slate-800 font-semibold"
                            >
                              {part.name}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow-lg p-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Match Each Part to Its Job
              </h3>
              <div className="mt-4 grid gap-3">
                {functionOrder.map((partId) => {
                  const part = partMap[partId];
                  const assignedId = assignments[partId];
                  const assignedPart = assignedId ? partMap[assignedId] : null;

                  return (
                    <div
                      key={partId}
                      className="rounded-2xl border-2 border-slate-200 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 transition-all duration-300"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          {part.functionName}
                        </p>
                        <p className="text-xs text-slate-500">
                          Click or drag this job to the correct part
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          draggable
                          onDragStart={(event) =>
                            handleFunctionDragStart(event, partId)
                          }
                          onDragEnd={handleFunctionDragEnd}
                          onClick={() => handleFunctionClick(partId)}
                          className={`min-h-12 px-4 rounded-full text-sm font-semibold transition-all duration-300 ${
                            selectedFunctionId === partId
                              ? "bg-orange-100 text-orange-700 border border-orange-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {assignedPart ? assignedPart.name : "Assign Part"}
                        </button>
                        {assignedPart && (
                          <button
                            type="button"
                            onClick={() => handleClear(partId)}
                            className="min-h-12 px-3 rounded-full text-sm font-semibold bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all duration-300"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <footer className="relative z-10 mt-6 rounded-2xl bg-white shadow-lg p-4">
          <h3 className="text-lg font-semibold text-slate-800">
            Learning Benefits
          </h3>
          <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-1">
            <li>Identify key computer hardware parts.</li>
            <li>Connect each part with its real-world function.</li>
            <li>Build confidence using ICT vocabulary.</li>
            <li>Practice focus and matching skills.</li>
          </ul>
        </footer>
      </div>
    </div>
  );
}
