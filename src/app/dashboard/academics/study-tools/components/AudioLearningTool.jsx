import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Volume2, 
  BookOpen, 
  Hash, 
  Type, 
  Sparkles,
  ChevronLeft,
  GraduationCap
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const ALPHABETS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(char => ({
  id: char,
  display: char,
  pronounce: char,
  example: {
    A: "Apple", B: "Ball", C: "Cat", D: "Dog", E: "Egg", F: "Fish", G: "Goat",
    H: "Hat", I: "Igloo", J: "Jam", K: "Kite", L: "Lion", M: "Moon", N: "Net",
    O: "Orange", P: "Pen", Q: "Queen", R: "Rat", S: "Sun", T: "Top", U: "Umbrella",
    V: "Van", W: "Web", X: "Xylophone", Y: "Yo-yo", Z: "Zebra"
  }[char]
}));

const NUMBERS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  display: (i + 1).toString(),
  pronounce: (i + 1).toString()
}));

const TWO_LETTER_WORDS = [
  "am", "an", "at", "be", "by", "do", "go", "he", "if", "in", "is", "it", 
  "me", "my", "no", "of", "on", "or", "so", "to", "up", "us", "we"
].map(word => ({ id: word, display: word, pronounce: word }));

const THREE_LETTER_WORDS = [
  "bat", "cat", "hat", "mat", "rat", "bed", "fed", "led", "red", "wed",
  "bin", "fin", "pin", "sin", "tin", "cod", "god", "nod", "pod", "rod",
  "bug", "dug", "hug", "jug", "mug", "sun", "fun", "run", "ten", "pen"
].map(word => ({ id: word, display: word, pronounce: word }));

// ─── Components ───────────────────────────────────────────────────────────────

const CategoryCard = ({ icon: Icon, title, active, onClick, colorClass }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 border-2 ${
      active 
        ? `${colorClass} border-current shadow-lg scale-105` 
        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600 shadow-sm"
    }`}
  >
    <Icon size={32} className="mb-2" />
    <span className="text-sm font-bold uppercase tracking-tight">{title}</span>
  </button>
);

const LearningItem = ({ item, colorClass, onSpeak }) => (
  <button
    onClick={() => onSpeak(item)}
    className={`group relative aspect-square bg-white rounded-2xl border-2 border-slate-100 hover:border-current transition-all duration-300 flex flex-col items-center justify-center p-4 hover:shadow-xl active:scale-95 ${colorClass}`}
  >
    <span className="text-4xl font-black mb-1 group-hover:scale-110 transition-transform">
      {item.display}
    </span>
    {item.example && (
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-current">
        {item.example}
      </span>
    )}
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <Volume2 size={16} />
    </div>
  </button>
);

export default function AudioLearningTool() {
  const [category, setCategory] = useState("alphabets"); // alphabets, numbers, 2-letter, 3-letter
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((item) => {
    if (!window.speechSynthesis) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance();
    
    // Custom logic for phonics vs word
    if (category === "alphabets") {
      utterance.text = `${item.pronounce}... for... ${item.example}`;
    } else {
      utterance.text = item.pronounce;
    }

    utterance.rate = 0.8; // Slightly slower for clear pronunciation
    utterance.pitch = 1.1; // Slightly child-friendly pitch
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  }, [category]);

  const currentItems = useMemo(() => {
    switch (category) {
      case "alphabets": return ALPHABETS;
      case "numbers": return NUMBERS;
      case "2-letter": return TWO_LETTER_WORDS;
      case "3-letter": return THREE_LETTER_WORDS;
      default: return [];
    }
  }, [category]);

  const activeColor = useMemo(() => {
    switch (category) {
      case "alphabets": return "text-blue-600 bg-blue-50";
      case "numbers": return "text-orange-600 bg-orange-50";
      case "2-letter": return "text-emerald-600 bg-emerald-50";
      case "3-letter": return "text-purple-600 bg-purple-50";
      default: return "text-slate-600 bg-slate-50";
    }
  }, [category]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 bg-slate-50/50 min-h-screen font-sans text-slate-800">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      {/* Header */}
      <header className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-2xl">
            <GraduationCap className="text-blue-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Audio Learning & Pronunciation</h1>
            <p className="text-slate-500 font-medium whitespace-nowrap">Tap an item to hear how it's pronounced!</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full border border-red-200 shadow-sm">
            Nursery – Primary
          </span>
          <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full border border-indigo-200 shadow-sm flex items-center gap-1">
            <Sparkles size={16} /> Interactive
          </span>
        </div>
      </header>

      {/* Categories Toolbar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <CategoryCard 
          icon={Type} 
          title="Alphabets" 
          active={category === "alphabets"} 
          onClick={() => setCategory("alphabets")}
          colorClass="text-blue-600 bg-blue-50"
        />
        <CategoryCard 
          icon={Hash} 
          title="Numbers" 
          active={category === "numbers"} 
          onClick={() => setCategory("numbers")}
          colorClass="text-orange-600 bg-orange-50"
        />
        <CategoryCard 
          icon={BookOpen} 
          title="2-Letter" 
          active={category === "2-letter"} 
          onClick={() => setCategory("2-letter")}
          colorClass="text-emerald-600 bg-emerald-50"
        />
        <CategoryCard 
          icon={BookOpen} 
          title="3-Letter" 
          active={category === "3-letter"} 
          onClick={() => setCategory("3-letter")}
          colorClass="text-purple-600 bg-purple-50"
        />
      </div>

      {/* Main Display Area */}
      <main className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border-4 border-white min-h-[500px] animate-in fade-in duration-500">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {currentItems.map((item) => (
            <LearningItem 
              key={item.id} 
              item={item} 
              colorClass={category === "alphabets" ? "hover:text-blue-600" : category === "numbers" ? "hover:text-orange-600" : category === "2-letter" ? "hover:text-emerald-600" : "hover:text-purple-600"}
              onSpeak={speak}
            />
          ))}
        </div>

        {currentItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <ChevronLeft size={64} className="mb-4" />
            <p className="text-xl font-bold">Pick a category to start learning!</p>
          </div>
        )}
      </main>

      {/* Speech Indicator */}
      {isSpeaking && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
          <Volume2 size={24} className="text-blue-400" />
          <span className="font-bold tracking-wide">Listening...</span>
        </div>
      )}

      {/* Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <Sparkles className="text-blue-600" size={24} />
          Educational Benefits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-blue-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Develops <strong>phonemic awareness</strong> by hearing clear, repeated pronunciations.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-orange-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Improves <strong>auditory association</strong> between visual symbols and their sounds.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Builds <strong>independence</strong> by allowing students to self-correct and explore.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
