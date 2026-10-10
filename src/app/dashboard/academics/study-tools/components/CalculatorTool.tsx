"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calculator,
  ChevronLeft,
  Delete,
  History,
  MoonStar,
  Sparkles,
  SunMedium,
} from "lucide-react";

type ThemeMode = "light" | "dark";

interface HistoryEntry {
  id: string;
  expression: string;
  result: string;
}

const KEYPAD_ROWS = [
  ["AC", "()", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["0", ".", "⌫", "="],
] as const;

const SAMPLE_EXPRESSION = "89+25";

const THEME_STYLES: Record<
  ThemeMode,
  {
    page: string;
    glowA: string;
    glowB: string;
    card: string;
    panel: string;
    surface: string;
    display: string;
    history: string;
    chip: string;
    buttonDigit: string;
    buttonUtility: string;
    buttonOperator: string;
    buttonAccent: string;
    buttonGhost: string;
    textMain: string;
    textMuted: string;
    textDim: string;
    textHistory: string;
  }
> = {
  light: {
    page: "bg-[#f5efe3] text-slate-900",
    glowA: "bg-amber-300/30",
    glowB: "bg-white/60",
    card: "border-[#e4d5b7] bg-[#fcf8ef]/90 shadow-[0_30px_90px_rgba(141,103,38,0.14)] backdrop-blur-xl",
    panel: "border-[#e7dbc0] bg-white/70 backdrop-blur-xl",
    surface: "border-[#dbcaa9] bg-[#f5eddc]",
    display: "border-[#dbc9ab] bg-[#f7eedb]",
    history: "border-[#e6d8bb] bg-white/75",
    chip: "border-[#dfd5c2] bg-white/75 text-slate-700",
    buttonDigit: "bg-[#ded5c3] text-slate-900 hover:bg-[#d3cab6]",
    buttonUtility: "bg-[#ede2cb] text-slate-800 hover:bg-[#e2d5bc]",
    buttonOperator: "bg-[#d5c68f] text-slate-950 hover:bg-[#cdbb79]",
    buttonAccent: "bg-[#f2d51d] text-slate-950 hover:bg-[#e5c914]",
    buttonGhost: "bg-black/5 text-slate-600 hover:bg-black/10",
    textMain: "text-slate-950",
    textMuted: "text-slate-600",
    textDim: "text-slate-500",
    textHistory: "text-slate-700",
  },
  dark: {
    page: "bg-[#09090b] text-white",
    glowA: "bg-amber-300/10",
    glowB: "bg-white/10",
    card: "border-white/10 bg-[#121214]/90 shadow-[0_30px_90px_rgba(0,0,0,0.5)] backdrop-blur-xl",
    panel: "border-white/10 bg-white/5 backdrop-blur-xl",
    surface: "border-white/10 bg-[#18181b]",
    display: "border-white/10 bg-[#1a1a1d]",
    history: "border-white/10 bg-white/5",
    chip: "border-white/10 bg-white/5 text-zinc-200",
    buttonDigit: "bg-[#27272a] text-white hover:bg-[#323238]",
    buttonUtility: "bg-[#1f1f22] text-white hover:bg-[#2b2b30]",
    buttonOperator: "bg-[#d4c58a] text-slate-950 hover:bg-[#c8ba77]",
    buttonAccent: "bg-[#f2d51d] text-slate-950 hover:bg-[#e5c912]",
    buttonGhost: "bg-white/5 text-zinc-200 hover:bg-white/10",
    textMain: "text-white",
    textMuted: "text-zinc-300",
    textDim: "text-zinc-400",
    textHistory: "text-zinc-200",
  },
};

function isOperator(char: string) {
  return char === "+" || char === "-" || char === "*" || char === "/";
}

function displayExpressionText(value: string) {
  return value.replace(/\*/g, "×").replace(/\//g, "÷");
}

function trimTrailingDecimal(value: string) {
  return value.endsWith(".") ? `${value}0` : value;
}

function getCurrentNumberSegment(expression: string) {
  if (!expression) {
    return null;
  }

  let start = expression.length;
  while (start > 0 && /[0-9.]/.test(expression[start - 1])) {
    start -= 1;
  }

  if (
    start > 0 &&
    expression[start - 1] === "-" &&
    (start - 1 === 0 || isOperator(expression[start - 2]) || expression[start - 2] === "(")
  ) {
    start -= 1;
  }

  const value = expression.slice(start);
  return value ? { start, value } : null;
}

function countOpenParens(expression: string) {
  return expression.split("").reduce((count, char) => {
    if (char === "(") {
      return count + 1;
    }

    if (char === ")") {
      return count - 1;
    }

    return count;
  }, 0);
}

function appendDigit(current: string, digit: string, overwrite: boolean) {
  const base = overwrite ? "" : current;

  if (!base) {
    return digit;
  }

  const last = base.slice(-1);
  if (last === ")" || last === "%") {
    return `${base}*${digit}`;
  }

  const segment = getCurrentNumberSegment(base);
  if (segment && /^-?0$/.test(segment.value)) {
    const replacement = segment.value.startsWith("-") ? `-${digit}` : digit;
    return `${base.slice(0, segment.start)}${replacement}`;
  }

  return `${base}${digit}`;
}

function appendDecimal(current: string, overwrite: boolean) {
  const base = overwrite ? "" : current;

  if (!base) {
    return "0.";
  }

  const last = base.slice(-1);
  if (last === ")" || last === "%") {
    return `${base}*0.`;
  }

  if (isOperator(last) || last === "(") {
    return `${base}0.`;
  }

  const segment = getCurrentNumberSegment(base);
  if (segment && segment.value.includes(".")) {
    return base;
  }

  return `${base}.`;
}

function appendOperator(current: string, operator: string) {
  if (!current) {
    return operator === "-" ? "-" : "";
  }

  const base = trimTrailingDecimal(current);
  const last = base.slice(-1);

  if (base === "-") {
    return operator === "-" ? "-" : "";
  }

  if (isOperator(last)) {
    return `${base.slice(0, -1)}${operator}`;
  }

  if (last === "(") {
    return operator === "-" ? `${base}${operator}` : base;
  }

  return `${base}${operator}`;
}

function toggleParentheses(current: string, overwrite: boolean) {
  const base = overwrite ? "" : current;

  if (!base) {
    return "(";
  }

  const last = base.slice(-1);
  const openParens = countOpenParens(base);

  if (isOperator(last) || last === "(") {
    return `${base}(`;
  }

  if (openParens > 0) {
    return `${base})`;
  }

  return `${base}*(`;
}

function appendPercent(current: string) {
  if (!current) {
    return current;
  }

  const last = current.slice(-1);
  if (/[0-9)%]/.test(last)) {
    return `${current}%`;
  }

  return current;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "Error";
  }

  const rounded = Number.parseFloat(value.toFixed(10));
  if (Object.is(rounded, -0)) {
    return "0";
  }

  return rounded.toString();
}

