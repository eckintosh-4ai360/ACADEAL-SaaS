import { useState, useEffect, useCallback } from "react";
import { useMemo } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function GhanaSymbolsIdentifier() {
  const [round, setRound] = useState(1);
  const [selectedSymbolId, setSelectedSymbolId] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState({
    status: "idle",
    message: "Pick a symbol and match it to a name.",
  });

  const [symbolScale, setSymbolScale] = useState(1);
  const [glow, setGlow] = useState(6);
  const [showMeanings, setShowMeanings] = useState(true);

  const symbols = useMemo(
    () => [
      {
        id: "coat",
        name: "Coat of Arms",
        meaning: "Shows Ghana's values and history.",
        color: "#1d4ed8",
        accent: "#f59e0b",
        type: "coat",
      },
      {
        id: "flag",
        name: "Ghana Flag",
        meaning: "Red for freedom, gold for wealth, green for forests.",
        color: "#16a34a",
        accent: "#eab308",
        type: "flag",
      },
      {
        id: "black-star",
        name: "Black Star",
        meaning: "Stands for unity and independence.",
        color: "#111827",
        accent: "#f97316",
        type: "star",
      },
    ],
    []
  );

  const symbolMap = useMemo(() => {
    const map = {};
    symbols.forEach((symbol) => {
      map[symbol.id] = symbol;
    });
    return map;
  }, [symbols]);

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

  const symbolOrder = useMemo(() => shuffle(symbols), [symbols, shuffle, round]);
  const slotOrder = useMemo(
    () => shuffle(symbols.map((symbol) => symbol.id)),
    [symbols, shuffle, round]
  );

  const previewSymbol = useMemo(() => {
    if (selectedSymbolId) return symbolMap[selectedSymbolId];
    return symbols[0];
  }, [selectedSymbolId, symbolMap, symbols]);

  const correctCount = useMemo(() => {
    return slotOrder.reduce((count, slotId) => {
      return assignments[slotId] === slotId ? count + 1 : count;
    }, 0);
  }, [assignments, slotOrder]);

  useEffect(() => {
    setSelectedSymbolId(null);
    setAssignments({});
    setAttempts(0);
    setFeedback({
      status: "idle",
      message: "Pick a symbol and match it to a name.",
    });
  }, [round]);

  useEffect(() => {
    if (feedback.status !== "idle") {
      setFeedback({
        status: "idle",
        message: "Keep matching. Press Check My Answer when ready.",
      });
    }
  }, [assignments, feedback.status]);

  const handleSelectSymbol = useCallback((symbolId) => {
    setSelectedSymbolId(symbolId);
  }, []);

  const assignToSlot = useCallback((slotId, symbolId) => {
    if (!symbolId) return;
    setAssignments((prev) => ({ ...prev, [slotId]: symbolId }));
    setSelectedSymbolId(symbolId);
  }, []);

  const handleSlotClick = useCallback(
    (slotId) => {
      if (selectedSymbolId) {
        assignToSlot(slotId, selectedSymbolId);
      }
    },
    [assignToSlot, selectedSymbolId]
  );

  const handleClearSlot = useCallback((slotId) => {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  }, []);

  const handleDragStart = useCallback((event, symbolId) => {
    event.dataTransfer.setData("text/plain", symbolId);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (event, slotId) => {
      event.preventDefault();
      const symbolId = event.dataTransfer.getData("text/plain");
      assignToSlot(slotId, symbolId);
    },
    [assignToSlot]
  );

  const handleCheck = useCallback(() => {
    setAttempts((prev) => prev + 1);
    const allFilled = slotOrder.every((slotId) => assignments[slotId]);
    if (!allFilled) {
      setFeedback({
        status: "wrong",
        message: "❌ Try Again. Fill all the slots first.",
      });
      return;
    }

    const incorrectSlot = slotOrder.find(
      (slotId) => assignments[slotId] !== slotId
    );

    if (!incorrectSlot) {
      setFeedback({
        status: "correct",
        message: "✅ Correct! Great matching work.",
      });
      setScore((prev) => prev + 1);
      return;
    }

    const correctSymbol = symbolMap[incorrectSlot];
    setFeedback({
      status: "wrong",
      message: `❌ Try Again. Hint: ${correctSymbol.meaning}`,
    });
  }, [assignments, slotOrder, symbolMap]);

  const handleNewRound = useCallback(() => {
    setRound((prev) => prev + 1);
  }, []);

  const handleClearAll = useCallback(() => {
    setAssignments({});
    setSelectedSymbolId(null);
    setFeedback({
      status: "idle",
      message: "Pick a symbol and match it to a name.",
    });
  }, []);

  const renderSymbolSVG = useCallback(
    (symbol) => {
      const shared = `drop-shadow(0 0 ${glow}px rgba(37, 99, 235, 0.35))`;
      if (symbol.type === "flag") {
        return (
          <svg
            viewBox="0 0 200 140"
            className="w-full h-full"
            style={{ filter: shared }}
          >
            <rect
              x="10"
              y="20"
              width="180"
              height="100"
              rx="12"
              fill="#e11d48"
            />
            <rect x="10" y="53" width="180" height="34" fill="#facc15" />
            <rect x="10" y="87" width="180" height="33" fill="#16a34a" />
            <polygon
              points="100,58 108,80 130,80 112,94 120,116 100,102 80,116 88,94 70,80 92,80"
              fill="#111827"
            />
            <rect
              x="10"
              y="20"
              width="180"
              height="100"
              rx="12"
              fill="none"
              stroke="#1f2937"
              strokeWidth="4"
            />
          </svg>
        );
      }
      if (symbol.type === "star") {
        return (
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full"
            style={{ filter: shared }}
          >
            <circle cx="100" cy="100" r="80" fill="#f97316" />
            <polygon
              points="100,35 115,78 160,78 124,105 138,148 100,122 62,148 76,105 40,78 85,78"
              fill="#111827"
            />
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#111827"
              strokeWidth="6"
            />
          </svg>
        );
      }
      return (
        <svg
          viewBox="0 0 200 220"
          className="w-full h-full"
          style={{ filter: shared }}
        >
          <path
            d="M100 20 L160 60 L150 150 Q100 200 50 150 L40 60 Z"
            fill="#1d4ed8"
          />
          <path
            d="M100 40 L140 70 L132 140 Q100 170 68 140 L60 70 Z"
            fill="#f59e0b"
          />
          <circle cx="70" cy="60" r="10" fill="#111827" />
          <circle cx="130" cy="60" r="10" fill="#111827" />
          <rect x="85" y="95" width="30" height="30" rx="6" fill="#fef3c7" />
          <path d="M30 100 L10 110" stroke="#111827" strokeWidth="5" />
          <path d="M170 100 L190 110" stroke="#111827" strokeWidth="5" />
        </svg>
      );
    },
    [glow]
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-50 via-white to-orange-50 shadow-lg p-5 md:p-8">
        <div className="absolute -top-16 -right-20 h-64 w-64 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />

        <header className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg text-4xl">
              🏆
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-['Fredoka'] font-bold text-slate-800">
                Ghana Symbols Identifier
              </h1>
              <p className="text-sm md:text-base text-slate-600">
                History of Ghana - Match symbols to names and meanings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-green-100 text-green-700 px-4 py-1 text-sm font-semibold">
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
            Drag a symbol card to the correct name box, or click a symbol then
            click a name. Adjust the sliders to change the symbol size and glow.
            Press Check My Answer when you are done.
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
                    Symbol Size
                  </label>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.01"
                    value={symbolScale}
                    onChange={(event) =>
                      setSymbolScale(parseFloat(event.target.value))
                    }
                    className="w-full mt-2 accent-sky-500"
                    aria-label="Symbol size"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Glow Strength
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="16"
                    step="1"
                    value={glow}
                    onChange={(event) =>
                      setGlow(parseInt(event.target.value, 10))
                    }
                    className="w-full mt-2 accent-orange-500"
                    aria-label="Glow strength"
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">
                    Meaning Labels
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMeanings(true)}
                      className={`min-h-12 px-4 rounded-full text-lg font-semibold transition-all duration-300 ${
                        showMeanings
                          ? "bg-sky-600 text-white shadow-lg"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      Show Meanings
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMeanings(false)}
                      className={`min-h-12 px-4 rounded-full text-lg font-semibold transition-all duration-300 ${
                        !showMeanings
                          ? "bg-orange-500 text-white shadow-lg"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      Hide Meanings
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNewRound}
                  className="min-h-12 w-full rounded-full bg-slate-800 text-white text-lg font-semibold transition-all duration-300 hover:bg-slate-700"
                >
                  New Round
                </button>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="min-h-12 w-full rounded-full bg-slate-100 text-slate-700 text-lg font-semibold transition-all duration-300 hover:bg-slate-200"
                >
                  Clear Matches
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow-lg p-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Score and Feedback
              </h3>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                <span>Correct Matches: {correctCount} / 3</span>
                <span>Total Score: {score}</span>
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

              <p className="mt-3 text-sm text-slate-600">
                Attempts: <span className="font-semibold">{attempts}</span>
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white shadow-lg p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  Live Visual Output Area
                </h3>
                <div className="text-xs text-slate-600">
                  Selected: {previewSymbol.name}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div
                  className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 to-orange-50 p-4 flex flex-col items-center justify-center transition-all duration-300"
                  style={{ transform: `scale(${symbolScale})` }}
                >
                  <div className="w-44 h-44">
                    {renderSymbolSVG(previewSymbol)}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    {previewSymbol.name}
                  </p>
                  {showMeanings && (
                    <p className="mt-1 text-xs text-slate-500 text-center">
                      {previewSymbol.meaning}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-700">
                    Symbol Bank
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {symbolOrder.map((symbol) => {
                      const isActive = selectedSymbolId === symbol.id;
                      return (
                        <button
                          key={symbol.id}
                          type="button"
                          draggable
                          onDragStart={(event) =>
                            handleDragStart(event, symbol.id)
                          }
                          onClick={() => handleSelectSymbol(symbol.id)}
                          className={`min-h-16 rounded-2xl border-2 p-2 text-sm font-semibold transition-all duration-300 ${
                            isActive
                              ? "border-orange-400 bg-orange-50 shadow-lg"
                              : "border-slate-200 bg-white hover:border-sky-300"
                          }`}
                        >
                          <div className="w-full h-16 flex items-center justify-center">
                            {renderSymbolSVG(symbol)}
                          </div>
                          <span className="block mt-1">{symbol.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow-lg p-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Match the Names
              </h3>
              <div className="mt-4 grid gap-3">
                {slotOrder.map((slotId) => {
                  const assigned = assignments[slotId];
                  const slotSymbol = symbolMap[slotId];
                  const assignedSymbol = assigned ? symbolMap[assigned] : null;

                  return (
                    <div
                      key={slotId}
                      onClick={() => handleSlotClick(slotId)}
                      onDragOver={handleDragOver}
                      onDrop={(event) => handleDrop(event, slotId)}
                      className={`rounded-2xl border-2 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 transition-all duration-300 ${
                        assigned
                          ? "border-sky-300 bg-sky-50"
                          : "border-dashed border-slate-300 bg-white"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          {slotSymbol.name}
                        </p>
                        {showMeanings && (
                          <p className="text-xs text-slate-500">
                            {slotSymbol.meaning}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {assignedSymbol ? (
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                              {renderSymbolSVG(assignedSymbol)}
                            </div>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleClearSlot(slotId);
                              }}
                              className="min-h-12 px-3 rounded-full text-sm font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all duration-300"
                            >
                              Clear
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">
                            Drag a symbol here or click to assign
                          </div>
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
            <li>Recognize Ghana's key national symbols.</li>
            <li>Connect symbols to their names and meanings.</li>
            <li>Build national identity vocabulary.</li>
            <li>Practice matching and visual memory skills.</li>
          </ul>
        </footer>
      </div>
    </div>
  );
}
