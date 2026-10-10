"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  Search,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Data ───────────────────────────────────────────────────────────────────

const LEVELS = [
  "All Levels",
  "Nursery",
  "KG 1–2",
  "Primary 1–3",
  "Primary 4–6",
  "JHS 1–3",
];
type StudyLevel = (typeof LEVELS)[number];

const SUBJECTS = [
  "All Subjects",
  "Literacy / English",
  "Numeracy / Math",
  "Exam Prep",
  "Science",
  "Our World & People",
  "History of Ghana",
  "Computing / ICT",
  "RME",
  "Creative Arts",
  "Career Technology",
  "Ghanaian Language",
  "PE & Health",
];

const SUBJECT_META: Record<string, { icon: string; label: string }> = {
  "Literacy / English": { icon: "📖", label: "Literacy / English" },
  "Numeracy / Math": { icon: "🔢", label: "Numeracy / Math" },
  "Exam Prep": { icon: "📝", label: "Exam Prep" },
  Science: { icon: "🔬", label: "Science" },
  "Our World & People": { icon: "🌍", label: "Our World & People" },
  "History of Ghana": { icon: "🏛️", label: "History of Ghana" },
  "Computing / ICT": { icon: "💻", label: "Computing / ICT" },
  RME: { icon: "🕊️", label: "RME" },
  "Creative Arts": { icon: "🎨", label: "Creative Arts" },
  "Career Technology": { icon: "⚙️", label: "Career Technology" },
  "Ghanaian Language": { icon: "🗣️", label: "Ghanaian Language" },
  "PE & Health": { icon: "🏃", label: "PE & Health" },
};

const LEVEL_COLORS: Record<string, string> = {
  Nursery: "bg-red-100 text-red-700 border-red-200",
  "KG 1–2": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Primary 1–3": "bg-green-100 text-green-700 border-green-200",
  "Primary 4–6": "bg-blue-100 text-blue-700 border-blue-200",
  "JHS 1–3": "bg-purple-100 text-purple-700 border-purple-200",
};

interface Topic {
  id: number;
  level: string;
  subject: string;
  emoji: string;
  title: string;
  focus: string;
  time: string;
  tags: string[];
  liveUrl?: string;
  external?: boolean;
}

type StudentToolProfile = {
  userType?: string;
  className?: string | null;
  gradeLevel?: number | null;
  gradeLabel?: string | null;
};

