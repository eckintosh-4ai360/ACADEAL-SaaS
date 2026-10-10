"use client";

import { useState } from "react";

const SCENARIOS = [
  {
    title: "Minor Burn",
    scenario: "Your friend accidentally touches a hot stove and gets a minor burn on their finger. It is red and painful, but there are no blisters.",
    options: [
      { text: "Apply butter or oil to the burn immediately.", correct: false, explanation: "Butter traps heat and can cause infection." },
      { text: "Run cool (not freezing) water over the burn for 10-15 minutes.", correct: true, explanation: "Cool water lowers the skin temperature and stops the burning process." },
      { text: "Pop any blisters that form.", correct: false, explanation: "Popping blisters increases the risk of infection." },
    ]
  },
  {
    title: "Nosebleed",
    scenario: "A classmate gets hit in the nose with a ball and starts bleeding heavily from the nose.",
    options: [
      { text: "Tilt their head far back so blood doesn't drip.", correct: false, explanation: "Tilting back causes blood to run down the throat, which can cause choking or vomiting." },
      { text: "Pinch the soft part of the nose and lean slightly forward for 10 minutes.", correct: true, explanation: "Leaning forward prevents swallowing blood, and pinching stops the bleeding." },
      { text: "Stuff the nose with cotton wool immediately.", correct: false, explanation: "Removing the cotton later can pull off the clot and restart bleeding." },
    ]
  },
  {
    title: "Choking",
    scenario: "Someone is eating and suddenly grabs their throat. They cannot speak, cough, or breathe.",
    options: [
      { text: "Give them a glass of water.", correct: false, explanation: "Water can force the object further down the airway." },
      { text: "Slap their back gently while they stand straight.", correct: false, explanation: "They need to be bent forward to let gravity help." },
      { text: "Perform abdominal thrusts (Heimlich maneuver).", correct: true, explanation: "This forces air up the windpipe to dislodge the object." },
    ]
  }
];

export default function FirstAidResponse() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const scenario = SCENARIOS[currentIdx];

  const handleNext = () => {
    setSelectedOption(null);
    if (currentIdx < SCENARIOS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setCurrentIdx(0); // loop back or end
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-foreground flex items-center justify-center gap-2">
          <span className="text-4xl">🚑</span> First Aid & Emergency Response
        </h1>
        <p className="text-muted-foreground">
          Learn how to react properly in common emergency situations.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-primary/10 border-b border-border p-6 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1 block">Scenario {currentIdx + 1} of {SCENARIOS.length}</span>
          <h2 className="text-2xl font-bold text-foreground">{scenario.title}</h2>
        </div>
        
        <div className="p-6 md:p-8 space-y-8">
          <p className="text-lg text-foreground font-medium bg-muted/30 p-4 rounded-xl border border-border/50">
            {scenario.scenario}
          </p>

          <div className="space-y-3">
            <h3 className="font-semibold text-muted-foreground">What should you do?</h3>
            {scenario.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = opt.correct;
              const showResult = selectedOption !== null;
              
              let borderClass = "border-border hover:border-primary/50";
              let bgClass = "bg-background hover:bg-muted/30";
              
              if (showResult) {
                if (isCorrect) {
                  borderClass = "border-green-500";
                  bgClass = isSelected ? "bg-green-500/10" : "bg-background";
                } else if (isSelected) {
                  borderClass = "border-red-500";
                  bgClass = "bg-red-500/10";
                } else {
                  borderClass = "border-border/50 opacity-50";
                }
              }

              return (
                <button
                  key={idx}
                  disabled={showResult}
                  onClick={() => setSelectedOption(idx)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${borderClass} ${bgClass}`}
                >
                  <p className="font-medium text-foreground">{opt.text}</p>
                  
                  {showResult && (isSelected || isCorrect) && (
                    <div className={`mt-3 p-3 rounded-lg text-sm ${isCorrect ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'}`}>
                      <strong>{isCorrect ? "Correct!" : "Incorrect."}</strong> {opt.explanation}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedOption !== null && (
            <div className="flex justify-end pt-4 border-t border-border">
              <button 
                onClick={handleNext}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-semibold hover:opacity-90 transition-opacity"
              >
                {currentIdx < SCENARIOS.length - 1 ? "Next Scenario" : "Restart"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
