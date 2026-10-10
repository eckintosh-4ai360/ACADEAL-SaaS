"use client";

import { useState } from "react";

const PROVERBS = [
  {
    language: "Twi",
    proverb: "Woforo dua pa a, na yepia wo.",
    translation: "When you climb a good tree, you are given a push.",
    meaning: "When you undertake a good cause, you will get support from others.",
  },
  {
    language: "Ga",
    proverb: "Ke onukpa ewie le, bi gbɛɛ eyaa eko.",
    translation: "When an elder speaks, a child doesn't throw a stone.",
    meaning: "Wisdom from elders should be respected, not dismissed.",
  },
  {
    language: "Twi",
    proverb: "Tikoro nko agyina.",
    translation: "One head does not hold a council.",
    meaning: "Wisdom is not found in one person's head; collaboration is important.",
  },
  {
    language: "Ga",
    proverb: "Nuu kome kpaa we nyo.",
    translation: "One person does not wrap the corpse.",
    meaning: "Community support is essential in difficult times.",
  },
  {
    language: "Twi",
    proverb: "Oba nyansafoɔ, yɛbu no bɛ, yɛnnka no asɛm.",
    translation: "The wise child is spoken to in proverbs, not in plain words.",
    meaning: "A wise person is quick to understand the deeper meaning of things without needing lengthy explanations.",
  },
  {
    language: "Ga",
    proverb: "Mokomoko bɛ ni le sane fɛɛ.",
    translation: "No one knows everything.",
    meaning: "Knowledge is shared; nobody is entirely self-sufficient in wisdom.",
  },
  {
    language: "Twi",
    proverb: "Sɛ wo werɛ fi na wosan kɔfa a, yenkyi.",
    translation: "It is not a taboo to go back and fetch what you forgot.",
    meaning: "It is never too late to learn from the past or correct a mistake. (This is the origin of the Sankofa symbol).",
  },
  {
    language: "Ga",
    proverb: "Tso kome feee kwaa.",
    translation: "One tree does not make a forest.",
    meaning: "Strength lies in numbers and unity. We achieve more when we work together.",
  },
  {
    language: "Twi",
    proverb: "Nsatea nyinaa nnyɛ pɛ.",
    translation: "All fingers are not equal.",
    meaning: "People are different and have different abilities, destinies, and levels of success. We must accept and respect these differences.",
  },
  {
    language: "Ga",
    proverb: "Kɛji otao ofee noko lɛ, otaoɔ gbɛ.",
    translation: "If you want to do something, you find a way.",
    meaning: "Where there is a will, there is a way. Determination overcomes obstacles.",
  },
  {
    language: "Twi",
    proverb: "Aboa a onni dua, Nyame na ɔpra ne ho.",
    translation: "The animal without a tail has its body brushed by God.",
    meaning: "God protects the vulnerable, helpless, and the orphans.",
  },
  {
    language: "Ga",
    proverb: "Kɛji onukpa tsu bo lɛ, otsuɔ ohe.",
    translation: "When an elder sends you, you send yourself.",
    meaning: "Serving others faithfully ultimately benefits you and brings you blessings.",
  },
  {
    language: "Twi",
    proverb: "Nwansena nni afotuo a, ɔde ne ho kɔhye dɔm aso mu.",
    translation: "A fly that does not listen to advice follows the corpse into the grave.",
    meaning: "Ignoring good advice and warnings can lead to disastrous consequences.",
  },
  {
    language: "Twi",
    proverb: "Abofra bɔ nwa, ɔnbɔ akyekyedeɛ.",
    translation: "A child breaks a snail, not a tortoise.",
    meaning: "A child should act according to their level of maturity and capability. Know your limits.",
  },
  {
    language: "Ga",
    proverb: "Kɛ tsui mli hi lɛ, hiɛgbe kãa.",
    translation: "If the heart is good, the face is bright.",
    meaning: "A pure heart and good intentions reflect positively on a person's outward appearance and demeanor.",
  }
];

export default function ProverbsIdioms() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);

  const handleNext = () => {
    setShowMeaning(false);
    setCurrentIndex((prev) => (prev + 1) % PROVERBS.length);
  };

  const handlePrev = () => {
    setShowMeaning(false);
    setCurrentIndex((prev) => (prev - 1 + PROVERBS.length) % PROVERBS.length);
  };

  const currentProverb = PROVERBS[currentIndex];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-foreground flex items-center justify-center gap-2">
          <span className="text-4xl">🗣️</span> Twi/Ga Proverbs & Idioms
        </h1>
        <p className="text-muted-foreground">
          Learn the meaning and context of common Ghanaian proverbs.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm relative overflow-hidden min-h-[300px] flex flex-col justify-center">
        <div className="absolute top-4 right-4 bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">
          {currentProverb.language}
        </div>
        
        <div className="space-y-6">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground italic">
            "{currentProverb.proverb}"
          </h2>
          
          <div className={`transition-all duration-500 ${showMeaning ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {showMeaning && (
              <div className="space-y-4 mt-8 bg-muted/50 p-6 rounded-xl border border-border/50">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Literal Translation</h3>
                  <p className="text-foreground">{currentProverb.translation}</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Meaning</h3>
                  <p className="text-foreground font-medium">{currentProverb.meaning}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {!showMeaning && (
          <div className="mt-8">
            <button
              onClick={() => setShowMeaning(true)}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-semibold hover:opacity-90 transition-opacity"
            >
              Reveal Meaning
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center px-4">
        <button
          onClick={handlePrev}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Previous
        </button>
        <span className="text-xs font-bold text-muted-foreground">
          {currentIndex + 1} / {PROVERBS.length}
        </span>
        <button
          onClick={handleNext}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
}