function evaluateExpression(input: string): number | null {
  const expression = input.replace(/×/g, "*").replace(/÷/g, "/").replace(/\s+/g, "");

  if (!expression) {
    return null;
  }

  let index = 0;

  const peek = () => expression[index];
  const consume = () => expression[index++];

  const parseExpression = (): number | null => {
    let value = parseTerm();
    if (value === null) {
      return null;
    }

    while (peek() === "+" || peek() === "-") {
      const operator = consume();
      const right = parseTerm();
      if (right === null) {
        return null;
      }

      value = operator === "+" ? value + right : value - right;
    }

    return value;
  };

  const parseTerm = (): number | null => {
    let value = parseUnary();
    if (value === null) {
      return null;
    }

    while (peek() === "*" || peek() === "/") {
      const operator = consume();
      const right = parseUnary();
      if (right === null) {
        return null;
      }

      if (operator === "*") {
        value *= right;
      } else {
        if (right === 0) {
          return null;
        }

        value /= right;
      }
    }

    return value;
  };

  const parseUnary = (): number | null => {
    if (peek() === "+") {
      consume();
      return parseUnary();
    }

    if (peek() === "-") {
      consume();
      const value = parseUnary();
      return value === null ? null : -value;
    }

    return parsePostfix();
  };

  const parsePostfix = (): number | null => {
    let value = parsePrimary();
    if (value === null) {
      return null;
    }

    while (peek() === "%") {
      consume();
      value /= 100;
    }

    return value;
  };

  const parsePrimary = (): number | null => {
    if (peek() === "(") {
      consume();
      const value = parseExpression();
      if (value === null || peek() !== ")") {
        return null;
      }

      consume();
      return value;
    }

    return parseNumber();
  };

  const parseNumber = (): number | null => {
    const start = index;
    let hasDigits = false;

    while (/[0-9]/.test(peek() ?? "")) {
      consume();
      hasDigits = true;
    }

    if (peek() === ".") {
      consume();

      while (/[0-9]/.test(peek() ?? "")) {
        consume();
        hasDigits = true;
      }
    }

    if (!hasDigits) {
      return null;
    }

    const value = Number(expression.slice(start, index));
    return Number.isFinite(value) ? value : null;
  };

  const result = parseExpression();
  if (result === null || index !== expression.length) {
    return null;
  }

  return result;
}