const ALL_TOPICS: Topic[] = [
  // ─── ALL LEVELS ───
  {
    id: 1001,
    level: "All Levels",
    subject: "All Subjects",
    emoji: "💬",
    title: "Discussion Forums",
    focus:
      "Class discussion forums for students and teachers. Ask questions, share resources, and collaborate.",
    time: "Any",
    tags: ["discussion", "forum", "questions", "announcements"],
    liveUrl: "/dashboard/academics/study-tools/discussion-forums",
  },
  {
    id: 1000,
    level: "All Levels",
    subject: "Literacy / English",
    emoji: "📖",
    title: "Dictionary & Meaning Explorer",
    focus:
      "Search for words to find their meanings, parts of speech, pronunciation, and examples.",
    time: "Any",
    tags: ["dictionary", "vocabulary", "definitions", "pronunciation"],
    liveUrl: "/dashboard/academics/study-tools/dictionary",
  },
  {
    id: 1002,
    level: "All Levels",
    subject: "Numeracy / Math",
    emoji: "🧮",
    title: "Calculator",
    focus:
      "Phone-style arithmetic with live preview, parentheses, and percentage practice.",
    time: "5 min",
    tags: ["calculator", "arithmetic", "percent", "parentheses"],
    liveUrl: "/dashboard/academics/study-tools/calculator",
  },
  {
    id: 1003,
    level: "All Levels",
    subject: "Exam Prep",
    emoji: "📝",
    title: "BECE Passco",
    focus:
      "Open the BECE past questions archive from 1990 to 2022 for revision and practice.",
    time: "Any",
    tags: ["BECE", "past questions", "passco"],
    liveUrl: "https://passco.org/courses/jhs-bece-past-questions-1990-2022/",
    external: true,
  },
  // ─── NURSERY ───
  {
    id: 101,
    level: "Nursery",
    subject: "Literacy / English",
    emoji: "📢",
    title: "Audio Learning & Pronunciation",
    focus:
      "Tap alphabets, numbers, and words to hear clear audio pronunciation. Helps with phonics and early reading.",
    time: "10 min",
    tags: ["audio", "pronunciation", "alphabets", "numbers"],
    liveUrl: "/dashboard/academics/study-tools/audio-learning",
  },
  {
    id: 1,
    level: "Nursery",
    subject: "Literacy / English",
    emoji: "🔤",
    title: "Alphabet Matching Game",
    focus:
      "Click letter cards to see matching animal, word, and picture. Large colorful cards with sound feedback.",
    time: "8 min",
    tags: ["letters", "phonics", "animals"],
    liveUrl: "/dashboard/academics/study-tools/alphabet-matching",
  },
  {
    id: 2,
    level: "Nursery",
    subject: "Numeracy / Math",
    emoji: "🍎",
    title: "Counting with Fruits",
    focus:
      "Tap fruits to count them 1–10. Big bright objects appear/disappear with each tap. Fun pop animations.",
    time: "6 min",
    tags: ["counting", "numbers", "1–10"],
    liveUrl: "/dashboard/academics/study-tools/counting-with-fruits",
  },
  {
    id: 3,
    level: "Nursery",
    subject: "Creative Arts",
    emoji: "🎨",
    title: "Colour Mixing Explorer",
    focus:
      "Drag and drop two primary colour buckets to mix and see the resulting colour name and swatch.",
    time: "7 min",
    tags: ["colours", "mixing", "primary"],
    liveUrl: "/dashboard/academics/study-tools/colour-mixing",
  },
  {
    id: 4,
    level: "Nursery",
    subject: "Our World & People",
    emoji: "🧩",
    title: "My Body Parts Puzzle",
    focus:
      "Click on highlighted body parts on a cartoon child and hear/see the name pronounced.",
    time: "8 min",
    tags: ["body", "health", "vocabulary"],
    liveUrl: "/dashboard/academics/study-tools/my-body-parts-puzzle",
  },
  {
    id: 5,
    level: "Nursery",
    subject: "Ghanaian Language",
    emoji: "👂",
    title: "Twi/Ga Greetings Match",
    focus:
      "Match audio greetings to pictures (morning, afternoon, thank you). Simple two-card flip matching.",
    time: "6 min",
    tags: ["greetings", "language", "Twi", "Ga"],
    liveUrl: "/dashboard/academics/study-tools/twi-ga-greetings-match",
  },
  {
    id: 6,
    level: "Nursery",
    subject: "Our World & People",
    emoji: "🌦️",
    title: "Weather Watcher",
    focus:
      "Tap the weather icon that matches today's picture (sunny, rainy, cloudy, windy) and see an animation.",
    time: "5 min",
    tags: ["weather", "seasons", "observation"],
    liveUrl: "/dashboard/academics/study-tools/weather-watcher",
  },

  // ─── KG 1–2 ───
  {
    id: 7,
    level: "KG 1–2",
    subject: "Literacy / English",
    emoji: "🔡",
    title: "Phonics Sound Builder",
    focus:
      "Click consonant + vowel cards to build CVC words (cat, dog, bin). Hear each sound then the full word.",
    time: "10 min",
    tags: ["CVC", "blending", "phonics"],
    liveUrl: "/dashboard/academics/study-tools/phonics-sound-builder",
  },
  {
    id: 8,
    level: "KG 1–2",
    subject: "Numeracy / Math",
    emoji: "📏",
    title: "Number Line Adventures",
    focus:
      "Drag a character along a number line 0–20. Tap +1 or −1 to hop. Count forward and backward.",
    time: "10 min",
    tags: ["number line", "counting", "addition"],
    liveUrl: "/dashboard/academics/study-tools/number-line-adventures",
  },
  {
    id: 9,
    level: "KG 1–2",
    subject: "Numeracy / Math",
    emoji: "⚖️",
    title: "More or Less Balance Scale",
    focus:
      "Add objects to both sides of a balance. See which side is heavier. Introduces comparison concepts.",
    time: "8 min",
    tags: ["comparison", "weight", "more/less"],
    liveUrl: "/dashboard/academics/study-tools/more-or-less-balance-scale",
  },
  {
    id: 10,
    level: "KG 1–2",
    subject: "Our World & People",
    emoji: "👨‍👩‍👧",
    title: "My Family Tree",
    focus:
      "Drag family role cards (mum, dad, sister, brother, grandpa) onto a tree. Learn family vocabulary.",
    time: "8 min",
    tags: ["family", "community", "vocabulary"],
    liveUrl: "/dashboard/academics/study-tools/my-family-tree",
  },
  {
    id: 11,
    level: "KG 1–2",
    subject: "Creative Arts",
    emoji: "🔶",
    title: "Shape Sorter",
    focus:
      "Drag 2D shapes (circle, square, triangle, rectangle) into matching outlines. Highlight sides and corners.",
    time: "8 min",
    tags: ["shapes", "geometry", "sorting"],
    liveUrl: "/dashboard/academics/study-tools/shape-sorter",
  },
  {
    id: 12,
    level: "KG 1–2",
    subject: "Ghanaian Language",
    emoji: "🌺",
    title: "Ghanaian Names & Meanings",
    focus:
      "Click day-name cards (Kojo, Ama, Kwame…) to learn their Akan meanings and day of the week they represent.",
    time: "9 min",
    tags: ["Akan", "names", "days", "culture"],
    liveUrl: "/dashboard/academics/study-tools/ghanaian-names-meanings",
  },
  {
    id: 13,
    level: "KG 1–2",
    subject: "PE & Health",
    emoji: "🍽️",
    title: "Healthy Foods Sorter",
    focus:
      "Drag food images into 'Healthy' or 'Not Healthy' plates. Learn about nutrition in a fun visual way.",
    time: "7 min",
    tags: ["nutrition", "health", "sorting"],
    liveUrl: "/dashboard/academics/study-tools/healthy-foods-sorter",
  },

  // ─── PRIMARY 1–3 ───
  {
    id: 14,
    level: "Primary 1–3",
    subject: "Numeracy / Math",
    emoji: "➕",
    title: "Addition & Subtraction Machine",
    focus:
      "Animated conveyor belt adds or removes blocks. Set two numbers and see the sum/difference live.",
    time: "12 min",
    tags: ["addition", "subtraction", "place value"],
    liveUrl: "/dashboard/academics/study-tools/addition-subtraction-machine",
  },
  {
    id: 15,
    level: "Primary 1–3",
    subject: "Numeracy / Math",
    emoji: "🕐",
    title: "Telling the Time Clock",
    focus:
      "Drag clock hands to set hours and half-hours. Shows both analogue and digital display in sync.",
    time: "10 min",
    tags: ["time", "clock", "analogue", "digital"],
    liveUrl: "/dashboard/academics/study-tools/telling-the-time",
  },
  {
    id: 16,
    level: "Primary 1–3",
    subject: "Numeracy / Math",
    emoji: "💰",
    title: "Ghana Cedis & Pesewas Counter",
    focus:
      "Drag coin and note images to build amounts. Practice making change with GHS denominations.",
    time: "12 min",
    tags: ["money", "GHS", "counting", "real-life"],
    liveUrl: "/dashboard/academics/study-tools/ghana-cedis-pesewas-counter",
  },
  {
    id: 17,
    level: "Primary 1–3",
    subject: "Literacy / English",
    emoji: "✍️",
    title: "Sentence Builder",
    focus:
      "Drag word tiles into order to form simple sentences. Colour-coded by noun, verb, adjective roles.",
    time: "10 min",
    tags: ["sentences", "grammar", "word order"],
    liveUrl: "/dashboard/academics/study-tools/sentence-builder",
  },
  {
    id: 18,
    level: "Primary 1–3",
    subject: "Literacy / English",
    emoji: "📚",
    title: "Sight Word Flash Cards",
    focus:
      "Timed flash card game with Ghana-curriculum sight words. Track score and speed across 3 rounds.",
    time: "10 min",
    tags: ["sight words", "reading", "fluency"],
    liveUrl: "/dashboard/academics/study-tools/sight-word-flash-cards",
  },
  {
    id: 19,
    level: "Primary 1–3",
    subject: "Science",
    emoji: "🌱",
    title: "Plant Life Cycle Animator",
    focus:
      "Click stages (seed → seedling → plant → flower → fruit) to animate growth with labels.",
    time: "12 min",
    tags: ["life cycle", "plants", "biology"],
    liveUrl: "/dashboard/academics/study-tools/plant-life-cycle-animator",
  },
  {
    id: 20,
    level: "Primary 1–3",
    subject: "Science",
    emoji: "🐛",
    title: "Butterfly Life Cycle Explorer",
    focus:
      "Step through metamorphosis: egg → caterpillar → chrysalis → butterfly. Drag to correct sequence.",
    time: "10 min",
    tags: ["life cycle", "insects", "metamorphosis"],
    liveUrl: "/dashboard/academics/study-tools/butterfly-life-cycle-explorer",
  },
  {
    id: 21,
    level: "Primary 1–3",
    subject: "Our World & People",
    emoji: "🗺️",
    title: "Ghana Regions Map Explorer",
    focus:
      "Click on Ghana's 16 regions to learn region name, capital city, and a cultural fact.",
    time: "15 min",
    tags: ["Ghana", "regions", "geography", "map"],
    liveUrl: "/dashboard/academics/study-tools/ghana-regions-map-explorer",
  },
  {
    id: 22,
    level: "Primary 1–3",
    subject: "History of Ghana",
    emoji: "🏆",
    title: "Ghana Symbols Identifier",
    focus:
      "Match national symbols (coat of arms, flag, Black Star) to their names and meanings.",
    time: "10 min",
    tags: ["national symbols", "identity", "Ghana"],
    liveUrl: "/dashboard/academics/study-tools/ghana-symbols-identifier",
  },
  {
    id: 23,
    level: "Primary 1–3",
    subject: "RME",
    emoji: "🌟",
    title: "Ghanaian Values Sorter",
    focus:
      "Drag scenario cards (sharing, honesty, respect) into the matching value category.",
    time: "10 min",
    tags: ["values", "morals", "character"],
    liveUrl: "/dashboard/academics/study-tools/ghanaian-values-sorter",
  },
  {
    id: 24,
    level: "Primary 1–3",
    subject: "Creative Arts",
    emoji: "🎭",
    title: "Kente Pattern Builder",
    focus:
      "Drag coloured strips to weave a Kente pattern. Learn about colour symbolism in Kente cloth.",
    time: "12 min",
    tags: ["Kente", "culture", "patterns", "art"],
    liveUrl: "/dashboard/academics/study-tools/kente-pattern-builder",
  },
  {
    id: 25,
    level: "Primary 1–3",
    subject: "Computing / ICT",
    emoji: "🖱️",
    title: "Parts of a Computer Quiz",
    focus:
      "Click on highlighted parts of a computer image and match each to its function name.",
    time: "10 min",
    tags: ["ICT", "hardware", "computing basics"],
    liveUrl: "/dashboard/academics/study-tools/parts-of-a-computer-quiz",
  },

  // ─── PRIMARY 4–6 ───
  {
    id: 26,
    level: "Primary 4–6",
    subject: "Numeracy / Math",
    emoji: "🥧",
    title: "Fraction Builder",
    focus:
      "Slider-controlled pie + bar model shows numerator/denominator. Explore equivalents and simplification.",
    time: "15 min",
    tags: ["fractions", "equivalence", "bar model"],
    liveUrl: "/dashboard/academics/study-tools/fraction-builder",
  },
  {
    id: 27,
    level: "Primary 4–6",
    subject: "Numeracy / Math",
    emoji: "🔢",
    title: "Decimal Place Value Explorer",
    focus:
      "Visual place value grid for ones, tenths, hundredths. Sliders adjust each digit and show number line.",
    time: "12 min",
    tags: ["decimals", "place value", "number line"],
    liveUrl: "/dashboard/academics/study-tools/decimal-place-value-explorer",
  },
  {
    id: 28,
    level: "Primary 4–6",
    subject: "Numeracy / Math",
    emoji: "✖️",
    title: "Multiplication Grid Explorer",
    focus:
      "Click a times table (1–12), see a highlighted row/column in a 12×12 grid with skip-count animation.",
    time: "12 min",
    tags: ["multiplication", "tables", "skip counting"],
    liveUrl: "/dashboard/academics/study-tools/multiplication-grid-explorer",
  },
  {
    id: 29,
    level: "Primary 4–6",
    subject: "Numeracy / Math",
    emoji: "📐",
    title: "Area & Perimeter Calculator",
    focus:
      "Drag to resize rectangles on a grid. See area and perimeter update live with formula shown.",
    time: "15 min",
    tags: ["area", "perimeter", "geometry"],
    liveUrl: "/dashboard/academics/study-tools/area-perimeter-calculator",
  },
  {
    id: 30,
    level: "Primary 4–6",
    subject: "Numeracy / Math",
    emoji: "⚖️",
    title: "Measurement Conversion Station",
    focus:
      "Convert between km/m/cm, kg/g, litres/ml using sliders with visual bar comparisons.",
    time: "12 min",
    tags: ["measurement", "conversion", "units"],
    liveUrl: "/dashboard/academics/study-tools/measurement-conversion-station",
  },
  {
    id: 31,
    level: "Primary 4–6",
    subject: "Literacy / English",
    emoji: "🔍",
    title: "Parts of Speech Sorter",
    focus:
      "Drag words from a sentence into noun, verb, adjective, adverb buckets. Instant feedback given.",
    time: "12 min",
    tags: ["grammar", "parts of speech", "sentence"],
    liveUrl: "/dashboard/academics/study-tools/parts-of-speech-sorter",
  },
  {
    id: 32,
    level: "Primary 4–6",
    subject: "Literacy / English",
    emoji: "📝",
    title: "Punctuation Fixer",
    focus:
      "Tap to add missing full stops, commas, question marks. 3 lives per round with score tracker.",
    time: "10 min",
    tags: ["punctuation", "editing", "writing"],
    liveUrl: "/dashboard/academics/study-tools/punctuation-fixer",
  },
  {
    id: 33,
    level: "Primary 4–6",
    subject: "Science",
    emoji: "🧲",
    title: "States of Matter Visualizer",
    focus:
      "Heat or cool a substance with a slider. See particle animation change between solid, liquid, gas.",
    time: "15 min",
    tags: ["matter", "states", "particles", "temperature"],
    liveUrl: "/dashboard/academics/study-tools/states-of-matter-visualizer",
  },
  {
    id: 34,
    level: "Primary 4–6",
    subject: "Science",
    emoji: "🌊",
    title: "Water Cycle Animator",
    focus:
      "Click each stage (evaporation, condensation, precipitation, collection) to animate and label it.",
    time: "12 min",
    tags: ["water cycle", "weather", "environment"],
    liveUrl: "/dashboard/academics/study-tools/water-cycle-animator",
  },
  {
    id: 35,
    level: "Primary 4–6",
    subject: "Science",
    emoji: "🍽️",
    title: "Food Chain Builder",
    focus:
      "Drag organisms into producer → herbivore → carnivore → apex predator chain. Incorrect links flash red.",
    time: "15 min",
    tags: ["food chain", "ecology", "animals"],
    liveUrl: "/dashboard/academics/study-tools/food-chain-builder",
  },
  {
    id: 36,
    level: "Primary 4–6",
    subject: "Our World & People",
    emoji: "🗺️",
    title: "West Africa Political Map Quiz",
    focus:
      "Click on country outlines and name them. Progress bar tracks identified countries.",
    time: "15 min",
    tags: ["West Africa", "geography", "map quiz"],
    liveUrl: "/dashboard/academics/study-tools/west-africa-political-map-quiz",
  },
  {
    id: 37,
    level: "Primary 4–6",
    subject: "History of Ghana",
    emoji: "📅",
    title: "Ghana Independence Timeline",
    focus:
      "Drag historical events onto a timeline (pre-colonial → colonial → independence → republic).",
    time: "15 min",
    tags: ["independence", "history", "timeline", "1957"],
    liveUrl: "/dashboard/academics/study-tools/ghana-independence-timeline",
  },
  {
    id: 38,
    level: "Primary 4–6",
    subject: "Computing / ICT",
    emoji: "💾",
    title: "File & Folder Organiser",
    focus:
      "Drag files into correct folder types. Learn file extensions (.doc, .jpg, .mp3). Timed challenge mode.",
    time: "12 min",
    tags: ["files", "folders", "ICT", "organisation"],
    liveUrl: "/dashboard/academics/study-tools/file-folder-organiser",
  },
  {
    id: 39,
    level: "Primary 4–6",
    subject: "Career Technology",
    emoji: "🔨",
    title: "Simple Machines Explorer",
    focus:
      "Click lever, pulley, wheel/axle, inclined plane to see animated examples from everyday Ghanaian life.",
    time: "15 min",
    tags: ["simple machines", "force", "technology"],
    liveUrl: "/dashboard/academics/study-tools/simple-machines-explorer",
  },
  {
    id: 40,
    level: "Primary 4–6",
    subject: "Creative Arts",
    emoji: "🥁",
    title: "Ghanaian Instruments Identifier",
    focus:
      "Click on instrument images (fontomfrom, kpanlogo, atenteben) to hear a clip and see a description.",
    time: "10 min",
    tags: ["music", "instruments", "culture", "Ghana"],
    liveUrl: "/dashboard/academics/study-tools/ghanaian-instruments-identifier",
  },

  // ─── JHS 1–3 ───
  {
    id: 41,
    level: "JHS 1–3",
    subject: "Numeracy / Math",
    emoji: "🔵",
    title: "Algebra Balance Scale",
    focus:
      "Drag variable and constant tiles onto a balance to solve linear equations. See step-by-step workings.",
    time: "20 min",
    tags: ["algebra", "equations", "balance", "variables"],
    liveUrl: "/dashboard/academics/study-tools/algebra-balance",
  },
  {
    id: 42,
    level: "JHS 1–3",
    subject: "Numeracy / Math",
    emoji: "📈",
    title: "Function Graphing Tool",
    focus:
      "Enter a linear or quadratic function. See it plotted on coordinate axes with key points labelled.",
    time: "25 min",
    tags: ["functions", "graphs", "coordinates", "algebra"],
    liveUrl: "/dashboard/academics/study-tools/function-graphing-tool",
  },
  {
    id: 43,
    level: "JHS 1–3",
    subject: "Numeracy / Math",
    emoji: "📊",
    title: "Statistics & Data Visualiser",
    focus:
      "Enter a dataset; choose bar, pie, or line chart. Calculate mean, median, mode interactively.",
    time: "20 min",
    tags: ["statistics", "data", "charts", "mean"],
    liveUrl: "/dashboard/academics/study-tools/statistics-data-visualiser",
  },
  {
    id: 44,
    level: "JHS 1–3",
    subject: "Numeracy / Math",
    emoji: "🎲",
    title: "Probability Simulator",
    focus:
      "Simulate coin flips, dice rolls, or a spinner. See theoretical vs experimental probability update live.",
    time: "20 min",
    tags: ["probability", "chance", "experiment", "simulation"],
    liveUrl: "/dashboard/academics/study-tools/probability-simulator",
  },
  {
    id: 45,
    level: "JHS 1–3",
    subject: "Numeracy / Math",
    emoji: "📐",
    title: "Geometry Angle Explorer",
    focus:
      "Drag a protractor arm to measure angles. Classify acute, right, obtuse, reflex. Includes triangle angles.",
    time: "18 min",
    tags: ["angles", "geometry", "protractor", "triangles"],
    liveUrl: "/dashboard/academics/study-tools/geometry-angle-explorer",
  },
  {
    id: 46,
    level: "JHS 1–3",
    subject: "Numeracy / Math",
    emoji: "🔄",
    title: "Symmetry & Transformations",
    focus:
      "Reflect, rotate, and translate shapes on a coordinate grid. See transformation notation generated.",
    time: "20 min",
    tags: ["transformations", "symmetry", "coordinates"],
    liveUrl: "/dashboard/academics/study-tools/symmetry-transformations",
  },
  {
    id: 47,
    level: "JHS 1–3",
    subject: "Numeracy / Math",
    emoji: "🔍",
    title: "Prime & Factor Visualiser",
    focus:
      "Input a number to see its prime factorisation as a tree. Sieve of Eratosthenes grid for primes 1–100.",
    time: "15 min",
    tags: ["primes", "factors", "multiples", "LCM", "HCF"],
    liveUrl: "/dashboard/academics/study-tools/prime-factor-visualiser",
  },
  {
    id: 48,
    level: "JHS 1–3",
    subject: "Literacy / English",
    emoji: "📖",
    title: "Reading Comprehension Quiz",
    focus:
      "Read a Ghana-context passage, answer multiple choice questions, get instant explanatory feedback.",
    time: "20 min",
    tags: ["comprehension", "reading", "inference", "BECE"],
    liveUrl: "/dashboard/academics/study-tools/reading-comprehension-quiz",
  },
  {
    id: 49,
    level: "JHS 1–3",
    subject: "Literacy / English",
    emoji: "✍️",
    title: "Essay Structure Planner",
    focus:
      "Drag intro, body paragraphs, and conclusion blocks into order. Add topic sentences with AI hints.",
    time: "18 min",
    tags: ["writing", "essay", "structure", "BECE"],
    liveUrl: "/dashboard/academics/study-tools/essay-structure-planner",
  },
  {
    id: 50,
    level: "JHS 1–3",
    subject: "Literacy / English",
    emoji: "🔤",
    title: "Vocabulary in Context Explorer",
    focus:
      "Read a sentence with a highlighted word; select the correct meaning from 4 options. 20-word decks.",
    time: "12 min",
    tags: ["vocabulary", "context clues", "inference"],
    liveUrl: "/dashboard/academics/study-tools/vocabulary-in-context-explorer",
  },
  {
    id: 51,
    level: "JHS 1–3",
    subject: "Science",
    emoji: "⚗️",
    title: "Periodic Table Element Finder",
    focus:
      "Click any element to see atomic number, mass, group, and uses. Filter by metals/non-metals/metalloids.",
    time: "20 min",
    tags: ["chemistry", "elements", "periodic table"],
    liveUrl: "/dashboard/academics/study-tools/periodic-table-element-finder",
  },
  {
    id: 52,
    level: "JHS 1–3",
    subject: "Science",
    emoji: "🔬",
    title: "Cell Structure Labeller",
    focus:
      "Drag labels onto a plant or animal cell diagram. Toggle between cell types to compare organelles.",
    time: "18 min",
    tags: ["biology", "cells", "organelles", "labelling"],
    liveUrl: "/dashboard/academics/study-tools/cell-structure-labeller",
  },
  {
    id: 53,
    level: "JHS 1–3",
    subject: "Science",
    emoji: "💡",
    title: "Electric Circuit Builder",
    focus:
      "Drag battery, wire, bulb, switch onto a canvas. See if circuit is complete; bulb lights up or dims.",
    time: "20 min",
    tags: ["physics", "circuits", "electricity", "STEM"],
    liveUrl: "/dashboard/academics/study-tools/electric-circuit-builder",
  },
  {
    id: 54,
    level: "JHS 1–3",
    subject: "Science",
    emoji: "🌍",
    title: "Ecosystem & Biodiversity Explorer",
    focus:
      "Build a food web by connecting organisms. Remove one species and watch the cascading effect animate.",
    time: "22 min",
    tags: ["ecology", "food web", "biodiversity", "JHS3"],
    liveUrl: "/dashboard/academics/study-tools/ecosystem-biodiversity-explorer",
  },
  {
    id: 55,
    level: "JHS 1–3",
    subject: "History of Ghana",
    emoji: "🗺️",
    title: "Pre-Colonial Kingdoms Timeline",
    focus:
      "Drag Ashanti, Dagomba, Denkyira, and Fante kingdoms onto a timeline. Click for key facts and maps.",
    time: "18 min",
    tags: ["history", "kingdoms", "Ashanti", "BECE"],
    liveUrl: "/dashboard/academics/study-tools/pre-colonial-kingdoms-timeline",
  },
  {
    id: 56,
    level: "JHS 1–3",
    subject: "Computing / ICT",
    emoji: "🌐",
    title: "Internet Safety Scenarios",
    focus:
      "Tap through real-life scenarios (spam, passwords, cyberbullying). Choose safe/unsafe actions. Score tracked.",
    time: "15 min",
    tags: ["internet safety", "ICT", "digital literacy"],
    liveUrl: "/dashboard/academics/study-tools/internet-safety-scenarios",
  },
  {
    id: 57,
    level: "JHS 1–3",
    subject: "Computing / ICT",
    emoji: "🤖",
    title: "Algorithm & Flowchart Builder",
    focus:
      "Drag start, process, decision, end blocks to build flowcharts for everyday tasks. Trace execution.",
    time: "20 min",
    tags: ["algorithms", "flowcharts", "computational thinking"],
    liveUrl: "/dashboard/academics/study-tools/algorithm-flowchart-builder",
  },
  {
    id: 58,
    level: "JHS 1–3",
    subject: "RME",
    emoji: "🕊️",
    title: "World Religions Comparator",
    focus:
      "Select two religions side by side. Compare sacred texts, places of worship, festivals, beliefs.",
    time: "15 min",
    tags: ["religions", "RME", "comparison", "BECE"],
    liveUrl: "/dashboard/academics/study-tools/world-religions-comparator",
  },
  {
    id: 59,
    level: "JHS 1–3",
    subject: "Career Technology",
    emoji: "🏗️",
    title: "Building Materials Identifier",
    focus:
      "Click on construction materials (laterite, concrete, timber) to learn properties and local uses in Ghana.",
    time: "15 min",
    tags: ["construction", "materials", "career", "Ghana"],
    liveUrl: "/dashboard/academics/study-tools/building-materials-identifier",
  },
  {
    id: 60,
    level: "JHS 1–3",
    subject: "Career Technology",
    emoji: "🌾",
    title: "Crop Production Cycle",
    focus:
      "Step through land preparation, planting, weeding, harvesting. Match correct tool to each stage.",
    time: "18 min",
    tags: ["agriculture", "crops", "farming", "Ghana"],
    liveUrl: "/dashboard/academics/study-tools/crop-production-cycle",
  },
  {
    id: 61,
    level: "JHS 1–3",
    subject: "PE & Health",
    emoji: "🧬",
    title: "Reproductive Health Quiz",
    focus:
      "Age-appropriate Q&A on puberty changes, hygiene, and responsible choices. Immediate feedback given.",
    time: "15 min",
    tags: ["health", "puberty", "life skills", "JHS"],
    liveUrl: "/dashboard/academics/study-tools/reproductive-health-quiz",
  },
  {
    id: 62,
    level: "JHS 1–3",
    subject: "Ghanaian Language",
    emoji: "🗣️",
    title: "Twi/Ga Proverbs & Idioms",
    focus: "Learn the meaning and context of common Ghanaian proverbs. Translate between English and local languages.",
    time: "15 min",
    tags: ["language", "proverbs", "culture", "Twi", "Ga"],
    liveUrl: "/dashboard/academics/study-tools/proverbs-idioms",
  },
  {
    id: 63,
    level: "JHS 1–3",
    subject: "Our World & People",
    emoji: "🌍",
    title: "Climate Change Simulator",
    focus: "Explore the impact of deforestation and pollution on the environment. Propose sustainable solutions.",
    time: "20 min",
    tags: ["environment", "climate change", "sustainability", "geography"],
    liveUrl: "/dashboard/academics/study-tools/climate-change-simulator",
  },
  {
    id: 64,
    level: "JHS 1–3",
    subject: "Computing / ICT",
    emoji: "📊",
    title: "Spreadsheet Data Analysis Lab",
    focus: "Practice basic spreadsheet functions (SUM, AVERAGE, IF). Analyze simple datasets and create charts.",
    time: "25 min",
    tags: ["ICT", "spreadsheets", "data", "excel"],
    liveUrl: "/dashboard/academics/study-tools/spreadsheet-data-analysis",
  },
  {
    id: 65,
    level: "JHS 1–3",
    subject: "Creative Arts",
    emoji: "🏺",
    title: "African Art History & Motifs",
    focus: "Identify different Adinkra symbols and traditional African art styles. Learn their meanings and origins.",
    time: "15 min",
    tags: ["art", "history", "Adinkra", "culture"],
    liveUrl: "/dashboard/academics/study-tools/african-art-history",
  },
  {
    id: 66,
    level: "JHS 1–3",
    subject: "PE & Health",
    emoji: "🚑",
    title: "First Aid & Emergency Response",
    focus: "Interactive scenarios for dealing with minor injuries, burns, and identifying emergencies. Learn basic first aid.",
    time: "20 min",
    tags: ["health", "first aid", "safety", "emergency"],
    liveUrl: "/dashboard/academics/study-tools/first-aid-response",
  },
  {
    id: 67,
    level: "JHS 1–3",
    subject: "Exam Prep",
    emoji: "⏱️",
    title: "BECE Mock Exam Simulator",
    focus: "Take timed, randomized mock exams across core subjects. Review detailed explanations for correct answers.",
    time: "45 min",
    tags: ["BECE", "mock exam", "timed practice", "revision"],
    liveUrl: "/dashboard/academics/study-tools/bece-mock-simulator",
  },
  {
    id: 68,
    level: "JHS 1–3",
    subject: "Science",
    emoji: "🫀",
    title: "Human Digestive System Labeller",
    focus: "Map the journey of food through the digestive tract. Identify organs and their specific functions.",
    time: "15 min",
    tags: ["biology", "anatomy", "digestion", "human body"],
    liveUrl: "/dashboard/academics/study-tools/digestive-system-labeller",
  },
];

