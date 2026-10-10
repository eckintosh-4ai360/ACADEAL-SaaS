import { useState, useEffect, useCallback } from "react";
import { useMemo } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function BuildingMaterialsIdentifier() {
  const [selectedMaterialId, setSelectedMaterialId] = useState("laterite");
  const [compareBy, setCompareBy] = useState("strength"); // strength | cost | availability
  const [environment, setEnvironment] = useState("rural"); // rural | urban | coastal
  const [quizScenarioIndex, setQuizScenarioIndex] = useState(0);
  const [quizSelectedMaterialId, setQuizSelectedMaterialId] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState(null);

  const materials = useMemo(
    () => [
      {
        id: "laterite",
        name: "Laterite Blocks",
        emoji: "🧱",
        color: "bg-amber-600",
        borderColor: "border-amber-400",
        description:
          "Soil-based blocks often found in many Ghanaian communities, especially in rural areas.",
        properties: {
          strength: 3, // 1–5
          cost: 2, // lower = cheaper
          availability: 5,
        },
        uses:
          "Used for low-rise houses and boundary walls in many rural and peri‑urban communities.",
      },
      {
        id: "concrete",
        name: "Concrete Blocks",
        emoji: "🏗️",
        color: "bg-slate-500",
        borderColor: "border-slate-300",
        description:
          "Cement, sand and stones mixed and moulded into strong hollow blocks.",
        properties: {
          strength: 5,
          cost: 4,
          availability: 4,
        },
        uses:
          "Common for storey buildings, urban houses, schools and shops that need high strength.",
      },
      {
        id: "timber",
        name: "Timber / Wood",
        emoji: "🪵",
        color: "bg-emerald-700",
        borderColor: "border-emerald-400",
        description:
          "Planks and boards from trees, used widely in Ghana for building and furniture.",
        properties: {
          strength: 3,
          cost: 3,
          availability: 3,
        },
        uses:
          "Good for roofing, formwork, temporary structures and furniture. Must be protected from rain and termites.",
      },
    ],
    []
  );

  const quizScenarios = useMemo(
    () => [
      {
        id: 1,
        text: "A rural family in the Northern Region wants an affordable one‑storey house. Which material is most suitable for the main walls?",
        bestMaterialId: "laterite",
        hint: "Think about cost and local soil availability.",
      },
      {
        id: 2,
        text: "A busy bank hall in Accra needs strong walls for a two‑storey building. Which material is best?",
        bestMaterialId: "concrete",
        hint: "Consider very high strength and long‑term durability.",
      },
      {
        id: 3,
        text: "A school is putting up a temporary pavilion and roofing frame for assembly. Which material fits best?",
        bestMaterialId: "timber",
        hint: "Think of frames, roofing and temporary structures.",
      },
    ],
    []
  );

  const currentMaterial = useMemo(
    () => materials.find((m) => m.id === selectedMaterialId) || materials[0],
    [materials, selectedMaterialId]
  );

  const currentQuizScenario = useMemo(
    () => quizScenarios[quizScenarioIndex],
    [quizScenarioIndex, quizScenarios]
  );

  const normalizedMetrics = useMemo(() => {
    const maxStrength = 5;
    const maxCost = 5;
    const maxAvailability = 5;
    return materials.map((m) => {
      const { strength, cost, availability } = m.properties;
      let value = strength;
      if (compareBy === "strength") value = strength / maxStrength;
      if (compareBy === "cost") value = 1 - cost / maxCost; // higher bar = more affordable
      if (compareBy === "availability") value = availability / maxAvailability;

      let envBoost = 1;
      if (environment === "rural" && m.id === "laterite") envBoost = 1.1;
      if (environment === "urban" && m.id === "concrete") envBoost = 1.1;
      if (environment === "coastal" && m.id === "concrete") envBoost = 1.05;
      if (environment === "coastal" && m.id === "timber") envBoost = 0.9;

      const boosted = Math.min(1, value * envBoost);
      return { id: m.id, value: boosted };
    });
  }, [materials, compareBy, environment]);

  const handleSelectMaterial = useCallback((id) => {
    setSelectedMaterialId(id);
  }, []);

  const handleSelectQuizMaterial = useCallback((id) => {
    setQuizSelectedMaterialId(id);
  }, []);

  const handleCheckAnswer = useCallback(() => {
    setAttempts((prev) => prev + 1);
    if (!quizSelectedMaterialId) {
      setIsCorrect(false);
      setFeedback("❌ Choose a material for this building situation first.");
      return;
    }
    if (quizSelectedMaterialId === currentQuizScenario.bestMaterialId) {
      setIsCorrect(true);
      setFeedback("✅ Correct! That is the most suitable material for this case.");
    } else {
      const best = materials.find(
        (m) => m.id === currentQuizScenario.bestMaterialId
      );
      setIsCorrect(false);
      setFeedback(
        `❌ Try again. Hint: ${currentQuizScenario.hint} (Think about why ${best?.name} fits better.)`
      );
    }
  }, [quizSelectedMaterialId, currentQuizScenario, materials]);

  const handleNextScenario = useCallback(() => {
    setQuizScenarioIndex((prev) => (prev + 1) % quizScenarios.length);
    setQuizSelectedMaterialId(null);
  }, [quizScenarios.length]);

  const handlePrevScenario = useCallback(() => {
    setQuizScenarioIndex((prev) =>
      (prev - 1 + quizScenarios.length) % quizScenarios.length
    );
    setQuizSelectedMaterialId(null);
  }, [quizScenarios.length]);

  useEffect(() => {
    setIsCorrect(null);
    setFeedback("");
  }, [quizScenarioIndex]);

  const metricLabel = useMemo(() => {
    if (compareBy === "strength") return "Relative Strength";
    if (compareBy === "cost") return "Affordability";
    return "Local Availability";
  }, [compareBy]);

  const environmentLabel = useMemo(() => {
    if (environment === "rural") return "Rural community";
    if (environment === "urban") return "Urban town/city";
    return "Coastal / rainy area";
  }, [environment]);

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
          <div className="text-4xl sm:text-5xl">🏗️</div>
          <div>
            <h2 className="font-extrabold text-2xl sm:text-3xl">
              Building Materials Identifier
            </h2>
            <p className="text-sm sm:text-base text-slate-300">
              Click on laterite, concrete and timber to explore their properties
              and common uses in construction across Ghana.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <span className="px-3 py-1 rounded-full bg-purple-700/70 text-xs sm:text-sm font-semibold shadow-md">
            JHS 1–3
          </span>
          <span className="px-3 py-1 rounded-full bg-teal-600/80 text-xs sm:text-sm font-semibold shadow-md">
            Career Technology
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-800 text-xs sm:text-sm font-semibold shadow-md">
            ⏱️ ~15 min
          </span>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 mb-6 transition-all duration-300">
        <h3 className="font-bold text-lg text-slate-50 mb-2">How to use</h3>
        <p className="text-slate-200 text-sm sm:text-base mb-1">
          Tap on each material card to see what it is made from, how strong it
          is and where it is commonly used in Ghana. Use the controls to compare
          strength, cost and availability.
        </p>
        <p className="text-slate-200 text-sm sm:text-base">
          Read the building situation and choose the best material. Press{" "}
          <span className="font-semibold text-teal-300">Check My Answer</span>{" "}
          to see if your choice matches real construction practice.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-3">
              Construction Materials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {materials.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMaterial(m.id)}
                  className={`flex flex-col items-start justify-between rounded-2xl shadow-md px-3 py-3 sm:px-4 sm:py-4 min-h-24 text-left text-sm sm:text-base font-semibold text-slate-50 border transition-all duration-300 ${
                    m.color
                  } ${
                    selectedMaterialId === m.id
                      ? `${m.borderColor} scale-[1.03] shadow-lg ring-2 ring-teal-300/70`
                      : "border-slate-600 hover:scale-[1.02]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{m.emoji}</span>
                    <span>{m.name}</span>
                  </div>
                  <p className="text-[0.7rem] sm:text-xs font-normal text-slate-100/90">
                    {m.description}
                  </p>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-300">
              Tip: Tap a material to focus on it. The diagram and information
              box on the right update instantly.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 space-y-4 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-2">
              Comparison & Environment
            </h3>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm sm:text-base text-slate-200 font-medium">
                  Compare by
                </span>
                <span className="text-xs sm:text-sm text-teal-300">
                  {metricLabel}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCompareBy("strength")}
                  className={`px-3 sm:px-4 min-h-10 sm:min-h-11 text-xs sm:text-sm rounded-full border transition-all duration-300 ${
                    compareBy === "strength"
                      ? "bg-purple-600 border-purple-300 text-slate-50 shadow-md"
                      : "bg-slate-900 border-slate-600 text-slate-300"
                  }`}
                >
                  Strength
                </button>
                <button
                  type="button"
                  onClick={() => setCompareBy("cost")}
                  className={`px-3 sm:px-4 min-h-10 sm:min-h-11 text-xs sm:text-sm rounded-full border transition-all duration-300 ${
                    compareBy === "cost"
                      ? "bg-emerald-600 border-emerald-300 text-slate-50 shadow-md"
                      : "bg-slate-900 border-slate-600 text-slate-300"
                  }`}
                >
                  Cost
                </button>
                <button
                  type="button"
                  onClick={() => setCompareBy("availability")}
                  className={`px-3 sm:px-4 min-h-10 sm:min-h-11 text-xs sm:text-sm rounded-full border transition-all duration-300 ${
                    compareBy === "availability"
                      ? "bg-sky-600 border-sky-300 text-slate-50 shadow-md"
                      : "bg-slate-900 border-slate-600 text-slate-300"
                  }`}
                >
                  Availability
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Bars in the diagram grow taller when a material scores better in
                the selected category.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm sm:text-base text-slate-200 font-medium">
                  Building location
                </span>
                <span className="text-xs sm:text-sm text-amber-300">
                  {environmentLabel}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEnvironment("rural")}
                  className={`px-3 sm:px-4 min-h-10 sm:min-h-11 text-xs sm:text-sm rounded-full border transition-all duration-300 ${
                    environment === "rural"
                      ? "bg-amber-600 border-amber-300 text-slate-50 shadow-md"
                      : "bg-slate-900 border-slate-600 text-slate-300"
                  }`}
                >
                  Rural
                </button>
                <button
                  type="button"
                  onClick={() => setEnvironment("urban")}
                  className={`px-3 sm:px-4 min-h-10 sm:min-h-11 text-xs sm:text-sm rounded-full border transition-all duration-300 ${
                    environment === "urban"
                      ? "bg-slate-700 border-slate-300 text-slate-50 shadow-md"
                      : "bg-slate-900 border-slate-600 text-slate-300"
                  }`}
                >
                  Urban
                </button>
                <button
                  type="button"
                  onClick={() => setEnvironment("coastal")}
                  className={`px-3 sm:px-4 min-h-10 sm:min-h-11 text-xs sm:text-sm rounded-full border transition-all duration-300 ${
                    environment === "coastal"
                      ? "bg-teal-700 border-teal-300 text-slate-50 shadow-md"
                      : "bg-slate-900 border-slate-600 text-slate-300"
                  }`}
                >
                  Coastal
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Different environments favour different materials. For example,
                very rainy or coastal areas can damage unprotected laterite or
                timber.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-3">
              Live Materials Diagram
            </h3>
            <div className="w-full aspect-[4/3] bg-slate-950/80 rounded-2xl border border-slate-700 flex items-center justify-center overflow-hidden">
              <svg
                viewBox="0 0 400 300"
                className="w-full h-full transition-all duration-300"
              >
                <rect x="0" y="0" width="400" height="300" fill="#020617" />
                <line
                  x1="40"
                  y1="240"
                  x2="360"
                  y2="240"
                  stroke="#4b5563"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <text
                  x="200"
                  y="32"
                  fill="#e5e7eb"
                  fontSize="12"
                  textAnchor="middle"
                >
                  Environment: {environmentLabel}
                </text>
                <text
                  x="200"
                  y="48"
                  fill="#9ca3af"
                  fontSize="11"
                  textAnchor="middle"
                >
                  Comparing by: {metricLabel}
                </text>

                {materials.map((m, index) => {
                  const metric = normalizedMetrics.find(
                    (n) => n.id === m.id
                  )?.value;
                  const barHeight = 20 + (metric || 0) * 120;
                  const xPositions = [90, 200, 310];
                  const x = xPositions[index];
                  const isSelected = selectedMaterialId === m.id;
                  const barColor =
                    m.id === "laterite"
                      ? "#f97316"
                      : m.id === "concrete"
                      ? "#9ca3af"
                      : "#22c55e";

                  return (
                    <g key={m.id}>
                      <rect
                        x={x - 30}
                        y={240 - barHeight}
                        width="60"
                        height={barHeight}
                        rx="10"
                        fill={barColor}
                        opacity={isSelected ? 0.95 : 0.65}
                        stroke={isSelected ? "#22c55e" : "#020617"}
                        strokeWidth={isSelected ? 3 : 1.5}
                        className="transition-all duration-300"
                      />
                      <text
                        x={x}
                        y="255"
                        fill="#e5e7eb"
                        fontSize="11"
                        textAnchor="middle"
                        fontWeight={isSelected ? "bold" : "normal"}
                      >
                        {m.id === "laterite"
                          ? "Laterite"
                          : m.id === "concrete"
                          ? "Concrete"
                          : "Timber"}
                      </text>
                    </g>
                  );
                })}

                {(() => {
                  const index = materials.findIndex(
                    (m) => m.id === selectedMaterialId
                  );
                  const xPositions = [90, 200, 310];
                  const x = xPositions[index] || 200;
                  const baseY = 110;
                  return (
                    <g>
                      <polygon
                        points={`${x - 25},${baseY} ${x},${baseY - 25} ${
                          x + 25
                        },${baseY}`}
                        fill="#0f172a"
                        stroke="#e5e7eb"
                        strokeWidth="2"
                      />
                      <rect
                        x={x - 20}
                        y={baseY}
                        width="40"
                        height="30"
                        rx="4"
                        fill="#020617"
                        stroke="#e5e7eb"
                        strokeWidth="2"
                      />
                      <rect
                        x={x - 6}
                        y={baseY + 10}
                        width="12"
                        height="20"
                        rx="3"
                        fill="#1e293b"
                      />
                      <text
                        x={x}
                        y={baseY + 50}
                        fill="#e5e7eb"
                        fontSize="10"
                        textAnchor="middle"
                      >
                        Sample wall built with {currentMaterial.name}
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-300">
              Taller bars show a better score for the selected comparison. Watch
              how each material&apos;s bar changes when you switch environment
              or comparison type.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 space-y-3 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-1">
              Choose the Best Material
            </h3>
            <div className="rounded-2xl bg-slate-950/70 border border-slate-700 p-3 sm:p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[0.75rem] uppercase tracking-wide text-slate-400">
                  Building Situation
                </span>
                <span className="text-[0.7rem] text-slate-300">
                  Scenario {quizScenarioIndex + 1} of {quizScenarios.length}
                </span>
              </div>
              <p className="text-sm sm:text-base text-slate-100 leading-relaxed">
                {currentQuizScenario.text}
              </p>
              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={handlePrevScenario}
                  className="px-3 sm:px-4 min-h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-50 text-xs sm:text-sm font-semibold shadow-md transition-all duration-300"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleNextScenario}
                  className="px-3 sm:px-4 min-h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-50 text-xs sm:text-sm font-semibold shadow-md transition-all duration-300"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {materials.map((m) => (
                <button
                  key={`quiz-${m.id}`}
                  type="button"
                  onClick={() => handleSelectQuizMaterial(m.id)}
                  className={`min-h-12 rounded-2xl flex items-center justify-center px-3 text-xs sm:text-sm font-semibold transition-all duration-300 border ${
                    quizSelectedMaterialId === m.id
                      ? "bg-teal-600 border-teal-300 text-slate-50 shadow-lg scale-[1.03]"
                      : "bg-slate-900 border-slate-600 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {m.emoji} {m.name}
                </button>
              ))}
            </div>

            <div className="mt-2 pt-2 border-t border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                    Pick the material that best suits this situation, then press{" "}
                    <span className="font-semibold">Check My Answer</span> to
                    see a hint.
                  </span>
                )}
              </div>
            </div>
            <div className="text-xs sm:text-sm text-slate-400">
              Attempts:{" "}
              <span className="font-semibold text-slate-100">{attempts}</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-2">
              Learning benefits
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-slate-200">
              <li>
                <span className="font-semibold">
                  Understand key building materials
                </span>
                : Compare laterite, concrete and timber in terms of strength,
                cost and availability.
              </li>
              <li>
                <span className="font-semibold">
                  Link construction to Ghanaian contexts
                </span>
                : Connect each material to real building situations in rural,
                urban and coastal communities.
              </li>
              <li>
                <span className="font-semibold">
                  Prepare for Career Technology exams
                </span>
                : Practise choosing suitable materials, a common question in JHS
                and BECE.
              </li>
              <li>
                <span className="font-semibold">
                  Develop decision-making skills
                </span>
                : Use visual data and short hints to justify why one material is
                better than another for a task.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

