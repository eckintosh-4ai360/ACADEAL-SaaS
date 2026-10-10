"use client";

import { useState } from "react";

const ORGANS = [
  { id: "mouth", name: "Mouth", function: "Breaks down food mechanically and mixes it with saliva." },
  { id: "esophagus", name: "Esophagus", function: "The tube that carries food from the mouth to the stomach." },
  { id: "stomach", name: "Stomach", function: "Uses acids and enzymes to digest food into a liquid." },
  { id: "liver", name: "Liver", function: "Produces bile to help digest fats." },
  { id: "small_intestine", name: "Small Intestine", function: "Absorbs most of the nutrients from the food." },
  { id: "large_intestine", name: "Large Intestine", function: "Absorbs water and forms solid waste." },
];

export default function DigestiveSystemLabeller() {
  const [selectedOrgan, setSelectedOrgan] = useState(ORGANS[0]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-foreground flex items-center justify-center gap-2">
          <span className="text-4xl">🫀</span> Human Digestive System
        </h1>
        <p className="text-muted-foreground">
          Map the journey of food through the digestive tract. Identify organs and their specific functions.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Simple "Diagram" list since we don't have an actual image asset guaranteed */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Digestive Organs</h2>
          <div className="space-y-3">
            {ORGANS.map((organ, idx) => (
              <div 
                key={organ.id} 
                className="flex items-center gap-4 relative"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground z-10">
                  {idx + 1}
                </div>
                {idx !== ORGANS.length - 1 && (
                  <div className="absolute left-4 top-8 w-0.5 h-6 bg-border -ml-px z-0"></div>
                )}
                <button
                  onClick={() => setSelectedOrgan(organ)}
                  className={`flex-1 text-left px-4 py-3 rounded-xl border transition-all ${
                    selectedOrgan.id === organ.id 
                      ? 'border-primary bg-primary/10 font-bold text-primary' 
                      : 'border-border bg-background hover:bg-muted/30 hover:border-primary/50'
                  }`}
                >
                  {organ.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Organ Details */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm flex flex-col justify-center min-h-[400px]">
          <div className="text-center space-y-6">
            <div className="w-32 h-32 mx-auto bg-primary/10 rounded-full flex items-center justify-center border-4 border-primary/20">
              <span className="text-5xl">🔍</span>
            </div>
            
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Selected Organ</span>
              <h2 className="text-4xl font-black text-foreground">{selectedOrgan.name}</h2>
            </div>
            
            <div className="bg-background border border-border/50 p-6 rounded-xl text-left">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Function</h3>
              <p className="text-lg font-medium text-foreground leading-relaxed">
                {selectedOrgan.function}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
