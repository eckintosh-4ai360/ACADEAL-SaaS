import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function ElectricCircuitBuilder() {
  const [slotContents, setSlotContents] = useState({
    battery: null,
    wire: null,
    switch: null,
    bulb: null,
  });

  const [draggingType, setDraggingType] = useState(null);
  const [switchState, setSwitchState] = useState("open"); // "open" | "closed"
  const [batteryLevel, setBatteryLevel] = useState(2); // 1–3
  const [wireLength, setWireLength] = useState(2); // 1–3
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState(null);
  const [liveStatus, setLiveStatus] = useState("open");

  const paletteItems = [
    {
      type: "battery",
      label: "Battery",
      color: "bg-amber-500",
      description: "Power source",
    },
    {
      type: "wire",
      label: "Wire",
      color: "bg-slate-400",
      description: "Path for current",
    },
    {
      type: "switch",
      label: "Switch",
      color: "bg-emerald-500",
      description: "Open or close circuit",
    },
    {
      type: "bulb",
      label: "Bulb",
      color: "bg-yellow-400",
      description: "Glows when current flows",
    },
  ];

  const slotsDefinition = [
    {
      id: "battery",
      label: "Battery side",
      requiredType: "battery",
      helper: "Drag a battery here.",
    },
    {
      id: "wire",
      label: "Wire segment",
      requiredType: "wire",
      helper: "Use wire to connect parts.",
    },
    {
      id: "switch",
      label: "Switch position",
      requiredType: "switch",
      helper: "Place a switch here.",
    },
    {
      id: "bulb",
      label: "Bulb position",
      requiredType: "bulb",
      helper: "Place the bulb here.",
    },
  ];

  const handleDragStart = useCallback((type) => {
    setDraggingType(type);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingType(null);
  }, []);

  const handleDropOnSlot = useCallback(
    (slotId) => {
      if (!draggingType) return;
      setSlotContents((prev) => ({
        ...prev,
        [slotId]: draggingType,
      }));
      setDraggingType(null);
    },
    [draggingType]
  );

  const handleClearSlot = useCallback((slotId) => {
    setSlotContents((prev) => ({
      ...prev,
      [slotId]: null,
    }));
  }, []);

  const circuitIsPhysicallyComplete = useMemo(() => {
    return slotsDefinition.every(
      (slot) => slotContents[slot.id] === slot.requiredType
    );
  }, [slotContents, slotsDefinition]);

  const circuitIsClosed = useMemo(() => {
    return circuitIsPhysicallyComplete && switchState === "closed";
  }, [circuitIsPhysicallyComplete, switchState]);

  const bulbBrightness = useMemo(() => {
    if (!circuitIsClosed) return 0;
    const vFactor = batteryLevel / 3; // 1/3 to 1
    const rFactor = 1 / wireLength; // 1 to 1/3
    let brightness = vFactor * rFactor;
    if (brightness > 1) brightness = 1;
    if (brightness < 0.15) brightness = 0.15;
    return brightness;
  }, [circuitIsClosed, batteryLevel, wireLength]);

  useEffect(() => {
    setLiveStatus(circuitIsClosed ? "closed" : "open");
  }, [circuitIsClosed]);

  const handleCheckAnswer = useCallback(() => {
    setAttempts((prev) => prev + 1);

    if (circuitIsClosed) {
      setIsCorrect(true);
      setFeedback(
        "✅ Great job! You built a complete, closed circuit so the bulb can light."
      );
      return;
    }

    setIsCorrect(false);

    if (!circuitIsPhysicallyComplete) {
      const missingSlots = slotsDefinition
        .filter((slot) => slotContents[slot.id] !== slot.requiredType)
        .map((slot) => slot.label);
      if (missingSlots.length > 0) {
        setFeedback(
          `❌ Try again. These spots still need the correct parts: ${missingSlots.join(
            ", "
          )}. Remember you need a full loop from the battery, through the switch and bulb, and back.`
        );
        return;
      }
    }

    if (switchState === "open") {
      setFeedback(
        "❌ The parts are in place, but the switch is OPEN. Close the switch so current can flow."
      );
      return;
    }

    setFeedback(
      "❌ Not quite yet. Make sure each slot has the correct component and the switch is closed."
    );
  }, [
    circuitIsClosed,
    circuitIsPhysicallyComplete,
    slotContents,
    slotsDefinition,
    switchState,
  ]);

  const bulbColor = useMemo(() => {
    if (!circuitIsClosed) {
      return "#1f2937"; // slate-800
    }
    const minL = 35;
    const maxL = 80;
    const lightness = minL + (maxL - minL) * bulbBrightness;
    return `hsl(50, 100%, ${lightness}%)`;
  }, [bulbBrightness, circuitIsClosed]);

  const loopStrokeColor = circuitIsClosed ? "#facc15" : "#4b5563"; // yellow-400 or gray-600

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      <div className="bg-slate-900 text-slate-50 rounded-2xl shadow-lg p-4 sm:p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className="text-4xl sm:text-5xl">⚡</div>
          <div>
            <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-50">
              Electric Circuit Builder
            </h2>
            <p className="text-sm sm:text-base text-slate-300">
              Drag batteries, wires, a switch and a bulb to build a working
              circuit and see when the bulb lights.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <span className="px-3 py-1 rounded-full bg-purple-700/70 text-xs sm:text-sm font-semibold shadow-md">
            JHS 1–3
          </span>
          <span className="px-3 py-1 rounded-full bg-teal-600/80 text-xs sm:text-sm font-semibold shadow-md">
            Science • Circuits
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-800 text-xs sm:text-sm font-semibold shadow-md">
            ⏱️ ~20 min
          </span>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 mb-6 transition-all duration-300">
        <h3 className="font-bold text-lg text-slate-50 mb-2">
          How to use this tool
        </h3>
        <p className="text-slate-200 text-sm sm:text-base mb-1">
          Drag the battery, wire, switch and bulb from the parts tray into the
          circuit slots to build a loop. Use the switch control and sliders to
          change how the circuit behaves and watch what happens to the bulb.
        </p>
        <p className="text-slate-200 text-sm sm:text-base">
          When you think the circuit is complete, tap{" "}
          <span className="font-semibold text-teal-300">Check My Answer</span>{" "}
          to see if the bulb should really light and read the hint.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-3">
              Circuit Parts Tray
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {paletteItems.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  draggable
                  onDragStart={() => handleDragStart(item.type)}
                  onDragEnd={handleDragEnd}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl shadow-md px-2 py-3 sm:px-3 sm:py-4 min-h-12 text-center text-sm sm:text-base font-semibold text-slate-900 ${item.color} cursor-grab active:cursor-grabbing transition-all duration-300 hover:scale-[1.03] hover:shadow-lg`}
                >
                  <span>{item.label}</span>
                  <span className="text-[0.7rem] sm:text-xs font-normal opacity-90">
                    {item.description}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-300">
              Tip: Drag a part from the tray and drop it onto a circuit slot. To
              remove a part from a slot, tap the small{" "}
              <span className="font-semibold">Clear</span> button on that slot.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 space-y-4 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-1">
              Circuit Controls
            </h3>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm sm:text-base text-slate-200 font-medium">
                Switch
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSwitchState("open")}
                  className={`px-3 sm:px-4 min-h-10 sm:min-h-12 text-sm sm:text-base rounded-full border transition-all duration-300 ${
                    switchState === "open"
                      ? "bg-slate-800 border-slate-300 text-slate-50 shadow-md"
                      : "bg-slate-900 border-slate-600 text-slate-300"
                  }`}
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => setSwitchState("closed")}
                  className={`px-3 sm:px-4 min-h-10 sm:min-h-12 text-sm sm:text-base rounded-full border transition-all duration-300 ${
                    switchState === "closed"
                      ? "bg-teal-600 border-teal-300 text-slate-50 shadow-md"
                      : "bg-slate-900 border-slate-600 text-slate-300"
                  }`}
                >
                  Closed
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm sm:text-base text-slate-200 font-medium">
                  Battery strength
                </span>
                <span className="text-xs sm:text-sm text-amber-300">
                  {batteryLevel === 1
                    ? "Low"
                    : batteryLevel === 2
                    ? "Medium"
                    : "High"}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                value={batteryLevel}
                onChange={(e) => setBatteryLevel(Number(e.target.value))}
                className="w-full accent-amber-400"
              />
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Stronger batteries push more current, making the bulb brighter.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm sm:text-base text-slate-200 font-medium">
                  Wire length / resistance
                </span>
                <span className="text-xs sm:text-sm text-teal-300">
                  {wireLength === 1
                    ? "Short (low resistance)"
                    : wireLength === 2
                    ? "Medium"
                    : "Long (high resistance)"}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                value={wireLength}
                onChange={(e) => setWireLength(Number(e.target.value))}
                className="w-full accent-teal-400"
              />
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Longer or thinner wires resist current more, which can dim the
                bulb.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-700 mt-2">
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Circuit status
                </span>
                <span
                  className={`text-sm sm:text-base font-semibold transition-all duration-300 ${
                    liveStatus === "closed"
                      ? "text-teal-300"
                      : "text-rose-300"
                  }`}
                >
                  {liveStatus === "closed"
                    ? "Closed loop – current can flow"
                    : "Open loop – current is blocked"}
                </span>
              </div>
              <div className="text-xs sm:text-sm text-slate-400">
                Attempts:{" "}
                <span className="font-semibold text-slate-100">
                  {attempts}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-3">
              Live Circuit View
            </h3>
            <div className="w-full aspect-[4/3] bg-slate-950/80 rounded-2xl border border-slate-700 flex items-center justify-center overflow-hidden">
              <svg
                viewBox="0 0 400 300"
                className="w-full h-full transition-all duration-300"
              >
                <rect x="0" y="0" width="400" height="300" fill="#020617" />

                <line
                  x1="80"
                  y1="80"
                  x2="320"
                  y2="80"
                  stroke={loopStrokeColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <line
                  x1="320"
                  y1="80"
                  x2="320"
                  y2="220"
                  stroke={loopStrokeColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <line
                  x1="80"
                  y1="220"
                  x2="320"
                  y2="220"
                  stroke={loopStrokeColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <line
                  x1="80"
                  y1="80"
                  x2="80"
                  y2="220"
                  stroke={loopStrokeColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                />

                <g transform="translate(60,140)">
                  <rect
                    x="0"
                    y="-28"
                    width="16"
                    height="56"
                    rx="4"
                    fill={
                      slotContents.battery === "battery"
                        ? "#f59e0b"
                        : "#1e293b"
                    }
                    className="transition-all duration-300"
                  />
                  <rect
                    x="18"
                    y="-18"
                    width="10"
                    height="36"
                    rx="3"
                    fill={
                      slotContents.battery === "battery"
                        ? "#f97316"
                        : "#0f172a"
                    }
                    className="transition-all duration-300"
                  />
                  <line
                    x1="16"
                    y1="-30"
                    x2="16"
                    y2="-40"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <line
                    x1="10"
                    y1="-40"
                    x2="22"
                    y2="-40"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <line
                    x1="40"
                    y1="-40"
                    x2="52"
                    y2="-40"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <text
                    x="10"
                    y="40"
                    fill="#e5e7eb"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    Battery
                  </text>
                </g>

                <g transform="translate(200,70)">
                  <circle cx="0" cy="0" r="26" fill="#0f172a" />
                  <circle
                    cx="0"
                    cy="0"
                    r="18"
                    fill={bulbColor}
                    className="transition-all duration-300"
                  />
                  {circuitIsClosed && (
                    <circle
                      cx="0"
                      cy="0"
                      r={32 + 10 * bulbBrightness}
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="3"
                      opacity={0.4}
                      className="transition-all duration-300"
                    />
                  )}
                  <line
                    x1="-10"
                    y1="26"
                    x2="10"
                    y2="26"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  <text
                    x="-30"
                    y="-32"
                    fill="#e5e7eb"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    Bulb
                  </text>
                </g>

                <g transform="translate(320,150)">
                  <line
                    x1="0"
                    y1="-40"
                    x2="0"
                    y2="40"
                    stroke="#64748b"
                    strokeWidth="4"
                  />
                  <line
                    x1="-30"
                    y1="-20"
                    x2="30"
                    y2="-20"
                    stroke="#1f2937"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <line
                    x1="-20"
                    y1={switchState === "closed" ? -20 : -34}
                    x2="20"
                    y2={switchState === "closed" ? -20 : -6}
                    stroke={switchState === "closed" ? "#22c55e" : "#f97316"}
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                  <circle cx="-25" cy="-20" r="5" fill="#e5e7eb" />
                  <circle cx="25" cy="-20" r="5" fill="#e5e7eb" />
                  <text
                    x="-24"
                    y="32"
                    fill="#e5e7eb"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    Switch ({switchState})
                  </text>
                </g>

                <g transform="translate(200,230)">
                  <text
                    x="-22"
                    y="20"
                    fill="#e5e7eb"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    Wire
                  </text>
                </g>

                {circuitIsClosed && (
                  <g className="transition-all duration-300">
                    <polygon points="140,78 148,82 140,86" fill="#22c55e" />
                    <polygon points="260,78 268,82 260,86" fill="#22c55e" />
                    <polygon points="78,140 82,148 86,140" fill="#22c55e" />
                    <polygon points="322,160 318,168 314,160" fill="#22c55e" />
                  </g>
                )}
              </svg>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-300">
              The loop shows a simple series circuit. The bulb glows when the
              battery, wire, switch and bulb form a closed path and the switch
              is set to <span className="font-semibold">Closed</span>.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 space-y-4 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-1">
              Build Your Circuit
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {slotsDefinition.map((slot) => {
                const contentType = slotContents[slot.id];
                const displayLabel =
                  paletteItems.find((p) => p.type === contentType)?.label ||
                  "Empty";
                const isCorrectType =
                  contentType === null
                    ? null
                    : contentType === slot.requiredType;
                return (
                  <div
                    key={slot.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnSlot(slot.id);
                    }}
                    className={`relative rounded-2xl border border-dashed p-3 sm:p-4 min-h-[80px] flex flex-col justify-between transition-all duration-300 bg-slate-950/60 ${
                      contentType
                        ? "border-teal-500/70"
                        : "border-slate-600/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">
                          {slot.label}
                        </div>
                        <div className="text-sm font-semibold text-slate-50">
                          {displayLabel}
                        </div>
                      </div>
                      {contentType && (
                        <button
                          type="button"
                          onClick={() => handleClearSlot(slot.id)}
                          className="text-[0.65rem] sm:text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-600 hover:bg-slate-700 transition-all duration-300"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <p className="text-[0.7rem] sm:text-xs text-slate-400">
                      {slot.helper}
                      {isCorrectType === false && (
                        <span className="text-rose-300 font-semibold ml-1">
                          (Wrong part here)
                        </span>
                      )}
                      {contentType === null && (
                        <span className="ml-1 text-slate-400">
                          Drag the correct part from the tray.
                        </span>
                      )}
                    </p>
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
                    Build a complete loop with all four parts, set the switch to{" "}
                    <span className="font-semibold">Closed</span>, then check
                    your answer.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-2">
              Why this activity matters
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-slate-200">
              <li>
                <span className="font-semibold">
                  Understand complete circuits
                </span>
                : See that a bulb only lights when there is a closed loop from
                the battery, through the bulb, and back.
              </li>
              <li>
                <span className="font-semibold">Link current and resistance</span>
                : Explore how battery strength and wire length affect how bright
                the bulb shines.
              </li>
              <li>
                <span className="font-semibold">Practice scientific reasoning</span>
                : Predict what will happen, test your ideas, and use hints to
                correct misunderstandings.
              </li>
              <li>
                <span className="font-semibold">Connect to real devices</span>
                : Relate switches, wires and bulbs in the tool to torches, home
                wiring and other everyday electrical systems.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

