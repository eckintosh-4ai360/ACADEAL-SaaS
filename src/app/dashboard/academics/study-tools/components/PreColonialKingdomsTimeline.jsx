import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function PreColonialKingdomsTimeline() {
  const KINGDOMS = useMemo(
    () => [
      {
        id: "dagomba",
        name: "Dagomba",
        color: "bg-amber-500",
        year: 1450,
        region: "Savannah North",
        mapBand: "north",
        facts:
          "Located in northern Ghana with capital at Yendi. Known for trading links across the Sahara and strong chieftaincy.",
      },
      {
        id: "denkyira",
        name: "Denkyira",
        color: "bg-rose-500",
        year: 1650,
        region: "Forest South",
        mapBand: "central",
        facts:
          "A powerful forest kingdom that controlled gold trade routes before being defeated by the Asante in 1701.",
      },
      {
        id: "ashanti",
        name: "Ashanti",
        color: "bg-purple-600",
        year: 1701,
        region: "Forest South",
        mapBand: "central",
        facts:
          "Centered at Kumasi, famous for the Golden Stool, gold wealth, and organized military that resisted British rule.",
      },
      {
        id: "fante",
        name: "Fante",
        color: "bg-teal-500",
        year: 1870,
        region: "Coastal South",
        mapBand: "south",
        facts:
          "A coastal Akan group that formed the Fante Confederacy and traded with Europeans along forts and castles.",
      },
    ],
    []
  );

  const CORRECT_ORDER = ["dagomba", "denkyira", "ashanti", "fante"];

  const [slots, setSlots] = useState({
    slot1: null,
    slot2: null,
    slot3: null,
    slot4: null,
  });
  const [draggingId, setDraggingId] = useState(null);
  const [selectedKingdomId, setSelectedKingdomId] = useState("ashanti");
  const [focusYear, setFocusYear] = useState(1700);
  const [highlightRegion, setHighlightRegion] = useState("all");
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState(null);

  const timelineSlots = [
    { id: "slot1", label: "Earliest", yearLabel: "~1400s" },
    { id: "slot2", label: "Next", yearLabel: "~1600s" },
    { id: "slot3", label: "Then", yearLabel: "~1700s" },
    { id: "slot4", label: "Latest", yearLabel: "~1800s" },
  ];

  const placedKingdomIds = useMemo(
    () => Object.values(slots).filter(Boolean),
    [slots]
  );

  const remainingKingdoms = useMemo(
    () => KINGDOMS.filter((k) => !placedKingdomIds.includes(k.id)),
    [KINGDOMS, placedKingdomIds]
  );

  const getKingdomById = useCallback(
    (id) => KINGDOMS.find((k) => k.id === id),
    [KINGDOMS]
  );

  const selectedKingdom = useMemo(
    () => getKingdomById(selectedKingdomId) || KINGDOMS[0],
    [getKingdomById, selectedKingdomId, KINGDOMS]
  );

  const handleDragStart = useCallback((id) => {
    setDraggingId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleDropOnSlot = useCallback(
    (slotId) => {
      if (!draggingId) return;
      setSlots((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          if (updated[key] === draggingId) {
            updated[key] = null;
          }
        });
        updated[slotId] = draggingId;
        return updated;
      });
      setSelectedKingdomId(draggingId);
      setDraggingId(null);
    },
    [draggingId]
  );

  const handleClearSlot = useCallback((slotId) => {
    setSlots((prev) => ({ ...prev, [slotId]: null }));
  }, []);

  const handleCheckAnswer = useCallback(() => {
    setAttempts((prev) => prev + 1);

    const currentOrder = timelineSlots.map((s) => slots[s.id]);
    const missing = currentOrder.filter((id) => !id);
    if (missing.length > 0) {
      setIsCorrect(false);
      setFeedback(
        "❌ Some timeline spaces are still empty. Make sure all four kingdoms are placed from earliest to latest."
      );
      return;
    }

    const isAllCorrect = currentOrder.every(
      (id, index) => id === CORRECT_ORDER[index]
    );

    if (isAllCorrect) {
      setIsCorrect(true);
      setFeedback(
        "✅ Excellent! You have placed Dagomba, Denkyira, Ashanti and Fante in the correct historical order."
      );
    } else {
      setIsCorrect(false);
      const wrongPositions = currentOrder
        .map((id, index) => (id !== CORRECT_ORDER[index] ? index + 1 : null))
        .filter(Boolean);
      setFeedback(
        `❌ Not quite. Check the kingdom(s) in position(s) ${wrongPositions.join(
          ", "
        )}. Hint: Dagomba is the oldest and Fante Confederacy comes last.`
      );
    }
  }, [slots, timelineSlots, CORRECT_ORDER]);

  useEffect(() => {
    setIsCorrect(null);
    setFeedback("");
  }, [slots, focusYear, highlightRegion]);

  const focusX = useMemo(() => {
    const minYear = 1400;
    const maxYear = 1900;
    const clamped = Math.min(Math.max(focusYear, minYear), maxYear);
    const t = (clamped - minYear) / (maxYear - minYear);
    return 40 + t * (360 - 40);
  }, [focusYear]);

  const mapHighlightBand = useMemo(() => {
    if (!selectedKingdom) return "central";
    return selectedKingdom.mapBand;
  }, [selectedKingdom]);

  const regionMatchesHighlight = useCallback(
    (kingdom) =>
      highlightRegion === "all" ||
      kingdom.region.toLowerCase().includes(highlightRegion),
    [highlightRegion]
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* ── BACK BUTTON ── */}
      <div className="mb-4">
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
      </div>

      <div className="bg-slate-900 text-slate-50 rounded-2xl shadow-lg p-4 sm:p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className="text-4xl sm:text-5xl">🏰</div>
          <div>
            <h2 className="font-extrabold text-2xl sm:text-3xl">
              Pre-Colonial Kingdoms Timeline
            </h2>
            <p className="text-sm sm:text-base text-slate-300">
              Drag Ashanti, Dagomba, Denkyira and Fante onto a timeline, then
              tap kingdoms to explore key facts and simple map locations.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <span className="px-3 py-1 rounded-full bg-purple-700/70 text-xs sm:text-sm font-semibold shadow-md">
            JHS 1–3
          </span>
          <span className="px-3 py-1 rounded-full bg-teal-600/80 text-xs sm:text-sm font-semibold shadow-md">
            History of Ghana
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-800 text-xs sm:text-sm font-semibold shadow-md">
            ⏱️ ~18 min
          </span>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 mb-6 transition-all duration-300">
        <h3 className="font-bold text-lg text-slate-50 mb-2">How to use</h3>
        <p className="text-slate-200 text-sm sm:text-base mb-1">
          Drag each kingdom card from the tray onto the timeline spaces from
          earliest to latest. Use the slider to move the year spotlight and the
          buttons to highlight different parts of Ghana.
        </p>
        <p className="text-slate-200 text-sm sm:text-base">
          Tap a kingdom name to read quick facts and see where it was located on
          a simple Ghana map. When you are ready, press{" "}
          <span className="font-semibold text-teal-300">Check My Answer</span>{" "}
          to test your ordering.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-3">
              Kingdoms Tray
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {remainingKingdoms.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  draggable
                  onDragStart={() => handleDragStart(k.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedKingdomId(k.id)}
                  className={`flex flex-col items-start justify-between rounded-2xl shadow-md px-3 py-3 sm:px-4 sm:py-4 min-h-12 text-left text-sm sm:text-base font-semibold text-slate-900 ${k.color} cursor-grab active:cursor-grabbing transition-all duration-300 hover:scale-[1.03] hover:shadow-lg`}
                >
                  <span>{k.name}</span>
                  <span className="text-[0.7rem] sm:text-xs font-normal opacity-90">
                    Drag me to the correct time period.
                  </span>
                </button>
              ))}
              {remainingKingdoms.length === 0 && (
                <div className="col-span-1 sm:col-span-2 text-xs sm:text-sm text-slate-300 bg-slate-800/70 rounded-2xl px-3 py-3 border border-slate-700">
                  All kingdoms are on the timeline. You can still tap any
                  kingdom box to read its facts or drag to adjust the order.
                </div>
              )}
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-300">
              Tip: Each kingdom can only be used once. Drag a card back out of a
              slot by dropping it onto another space.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 space-y-4 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-2">
              Timeline & Map Controls
            </h3>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm sm:text-base text-slate-200 font-medium">
                  Year spotlight
                </span>
                <span className="text-xs sm:text-sm text-amber-300">
                  Around {focusYear}
                </span>
              </div>
              <input
                type="range"
                min={1400}
                max={1900}
                step={50}
                value={focusYear}
                onChange={(e) => setFocusYear(Number(e.target.value))}
                className="w-full accent-amber-400"
              />
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Slide to move the glowing spotlight along the timeline and see
                which kingdoms are near that period.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm sm:text-base text-slate-200 font-medium">
                  Highlight region
                </span>
                <span className="text-xs sm:text-sm text-teal-300">
                  {highlightRegion === "all"
                    ? "All regions"
                    : highlightRegion === "forest"
                    ? "Forest belt"
                    : "Coastal / Northern"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setHighlightRegion("all")}
                  className={`px-3 sm:px-4 min-h-10 sm:min-h-12 text-xs sm:text-sm rounded-full border transition-all duration-300 ${
                    highlightRegion === "all"
                      ? "bg-slate-800 border-slate-300 text-slate-50 shadow-md"
                      : "bg-slate-900 border-slate-600 text-slate-300"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setHighlightRegion("forest")}
                  className={`px-3 sm:px-4 min-h-10 sm:min-h-12 text-xs sm:text-sm rounded-full border transition-all duration-300 ${
                    highlightRegion === "forest"
                      ? "bg-purple-600 border-purple-300 text-slate-50 shadow-md"
                      : "bg-slate-900 border-slate-600 text-slate-300"
                  }`}
                >
                  Forest belt
                </button>
                <button
                  type="button"
                  onClick={() => setHighlightRegion("coastal")}
                  className={`px-3 sm:px-4 min-h-10 sm:min-h-12 text-xs sm:text-sm rounded-full border transition-all duration-300 ${
                    highlightRegion === "coastal"
                      ? "bg-teal-600 border-teal-300 text-slate-50 shadow-md"
                      : "bg-slate-900 border-slate-600 text-slate-300"
                  }`}
                >
                  Coastal / North
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-400 pt-2 border-t border-slate-700">
              <span>
                Attempts:{" "}
                <span className="font-semibold text-slate-100">
                  {attempts}
                </span>
              </span>
              <span className="italic">
                Aim: Place all four kingdoms in the correct order.
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-3">
              Live Timeline & Map View
            </h3>
            <div className="w-full aspect-[4/3] bg-slate-950/80 rounded-2xl border border-slate-700 flex flex-col md:flex-row items-stretch md:items-center justify-between overflow-hidden">
              <div className="flex-1 flex items-center justify-center p-3">
                <svg
                  viewBox="0 0 400 260"
                  className="w-full h-full transition-all duration-300"
                >
                  <rect x="0" y="0" width="400" height="260" fill="#020617" />

                  <line
                    x1="40"
                    y1="150"
                    x2="360"
                    y2="150"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <text
                    x="200"
                    y="170"
                    fill="#e5e7eb"
                    fontSize="11"
                    textAnchor="middle"
                  >
                    Time → (earlier on the left, later on the right)
                  </text>

                  {[1400, 1600, 1700, 1800, 1900].map((year) => {
                    const t = (year - 1400) / (1900 - 1400);
                    const x = 40 + t * (360 - 40);
                    return (
                      <g key={year}>
                        <line
                          x1={x}
                          y1="142"
                          x2={x}
                          y2="158"
                          stroke="#9ca3af"
                          strokeWidth="2"
                        />
                        <text
                          x={x}
                          y="138"
                          fill="#9ca3af"
                          fontSize="10"
                          textAnchor="middle"
                        >
                          {year}
                        </text>
                      </g>
                    );
                  })}

                  <g className="transition-all duration-300">
                    <rect
                      x={focusX - 16}
                      y="120"
                      width="32"
                      height="60"
                      rx="10"
                      fill="#facc1577"
                    />
                    <rect
                      x={focusX - 10}
                      y="125"
                      width="20"
                      height="50"
                      rx="8"
                      fill="#fde68a55"
                    />
                  </g>

                  {timelineSlots.map((slot, index) => {
                    const baseYearPositions = [1450, 1650, 1700, 1870];
                    const year = baseYearPositions[index];
                    const t = (year - 1400) / (1900 - 1400);
                    const x = 40 + t * (360 - 40);
                    const y = 90;
                    const kingdomId = slots[slot.id];
                    const kingdom = kingdomId
                      ? getKingdomById(kingdomId)
                      : null;
                    const isSelected =
                      kingdom && kingdom.id === selectedKingdom.id;
                    const dimmed =
                      kingdom && !regionMatchesHighlight(kingdom);

                    return (
                      <g key={slot.id}>
                        <text
                          x={x}
                          y={y - 32}
                          fill="#cbd5f5"
                          fontSize="11"
                          textAnchor="middle"
                          fontWeight="bold"
                        >
                          {slot.label}
                        </text>
                        <text
                          x={x}
                          y={y - 18}
                          fill="#9ca3af"
                          fontSize="10"
                          textAnchor="middle"
                        >
                          {slot.yearLabel}
                        </text>

                        <rect
                          x={x - 55}
                          y={y - 5}
                          width="110"
                          height="34"
                          rx="10"
                          fill={
                            kingdom
                              ? "#0f172a"
                              : "rgba(15,23,42,0.5)"
                          }
                          stroke={isSelected ? "#22c55e" : "#4b5563"}
                          strokeWidth={isSelected ? 3 : 2}
                          opacity={dimmed ? 0.4 : 1}
                          className="transition-all duration-300"
                          onClick={() =>
                            kingdom && setSelectedKingdomId(kingdom.id)
                          }
                        />
                        <text
                          x={x}
                          y={y + 15}
                          fill={kingdom ? "#e5e7eb" : "#6b7280"}
                          fontSize="11"
                          textAnchor="middle"
                          fontWeight="bold"
                          style={{ pointerEvents: "none" }}
                        >
                          {kingdom ? kingdom.name : "Drop a kingdom here"}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="w-full md:w-56 border-t md:border-t-0 md:border-l border-slate-700 p-3 flex flex-col justify-between bg-slate-900/60">
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-slate-50 mb-1">
                    Quick facts: {selectedKingdom.name}
                  </h4>
                  <p className="text-[0.75rem] sm:text-xs text-slate-200 mb-2">
                    Region:{" "}
                    <span className="font-semibold text-teal-300">
                      {selectedKingdom.region}
                    </span>
                  </p>
                  <p className="text-[0.75rem] sm:text-xs text-slate-200">
                    {selectedKingdom.facts}
                  </p>
                </div>

                <div className="mt-3">
                  <p className="text-[0.7rem] text-slate-300 mb-1 font-medium">
                    Simple Ghana map view
                  </p>
                  <div className="flex items-center gap-2">
                    <svg
                      viewBox="0 0 70 120"
                      className="w-16 h-20 border border-slate-600 rounded shadow-sm bg-slate-950"
                    >
                      <rect
                        x="20"
                        y="5"
                        width="30"
                        height="110"
                        rx="10"
                        fill="#020617"
                        stroke="#e5e7eb"
                        strokeWidth="2"
                      />
                      <rect
                        x="22"
                        y="7"
                        width="26"
                        height="34"
                        rx="8"
                        fill={
                          mapHighlightBand === "north"
                            ? "#22c55e"
                            : "#1e293b"
                        }
                        opacity={mapHighlightBand === "north" ? 0.9 : 0.7}
                      />
                      <rect
                        x="22"
                        y="43"
                        width="26"
                        height="34"
                        rx="8"
                        fill={
                          mapHighlightBand === "central"
                            ? "#8b5cf6"
                            : "#111827"
                        }
                        opacity={mapHighlightBand === "central" ? 0.9 : 0.7}
                      />
                      <rect
                        x="22"
                        y="79"
                        width="26"
                        height="34"
                        rx="8"
                        fill={
                          mapHighlightBand === "south"
                            ? "#14b8a6"
                            : "#0f172a"
                        }
                        opacity={mapHighlightBand === "south" ? 0.9 : 0.7}
                      />
                    </svg>
                    <div className="space-y-1 text-[0.7rem] text-slate-300">
                      <div>
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />
                        North / Savannah
                      </div>
                      <div>
                        <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-1" />
                        Central forest
                      </div>
                      <div>
                        <span className="inline-block w-2 h-2 rounded-full bg-teal-400 mr-1" />
                        Coastal south
                      </div>
                    </div>
                  </div>
                  <p className="mt-1 text-[0.65rem] text-slate-400">
                    This is not a detailed map, but helps you link each kingdom
                    to a rough area in Ghana.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 space-y-4 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-1">
              Arrange the Kingdoms in Time
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {timelineSlots.map((slot) => {
                const kingdomId = slots[slot.id];
                const kingdom = kingdomId
                  ? getKingdomById(kingdomId)
                  : null;
                return (
                  <div
                    key={slot.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnSlot(slot.id);
                    }}
                    className={`relative rounded-2xl border border-dashed p-3 sm:p-4 min-h-[84px] flex flex-col justify-between bg-slate-950/60 transition-all duration-300 ${
                      kingdom ? "border-teal-500/70" : "border-slate-600/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div>
                        <div className="text-[0.7rem] uppercase tracking-wide text-slate-400">
                          {slot.label} kingdom
                        </div>
                        <div className="text-xs text-slate-300">
                          {slot.yearLabel}
                        </div>
                      </div>
                      {kingdom && (
                        <button
                          type="button"
                          onClick={() => handleClearSlot(slot.id)}
                          className="text-[0.65rem] sm:text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-600 hover:bg-slate-700 transition-all duration-300"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        kingdom && setSelectedKingdomId(kingdom.id)
                      }
                      className={`mt-1 w-full min-h-9 rounded-xl px-3 py-2 text-left text-xs sm:text-sm font-semibold transition-all duration-300 ${
                        kingdom
                          ? "bg-slate-800 text-slate-50"
                          : "bg-slate-900 text-slate-400"
                      }`}
                    >
                      {kingdom ? kingdom.name : "Drop a kingdom card here"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCheckAnswer}
                className="px-4 sm:px-6 min-h-12 rounded-full bg-teal-600 hover:bg-teal-500 text-slate-50 text-sm sm:text-lg font-semibold shadow-lg transition-all duration-300"
              >
                Check My Answer
              </button>
              <div
                className={`flex-1 text-sm sm:text-base rounded-2xl px-3 py-2 border transition-all duration-300 ${
                  isCorrect === null
                    ? "border-slate-700 bg-slate-950/60 text-slate-200"
                    : isCorrect
                    ? "border-emerald-500/70 bg-emerald-900/30 text-emerald-200"
                    : "border-rose-500/70 bg-rose-900/30 text-rose-100"
                }`}
              >
                {feedback || (
                  <span>
                    Place all four kingdoms on the timeline from earliest to
                    latest, then press{" "}
                    <span className="font-semibold">Check My Answer</span> to
                    see how you did.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-2">
              Learning benefits
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-slate-200">
              <li>
                <span className="font-semibold">
                  Build a sense of historical order
                </span>
                : Practice placing Ghanaian kingdoms from earliest to latest on
                a clear visual timeline.
              </li>
              <li>
                <span className="font-semibold">
                  Connect history to geography
                </span>
                : Link each kingdom to a simple north–central–south map of
                Ghana.
              </li>
              <li>
                <span className="font-semibold">
                  Prepare for BECE-style questions
                </span>
                : Strengthen memory of key kingdoms (Dagomba, Denkyira,
                Ashanti, Fante) often tested in JHS exams.
              </li>
              <li>
                <span className="font-semibold">Develop critical thinking</span>
                : Use hints and repeated attempts to self-correct and explain
                why one kingdom comes before another.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