const FEATURED_TOPIC_IDS = new Set([1001, 1000, 1002, 1003]);

const FEATURED_TOOL_COPY: Record<
  number,
  { badge: string; cta: string; surface: string }
> = {
  1001: {
    badge: "Community",
    cta: "Join discussion",
    surface: "from-indigo-500/10 via-sky-500/10 to-background",
  },
  1000: {
    badge: "Language",
    cta: "Search words",
    surface: "from-emerald-500/10 via-teal-500/10 to-background",
  },
  1002: {
    badge: "Math",
    cta: "Open calculator",
    surface: "from-amber-500/10 via-orange-500/10 to-background",
  },
  1003: {
    badge: "Exam Prep",
    cta: "Open Passco",
    surface: "from-amber-500/10 via-rose-500/10 to-background",
  },
};

function matchesTopic(
  topic: Topic,
  activeLevel: string,
  activeSubject: string,
  search: string,
) {
  const lvl = activeLevel === "All Levels" || topic.level === activeLevel;
  const sub = activeSubject === "All Subjects" || topic.subject === activeSubject;
  const q = search.trim().toLowerCase();
  const srch =
    !q ||
    topic.title.toLowerCase().includes(q) ||
    topic.tags.some((tag) => tag.toLowerCase().includes(q)) ||
    topic.subject.toLowerCase().includes(q);
  return lvl && sub && srch;
}

