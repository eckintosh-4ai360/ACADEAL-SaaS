import { useState, useEffect, useCallback } from "react";
import { useMemo } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function InternetSafetyScenarios() {
  const scenarios = useMemo(
    () => [
      {
        id: 1,
        category: "spam",
        title: "Strange Email Prize",
        text: "You receive an email saying you have won a huge prize. It asks you to click a link and type your bank details.",
        correctAction: "unsafe",
        hint: "Real companies do not ask for passwords or bank details by random email.",
      },
      {
        id: 2,
        category: "passwords",
        title: "Sharing Password with Friend",
        text: "Your best friend wants to use your school portal and asks you to send your password on WhatsApp.",
        correctAction: "unsafe",
        hint: "Passwords should be secret, even from close friends.",
      },
      {
        id: 3,
        category: "cyberbullying",
        title: "Mean Comments in Class Group",
        text: "Some students create a class group and start posting nasty jokes about one of your classmates.",
        correctAction: "unsafe",
        hint: "Cyberbullying should be reported to a trusted adult or teacher.",
      },
      {
        id: 4,
        category: "privacy",
        title: "Posting Location Online",
        text: "You are at home alone and want to post a video saying where you live and that your parents travelled.",
        correctAction: "unsafe",
        hint: "Never share your exact location or that you are alone at home.",
      },
      {
        id: 5,
        category: "passwords",
        title: "Strong Password Choice",
        text: "You are creating a new account. You choose a password with letters, numbers and symbols that is hard to guess.",
        correctAction: "safe",
        hint: "Long, mixed-character passwords are safer.",
      },
      {
        id: 6,
        category: "spam",
        title: "Unknown Attachment",
        text: "A message from an unknown number has a file attached called 'FREE_GAMES.exe'.",
        correctAction: "unsafe",
        hint: "Never download files from people you do not know.",
      },
    ],
    []
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAction, setSelectedAction] = useState(null); // "safe" | "unsafe"
  const [answers, setAnswers] = useState({});
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [riskLevel, setRiskLevel] = useState(3); // 1–3

  const filteredScenarios = useMemo(() => {
    if (filterCategory === "all") return scenarios;
    return scenarios.filter((s) => s.category === filterCategory);
  }, [scenarios, filterCategory]);

  useEffect(() => {
    if (filteredScenarios.length === 0) return;
    const currentScenario = filteredScenarios[currentIndex] || filteredScenarios[0];
    setSelectedAction(answers[currentScenario.id] ?? null);
  }, [filteredScenarios, currentIndex, answers]);

  useEffect(() => {
    setIsCorrect(null);
    setFeedback("");
  }, [currentIndex, filterCategory, riskLevel]);

  const currentScenario = filteredScenarios[currentIndex] || scenarios[0];

  const totalCorrect = useMemo(
    () =>
      scenarios.reduce(
        (acc, s) => (answers[s.id] === s.correctAction ? acc + 1 : acc),
        0
      ),
    [answers, scenarios]
  );

  const handleSelectAction = useCallback(
    (action) => {
      setSelectedAction(action);
      setAnswers((prev) => ({
        ...prev,
        [currentScenario.id]: action,
      }));
    },
    [currentScenario]
  );

  const handleCheckAnswer = useCallback(() => {
    if (!selectedAction) {
      setIsCorrect(false);
      setFeedback("❌ Choose whether this action is SAFE or UNSAFE first.");
      setAttempts((prev) => prev + 1);
      return;
    }
    setAttempts((prev) => prev + 1);
    if (selectedAction === currentScenario.correctAction) {
      setIsCorrect(true);
      setFeedback("✅ Correct! This matches safe internet behaviour.");
    } else {
      setIsCorrect(false);
      setFeedback(`❌ Try again. Hint: ${currentScenario.hint}`);
    }
  }, [selectedAction, currentScenario]);

  const handleNext = useCallback(() => {
    if (filteredScenarios.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % filteredScenarios.length);
  }, [filteredScenarios.length]);

  const handlePrev = useCallback(() => {
    if (filteredScenarios.length === 0) return;
    setCurrentIndex((prev) =>
      (prev - 1 + filteredScenarios.length) % filteredScenarios.length
    );
  }, [filteredScenarios.length]);

  const riskColor = useMemo(() => {
    if (riskLevel === 1) return "#22c55e";
    if (riskLevel === 2) return "#eab308";
    return "#ef4444";
  }, [riskLevel]);

  const iconMoodColor = useMemo(() => {
    if (isCorrect === true) return "#22c55e";
    if (isCorrect === false) return "#ef4444";
    return "#38bdf8";
  }, [isCorrect]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      {/* Header */}
      <div className="bg-slate-900 text-slate-50 rounded-2xl shadow-lg p-4 sm:p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className="text-4xl sm:text-5xl">🛡️</div>
          <div>
            <h2 className="font-extrabold text-2xl sm:text-3xl">
              Internet Safety Scenarios
            </h2>
            <p className="text-sm sm:text-base text-slate-300">
              Explore real-life online situations and decide which actions are
              safe or unsafe while your score updates live.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <span className="px-3 py-1 rounded-full bg-purple-700/70 text-xs sm:text-sm font-semibold shadow-md">
            JHS 1–3
          </span>
          <span className="px-3 py-1 rounded-full bg-teal-600/80 text-xs sm:text-sm font-semibold shadow-md">
            Computing / ICT
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-800 text-xs sm:text-sm font-semibold shadow-md">
            ⏱️ ~15 min
          </span>
        </div>
      </div>

      {/* How to Use */}
      <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 mb-6 transition-all duration-300">
        <h3 className="font-bold text-lg text-slate-50 mb-2">How to use</h3>
        <p className="text-slate-200 text-sm sm:text-base mb-1">
          Read each online situation carefully, then tap whether the action is
          safe or unsafe. Use the arrows to move between scenarios and see many
          examples.
        </p>
        <p className="text-slate-200 text-sm sm:text-base">
          Press{" "}
          <span className="font-semibold text-teal-300">Check My Answer</span>{" "}
          to get instant feedback and a short tip. Watch your score grow as you
          make safer choices online.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Left: Controls + Scenario Card */}
        <div className="space-y-6">
          {/* Interactive Control Zone */}
          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 space-y-4 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-2">
              Scenario Controls
            </h3>

            {/* Category filter */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm sm:text-base text-slate-200 font-medium">
                  Focus area
                </span>
                <span className="text-xs sm:text-sm text-teal-300">
                  {filterCategory === "all"
                    ? "All types"
                    : filterCategory === "spam"
                    ? "Spam & scams"
                    : filterCategory === "passwords"
                    ? "Passwords"
                    : "Cyberbullying & privacy"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilterCategory("all");
                    setCurrentIndex(0);
                  }}
                  className={`px-3 sm:px-4 min-h-10 sm:min-h-12 text-xs sm:text-sm rounded-full border transition-all duration-300 ${
                    filterCategory === "all"
                      ? "bg-slate-800 border-slate-300 text-slate-50 shadow-md"
                      : "bg-slate-900 border-slate-600 text-slate-300"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterCategory("spam");
                    setCurrentIndex(0);
                  }}
                  className={`px-3 sm:px-4 min-h-10 sm:min-h-12 text-xs sm:text-sm rounded-full border transition-all duration-300 ${
                    filterCategory === "spam"
                      ? "bg-sky-600 border-sky-300 text-slate-50 shadow-md"
                      : "bg-slate-900 border-slate-600 text-slate-300"
                  }`}
                >
                  Spam & scams
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterCategory("passwords");
                    setCurrentIndex(0);
                  }}
                  className={`px-3 sm:px-4 min-h-10 sm:min-h-12 text-xs sm:text-sm rounded-full border transition-all duration-300 ${
                    filterCategory === "passwords"
                      ? "bg-emerald-600 border-emerald-300 text-slate-50 shadow-md"
                      : "bg-slate-900 border-slate-600 text-slate-300"
                  }`}
                >
                  Passwords
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterCategory("cyberbullying");
                    setCurrentIndex(0);
                  }}
                  className={`px-3 sm:px-4 min-h-10 sm:min-h-12 text-xs sm:text-sm rounded-full border transition-all duration-300 ${
                    filterCategory === "cyberbullying"
                      ? "bg-rose-600 border-rose-300 text-slate-50 shadow-md"
                      : "bg-slate-900 border-slate-600 text-slate-300"
                  }`}
                >
                  Bullying & privacy
                </button>
              </div>
            </div>

            {/* Risk slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm sm:text-base text-slate-200 font-medium">
                  Risk meter
                </span>
                <span className="text-xs sm:text-sm" style={{ color: riskColor }}>
                  {riskLevel === 1
                    ? "Low risk"
                    : riskLevel === 2
                    ? "Medium risk"
                    : "High risk"}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                value={riskLevel}
                onChange={(e) => setRiskLevel(Number(e.target.value))}
                className="w-full accent-rose-400"
              />
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Imagine how dangerous this situation could be. Slide to rate the
                risk and watch the warning light change.
              </p>
            </div>

            {/* Scenario navigation */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 sm:px-4 min-h-10 sm:min-h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-50 text-xs sm:text-sm font-semibold shadow-md transition-all duration-300"
              >
                Previous
              </button>
              <div className="text-xs sm:text-sm text-slate-300">
                Scenario{" "}
                <span className="font-semibold text-slate-100">
                  {filteredScenarios.length === 0
                    ? 0
                    : currentIndex + 1}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-100">
                  {filteredScenarios.length}
                </span>
              </div>
              <button
                type="button"
                onClick={handleNext}
                className="px-3 sm:px-4 min-h-10 sm:min-h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-50 text-xs sm:text-sm font-semibold shadow-md transition-all duration-300"
              >
                Next
              </button>
            </div>
          </div>

          {/* Scenario Card + Answer buttons */}
          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 space-y-4 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-1">
              Current Scenario
            </h3>
            <div className="rounded-2xl bg-slate-950/70 border border-slate-700 p-3 sm:p-4 space-y-2 transition-all duration-300">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Situation Type
                  </p>
                  <p className="text-sm font-semibold text-slate-50">
                    {currentScenario.category === "spam"
                      ? "Spam / Scam Message"
                      : currentScenario.category === "passwords"
                      ? "Password Safety"
                      : currentScenario.category === "cyberbullying"
                      ? "Cyberbullying"
                      : "Privacy & Location"}
                  </p>
                </div>
                <span className="text-[0.7rem] px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-600">
                  ID #{currentScenario.id}
                </span>
              </div>
              <p className="text-sm sm:text-base text-slate-100 leading-relaxed">
                {currentScenario.text}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectAction("safe")}
                className={`min-h-12 rounded-2xl flex items-center justify-center px-4 text-sm sm:text-lg font-semibold transition-all duration-300 border ${
                  selectedAction === "safe"
                    ? "bg-emerald-600 border-emerald-300 text-slate-50 shadow-lg scale-[1.02]"
                    : "bg-slate-900 border-slate-600 text-emerald-300 hover:bg-slate-800"
                }`}
              >
                ✅ This is SAFE
              </button>
              <button
                type="button"
                onClick={() => handleSelectAction("unsafe")}
                className={`min-h-12 rounded-2xl flex items-center justify-center px-4 text-sm sm:text-lg font-semibold transition-all duration-300 border ${
                  selectedAction === "unsafe"
                    ? "bg-rose-600 border-rose-300 text-slate-50 shadow-lg scale-[1.02]"
                    : "bg-slate-900 border-slate-600 text-rose-300 hover:bg-slate-800"
                }`}
              >
                ⚠️ This is UNSAFE
              </button>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-300 pt-1">
              <span>
                Total correct so far:{" "}
                <span className="font-semibold text-emerald-300">
                  {totalCorrect}
                </span>{" "}
                / {scenarios.length}
              </span>
              <span>
                Attempts:{" "}
                <span className="font-semibold text-slate-100">
                  {attempts}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Live Visual + Feedback */}
        <div className="space-y-6">
          {/* Live Visual Output Area */}
          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-3">
              Live Safety Monitor
            </h3>
            <div className="w-full aspect-[4/3] bg-slate-950/80 rounded-2xl border border-slate-700 flex items-center justify-center overflow-hidden">
              <svg
                viewBox="0 0 400 300"
                className="w-full h-full transition-all duration-300"
              >
                <rect x="0" y="0" width="400" height="300" fill="#020617" />

                {/* Phone body */}
                <rect
                  x="110"
                  y="40"
                  width="180"
                  height="220"
                  rx="26"
                  fill="#020617"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                {/* Phone screen */}
                <rect
                  x="124"
                  y="60"
                  width="152"
                  height="180"
                  rx="18"
                  fill="#020617"
                  stroke="#334155"
                  strokeWidth="2"
                />
                {/* Top notch */}
                <rect
                  x="170"
                  y="48"
                  width="60"
                  height="8"
                  rx="4"
                  fill="#020617"
                  stroke="#334155"
                  strokeWidth="2"
                />

                {/* Risk meter arc */}
                <g transform="translate(200, 245)">
                  <path
                    d="M -80 0 A 80 80 0 0 1 80 0"
                    fill="none"
                    stroke="#1f2937"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M -80 0 A 80 80 0 0 1 80 0"
                    fill="none"
                    stroke={riskColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={
                      riskLevel === 1
                        ? "60 160"
                        : riskLevel === 2
                        ? "120 100"
                        : "180 40"
                    }
                  />
                  <circle cx="0" cy="0" r="10" fill={riskColor} />
                  <text
                    x="0"
                    y="26"
                    fill="#e5e7eb"
                    fontSize="11"
                    textAnchor="middle"
                  >
                    Risk level
                  </text>
                </g>

                {/* Message bubble */}
                <g transform="translate(200, 120)">
                  <rect
                    x="-90"
                    y="-40"
                    width="180"
                    height="80"
                    rx="12"
                    fill="#020617"
                    stroke="#4b5563"
                    strokeWidth="2"
                  />
                  <polygon
                    points="-10,42 0,30 10,42"
                    fill="#020617"
                    stroke="#4b5563"
                    strokeWidth="2"
                  />
                  <circle cx="-70" cy="-12" r="16" fill="#0f172a" />
                  {/* Icon face */}
                  <circle cx="-70" cy="-12" r="11" fill={iconMoodColor} />
                  <circle cx="-74" cy="-14" r="1.5" fill="#0f172a" />
                  <circle cx="-66" cy="-14" r="1.5" fill="#0f172a" />
                  <path
                    d={
                      isCorrect === true
                        ? "M -76 -9 Q -70 -3 -64 -9"
                        : isCorrect === false
                        ? "M -76 -5 Q -70 -11 -64 -5"
                        : "M -76 -8 Q -70 -6 -64 -8"
                    }
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />

                  {/* Short summary text */}
                  <text
                    x="-40"
                    y="-8"
                    fill="#e5e7eb"
                    fontSize="11"
                  >
                    {currentScenario.category === "spam"
                      ? "Suspicious message?"
                      : currentScenario.category === "passwords"
                      ? "Password choice?"
                      : currentScenario.category === "cyberbullying"
                      ? "Kind or cruel?"
                      : "Private info online?"}
                  </text>
                  <text
                    x="-40"
                    y="10"
                    fill="#9ca3af"
                    fontSize="9"
                  >
                    Tap SAFE or UNSAFE, then check.
                  </text>
                </g>

                {/* Labels */}
                <text
                  x="200"
                  y="26"
                  fill="#e5e7eb"
                  fontSize="12"
                  textAnchor="middle"
                >
                  Online Safety Dashboard
                </text>
              </svg>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-300">
              The phone screen represents your online world. The face icon shows
              how safe your choice is, and the risk meter glows brighter as you
              slide the danger level.
            </p>
          </div>

          {/* Score / Feedback Panel */}
          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 space-y-3 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-1">
              Score & Feedback
            </h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                    Decide if this action is safe or unsafe, then press{" "}
                    <span className="font-semibold">Check My Answer</span> to
                    see a tip.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Educational Value Footer */}
          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-lg p-4 sm:p-5 transition-all duration-300">
            <h3 className="font-bold text-lg text-slate-50 mb-2">
              Learning benefits
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-slate-200">
              <li>
                <span className="font-semibold">
                  Recognise online dangers
                </span>
                : Practise spotting spam, scams and risky messages that may
                appear in real life.
              </li>
              <li>
                <span className="font-semibold">
                  Strengthen password skills
                </span>
                : Learn how to protect your accounts with strong, secret
                passwords.
              </li>
              <li>
                <span className="font-semibold">
                  Stand up to cyberbullying
                </span>
                : Think about kind behaviour online and how to report harmful
                actions.
              </li>
              <li>
                <span className="font-semibold">
                  Prepare for digital life & exams
                </span>
                : Build habits that keep you safe while answering ICT and
                digital literacy questions for JHS and BECE.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