export default function CalculatorTool() {
  const [expression, setExpression] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const liveResult = expression ? evaluateExpression(expression) : null;
  const displayExpression = expression ? displayExpressionText(expression) : "0";
  const displayResult =
    expression.length === 0
      ? "0"
      : liveResult === null
        ? "—"
        : formatNumber(liveResult);

  const handleButtonPress = useCallback(
    (label: string) => {
      setError(null);

      if (label === "AC") {
        setExpression("");
        setOverwrite(false);
        return;
      }

      if (label === "⌫") {
        setExpression((current) => current.slice(0, -1));
        setOverwrite(false);
        return;
      }

      if (label === "=") {
        const result = evaluateExpression(expression);

        if (result === null) {
          setError(expression ? "Enter a complete calculation." : "Start typing a calculation.");
          return;
        }

        const formatted = formatNumber(result);
        setHistory((current) => [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            expression: displayExpressionText(expression),
            result: formatted,
          },
          ...current,
        ].slice(0, 6));
        setExpression(formatted);
        setOverwrite(true);
        return;
      }

      if (label === "()") {
        setExpression((current) => toggleParentheses(current, overwrite));
        setOverwrite(false);
        return;
      }

      if (label === "%") {
        setExpression((current) => appendPercent(current));
        setOverwrite(false);
        return;
      }

      if (label === "÷" || label === "×" || label === "−" || label === "+") {
        const operatorMap: Record<string, string> = {
          "÷": "/",
          "×": "*",
          "−": "-",
          "+": "+",
        };

        setExpression((current) => appendOperator(current, operatorMap[label]));
        setOverwrite(false);
        return;
      }

      if (label === ".") {
        setExpression((current) => appendDecimal(current, overwrite));
        setOverwrite(false);
        return;
      }

      if (/^\d$/.test(label)) {
        setExpression((current) => appendDigit(current, label, overwrite));
        setOverwrite(false);
      }
    },
    [expression, overwrite]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key >= "0" && event.key <= "9") {
        event.preventDefault();
        handleButtonPress(event.key);
        return;
      }

      const map: Record<string, string> = {
        Enter: "=",
        Backspace: "⌫",
        Escape: "AC",
        ".": ".",
        "%": "%",
        "+": "+",
        "-": "−",
        "*": "×",
        "/": "÷",
        "(": "()",
        ")": "()",
      };

      const label = map[event.key];
      if (label) {
        event.preventDefault();
        handleButtonPress(label);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleButtonPress]);

  const loadExample = () => {
    setExpression(SAMPLE_EXPRESSION);
    setOverwrite(false);
    setError(null);
  };

  const clearHistory = () => setHistory([]);
  const toggleTheme = () => setTheme((current) => (current === "light" ? "dark" : "light"));

  const styles = THEME_STYLES[theme];

  return (
    <div className={`relative min-h-screen overflow-hidden ${styles.page}`}>
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute -left-24 top-12 h-72 w-72 rounded-full blur-3xl ${styles.glowA}`} />
        <div className={`absolute -right-10 bottom-0 h-80 w-80 rounded-full blur-3xl ${styles.glowB}`} />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <Link
          href="/dashboard/academics/study-tools"
          className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${theme === "dark" ? "text-white/70 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Study Tools
        </Link>

        <header className={`mt-4 rounded-[2rem] border p-5 md:p-6 ${styles.card}`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className={`rounded-2xl border p-3 ${styles.surface}`}>
                <Calculator className={`h-8 w-8 ${theme === "dark" ? "text-amber-300" : "text-amber-600"}`} />
              </div>

              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.4em] ${styles.textDim}`}>
                  Study Tool
                </p>
                <h1 className={`mt-2 text-3xl font-semibold tracking-tight md:text-4xl ${styles.textMain}`}>
                  Calculator
                </h1>
                <p className={`mt-2 max-w-2xl text-sm md:text-base ${styles.textMuted}`}>
                  Phone-style arithmetic with live preview, parentheses, and percentage practice.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles.chip}`}>
                All Levels
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles.chip}`}>
                Numeracy / Math
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles.chip}`}>
                5 min
              </span>
            </div>
          </div>
        </header>

        <main className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,1.1fr)]">
          <section className="space-y-4">
            <div className={`rounded-[2rem] border p-5 ${styles.panel}`}>
              <div className="flex items-center gap-3">
                <div className={`rounded-2xl border p-3 ${styles.surface}`}>
                  <Sparkles className={`h-5 w-5 ${theme === "dark" ? "text-amber-300" : "text-amber-600"}`} />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${styles.textMain}`}>Quick Tips</h2>
                  <p className={`text-sm ${styles.textMuted}`}>A simple calculator that still handles grouped expressions.</p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className={`rounded-2xl border px-4 py-3 ${styles.surface}`}>
                  Type numbers and operators, then press <strong>=</strong> to see the answer.
                </div>
                <div className={`rounded-2xl border px-4 py-3 ${styles.surface}`}>
                  Use <strong>()</strong> for grouping and <strong>%</strong> for percentage practice.
                </div>
                <div className={`rounded-2xl border px-4 py-3 ${styles.surface}`}>
                  The display updates live, so you can check your working before you commit.
                </div>
              </div>

              <button
                type="button"
                onClick={loadExample}
                className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:scale-[1.01] active:scale-[0.99] ${styles.buttonAccent}`}
              >
                <Sparkles className="h-4 w-4" />
                Load sample 89 + 25
              </button>
            </div>

            <div className={`rounded-[2rem] border p-5 ${styles.panel}`}>
              <h2 className={`text-lg font-semibold ${styles.textMain}`}>Keyboard Shortcuts</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Enter", "Backspace", "Esc", "+", "−", "×", "÷", "%"].map((shortcut) => (
                  <span
                    key={shortcut}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles.chip}`}
                  >
                    {shortcut}
                  </span>
                ))}
              </div>
              <p className={`mt-4 text-sm ${styles.textMuted}`}>
                These shortcuts mirror the touch buttons, which makes the tool usable on both desktop and mobile.
              </p>
            </div>
          </section>

          <section className="mx-auto w-full max-w-[440px]">
            <div className={`rounded-[2.5rem] border p-4 md:p-5 ${styles.card}`}>
              <div className={`rounded-[2rem] border p-4 md:p-5 ${styles.display}`}>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowHistory((current) => !current)}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${styles.buttonGhost}`}
                    aria-label="Toggle calculation history"
                  >
                    <History className="h-4 w-4" />
                  </button>

                  <div className={`text-[10px] font-semibold uppercase tracking-[0.35em] ${styles.textDim}`}>
                    Live Preview
                  </div>

                  <button
                    type="button"
                    onClick={toggleTheme}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${styles.buttonGhost}`}
                    aria-label="Toggle calculator theme"
                  >
                    {theme === "light" ? (
                      <MoonStar className="h-4 w-4" />
                    ) : (
                      <SunMedium className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className={`mt-5 rounded-[1.75rem] border px-5 py-5 md:px-6 md:py-6 ${theme === "dark" ? "bg-white/5" : "bg-black/5"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-[10px] font-semibold uppercase tracking-[0.35em] ${styles.textDim}`}>
                      Expression
                    </span>
                    <span className={`text-[10px] font-semibold uppercase tracking-[0.35em] ${styles.textDim}`}>
                      Calculator
                    </span>
                  </div>

                  <div className="mt-7 text-right">
                    <p
                      className={`overflow-hidden whitespace-nowrap text-right font-light leading-none tracking-tight ${styles.textMain}`}
                      style={{ fontSize: "clamp(2.2rem, 7vw, 4.6rem)" }}
                    >
                      {displayExpression}
                    </p>
                    <p
                      className={`mt-3 overflow-hidden whitespace-nowrap text-right font-medium leading-none ${styles.textMuted}`}
                      style={{ fontSize: "clamp(1.45rem, 4vw, 2.2rem)" }}
                    >
                      {displayResult}
                    </p>
                  </div>

                  {error && (
                    <p className="mt-3 text-right text-xs font-semibold text-rose-500">
                      {error}
                    </p>
                  )}
                </div>

                {showHistory && (
                  <div className={`mt-4 rounded-[1.5rem] border p-4 ${styles.history}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] ${styles.textDim}`}>
                        <History className="h-3.5 w-3.5" />
                        Recent
                      </div>

                      {history.length > 0 && (
                        <button
                          type="button"
                          onClick={clearHistory}
                          className={`text-xs font-semibold transition-colors ${theme === "dark" ? "text-zinc-300 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {history.length === 0 ? (
                      <p className={`mt-3 text-sm ${styles.textMuted}`}>
                        No calculations yet. Your results will appear here.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {history.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-sm ${theme === "dark" ? "border-white/10 bg-white/5" : "border-[#eadfc7] bg-white/80"}`}
                          >
                            <span className={`truncate ${styles.textHistory}`}>{item.expression}</span>
                            <span className={`shrink-0 font-semibold ${styles.textHistory}`}>
                              = {item.result}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {KEYPAD_ROWS.map((row, rowIndex) => (
                  <div
                    key={row.join("")}
                    className={`grid gap-3 ${rowIndex === KEYPAD_ROWS.length - 1 ? "grid-cols-[1.8fr_1fr_1fr_1fr]" : "grid-cols-4"}`}
                  >
                    {row.map((label) => {
                      const isAccent = label === "AC" || label === "=";
                      const isOperator =
                        label === "÷" || label === "×" || label === "−" || label === "+";
                      const isUtility = label === "()" || label === "%" || label === "⌫";

                      const baseClass =
                        "flex h-14 items-center justify-center rounded-full border text-lg font-medium transition-transform duration-150 active:scale-[0.97] md:h-16";
                      const variantClass = isAccent
                        ? styles.buttonAccent
                        : isOperator
                          ? styles.buttonOperator
                          : isUtility
                            ? styles.buttonUtility
                            : styles.buttonDigit;

                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handleButtonPress(label)}
                          className={`${baseClass} ${variantClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${theme === "dark" ? "focus-visible:ring-offset-[#121214]" : "focus-visible:ring-offset-[#fcf8ef]"}`}
                          aria-label={label === "⌫" ? "Delete last character" : label === "()" ? "Parentheses" : label === "=" ? "Calculate answer" : `Calculator key ${label}`}
                        >
                          {label === "⌫" ? (
                            <Delete className="h-5 w-5" />
                          ) : label === "AC" ? (
                            <span className="text-base font-semibold">AC</span>
                          ) : label === "=" ? (
                            <span className="text-xl font-semibold">=</span>
                          ) : label === "0" ? (
                            <span className="pl-1 text-xl">{label}</span>
                          ) : (
                            <span>{label}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