// ─── Component ───────────────────────────────────────────────────────────────
function resolveStudentStudyLevelFromGradeLevel(
  gradeLevel?: number | null,
): StudyLevel | null {
  if (typeof gradeLevel !== "number" || Number.isNaN(gradeLevel)) {
    return null;
  }

  if (gradeLevel >= 1 && gradeLevel <= 3) return LEVELS[1];
  if (gradeLevel >= 4 && gradeLevel <= 5) return LEVELS[2];
  if (gradeLevel >= 6 && gradeLevel <= 8) return LEVELS[3];
  if (gradeLevel >= 9 && gradeLevel <= 11) return LEVELS[4];
  if (gradeLevel >= 12 && gradeLevel <= 14) return LEVELS[5];
  return null;
}

function resolveStudentStudyLevelFromText(
  value?: string | null,
): StudyLevel | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");

  if (normalized.includes("creche") || normalized.includes("nursery")) {
    return LEVELS[1];
  }

  if (normalized.includes("kg")) {
    return LEVELS[2];
  }

  if (
    normalized.includes("basic 1") ||
    normalized.includes("basic 2") ||
    normalized.includes("basic 3") ||
    normalized.includes("primary 1") ||
    normalized.includes("primary 2") ||
    normalized.includes("primary 3")
  ) {
    return LEVELS[3];
  }

  if (
    normalized.includes("basic 4") ||
    normalized.includes("basic 5") ||
    normalized.includes("basic 6") ||
    normalized.includes("primary 4") ||
    normalized.includes("primary 5") ||
    normalized.includes("primary 6")
  ) {
    return LEVELS[4];
  }

  if (normalized.includes("jhs")) {
    return LEVELS[5];
  }

  return null;
}

export default function StudyToolsPage() {
  const { data: session, status } = useSession();
  const [activeLevel, setActiveLevel] = useState<StudyLevel>(LEVELS[0]);
  const [activeSubject, setActiveSubject] = useState("All Subjects");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [studentLevel, setStudentLevel] = useState<StudyLevel | null>(null);
  const [studentClassName, setStudentClassName] = useState("");
  const [studentGradeLabel, setStudentGradeLabel] = useState("");
  const [hasResolvedStudentProfile, setHasResolvedStudentProfile] = useState(false);

  const isStudent = session?.user?.role === "student";
  const isStudentLevelLocked = isStudent && Boolean(studentLevel);
  const isResolvingStudentLevel =
    isStudent && status === "authenticated" && !hasResolvedStudentProfile;
  const effectiveLevel = studentLevel ?? activeLevel;

  useEffect(() => {
    if (status !== "authenticated" || !isStudent) {
      return;
    }

    let isMounted = true;

    fetch("/api/user/profile")
      .then((response) => response.json())
      .then((profile: StudentToolProfile & { error?: string }) => {
        if (!isMounted || profile?.error || profile.userType !== "STUDENT") {
          return;
        }

        const resolvedLevel =
          resolveStudentStudyLevelFromGradeLevel(profile.gradeLevel) ||
          resolveStudentStudyLevelFromText(profile.gradeLabel) ||
          resolveStudentStudyLevelFromText(profile.className);

        setStudentClassName(profile.className || "");
        setStudentGradeLabel(profile.gradeLabel || "");

        if (resolvedLevel) {
          setStudentLevel(resolvedLevel);
          setActiveLevel(resolvedLevel);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) {
          setHasResolvedStudentProfile(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isStudent, status]);

  const featuredTopics = useMemo(
    () => ALL_TOPICS.filter((topic) => FEATURED_TOPIC_IDS.has(topic.id)),
    [],
  );

  const regularTopics = useMemo(
    () =>
      ALL_TOPICS.filter(
        (topic) =>
          !FEATURED_TOPIC_IDS.has(topic.id) &&
          matchesTopic(topic, effectiveLevel, activeSubject, search),
      ),
    [effectiveLevel, activeSubject, search],
  );

  const totalVisibleTopics = featuredTopics.length + regularTopics.length;



  return (
    <div className="space-y-6 pb-10">
      {/* ── Page header ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📚</span>
          <h1 className="text-2xl font-bold text-foreground">
            Study Tools Catalogue
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {ALL_TOPICS.length} interactive learning prompts · Ghana NaCCA
          curriculum · Nursery → JHS 3
        </p>
      </div>

      {/* ── Search ── */}
      {isStudentLevelLocked && (
        <p className="text-sm text-primary">
          Showing tools for {studentGradeLabel || studentLevel}
          {studentClassName ? ` (${studentClassName})` : ""}. Dictionary,
          Discussion Forums, BECE Passco, and Calculator stay available for
          every student.
        </p>
      )}
      {isStudent && !isStudentLevelLocked && isResolvingStudentLevel && (
        <p className="text-sm text-muted-foreground">
          Checking your class to personalize your study tools.
        </p>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search topics, tags or subjects…"
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-background border border-border focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* ── Level filter ── */}
      {isStudentLevelLocked ? (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Level locked to {studentLevel}
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setActiveLevel(l)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeLevel === l
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:border-primary hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {/* ── Subject filter ── */}
      <div className="flex flex-wrap gap-2">
        {SUBJECTS.map((s) => {
          const m = SUBJECT_META[s];
          return (
            <button
              key={s}
              onClick={() => setActiveSubject(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeSubject === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:border-primary hover:text-foreground"
              }`}
            >
              {m ? `${m.icon} ` : ""}
              {s}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Showing{" "}
        <span className="font-semibold text-foreground">{totalVisibleTopics}</span>{" "}
        of {ALL_TOPICS.length} tools
      </p>

      {featuredTopics.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
                Featured tools
              </p>
              <h2 className="text-xl font-black tracking-tight text-foreground">
                Fast access to the essentials
              </h2>
              <p className="text-sm text-muted-foreground">
                These are pinned above the catalogue for immediate use.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              {featuredTopics.length} highlighted
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {featuredTopics.map((topic) => {
              const subMeta = SUBJECT_META[topic.subject] || {
                icon: "📌",
                label: topic.subject,
              };
              const levelColor =
                LEVEL_COLORS[topic.level] ||
                "bg-gray-100 text-gray-700 border-gray-200";
              const featuredCopy = FEATURED_TOOL_COPY[topic.id];

              return (
                <article
                  key={topic.id}
                  className="group relative overflow-hidden rounded-[22px] border border-border/70 bg-card shadow-[0_20px_60px_-42px_rgba(15,23,42,0.75)] transition-transform duration-300 hover:-translate-y-1"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${featuredCopy.surface}`}
                  />
                  <div className="relative flex h-full flex-col p-4">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background/80 text-foreground shadow-sm">
                        <span className="text-xl">{topic.emoji}</span>
                      </div>
                      <span className="inline-flex items-center rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {featuredCopy.badge}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${levelColor}`}
                        >
                          {topic.level}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {topic.time}
                        </span>
                      </div>
                      <h3 className="text-base font-black tracking-tight text-foreground">
                        {topic.title}
                      </h3>
                      <p className="text-[12px] font-medium text-muted-foreground">
                        {subMeta.icon} {topic.subject}
                      </p>
                      <p className="text-[13px] leading-5 text-muted-foreground">
                        {topic.focus}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1">
                      {topic.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-border/40 bg-background/70 px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto pt-5">
                      {topic.external ? (
                        <a
                          href={topic.liveUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:gap-3 hover:opacity-95"
                        >
                          {featuredCopy.cta}
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      ) : (
                        <Link
                          href={topic.liveUrl!}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:gap-3 hover:opacity-95"
                        >
                          {featuredCopy.cta}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight text-foreground">
              All study tools
            </h2>
            <p className="text-sm text-muted-foreground">
              {isStudentLevelLocked
                ? "Only tools matched to your class level are shown here."
                : "Browse the rest of the catalogue."}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
            {regularTopics.length} tools
          </span>
        </div>

        {regularTopics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-14 text-center text-sm text-muted-foreground">
            {featuredTopics.length > 0
              ? "No other tools match your filters. Try adjusting the level, subject, or search term."
              : "No tools match your filters. Try adjusting the level, subject, or search term."}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {regularTopics.map((topic) => {
              const isOpen = expanded === topic.id;
              const subMeta = SUBJECT_META[topic.subject] || {
                icon: "📌",
                label: topic.subject,
              };
              const levelColor =
                LEVEL_COLORS[topic.level] ||
                "bg-gray-100 text-gray-700 border-gray-200";

              return (
                <div
                  key={topic.id}
                  className="bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col"
                >
                  {/* Card body */}
                  <div
                    className="p-4 cursor-pointer flex-1"
                    onClick={() => setExpanded(isOpen ? null : topic.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5 shrink-0">
                        {topic.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${levelColor}`}
                          >
                            {topic.level}
                          </span>
                          <span className="text-muted-foreground text-[10px] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {topic.time}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                          {topic.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {subMeta.icon} {topic.subject}
                        </p>
                      </div>
                      <div className="shrink-0 mt-1">
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {topic.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Expanded section */}
                  {isOpen && (
                    <div
                      className="px-4 pb-4 space-y-3 border-t border-border pt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Activity Focus
                        </p>
                        <p className="text-xs text-foreground leading-relaxed">
                          {topic.focus}
                        </p>
                      </div>

                      {topic.tags.length > 3 && (
                        <div className="flex flex-wrap gap-1">
                          {topic.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Direct link button — only when a live implementation exists */}
                      {topic.liveUrl && (
                        <Link
                          href={topic.liveUrl}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          Open tool
                        </Link>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}


