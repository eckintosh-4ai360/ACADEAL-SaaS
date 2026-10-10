"use client";

import { useState } from "react";

const ADINKRA_SYMBOLS = [
  {
    name: "Gye Nyame",
    meaning: "Except for God",
    symbol: "🌀", // Placeholder for actual SVG or specific image
    description: "Symbol of the supremacy of God. This unique and beautiful symbol is ubiquitous in Ghana. It is by far the most popular for use in decoration.",
  },
  {
    name: "Sankofa",
    meaning: "Go back and get it",
    symbol: "🐦", 
    description: "Symbol of the importance of learning from the past. 'It is not wrong to go back for that which you have forgotten.'",
  },
  {
    name: "Adinkrahene",
    meaning: "Chief of the Adinkra symbols",
    symbol: "⭕",
    description: "Symbol of greatness, charisma and leadership. This symbol is said to have played an inspiring role in the designing of other symbols.",
  },
  {
    name: "Dwennimmen",
    meaning: "Ram's horns",
    symbol: "♈",
    description: "Symbol of humility together with strength. The ram will fight fiercely against an adversary, but it also submits humbly to slaughter.",
  },
];

export default function AfricanArtHistory() {
  const [selectedSymbol, setSelectedSymbol] = useState(ADINKRA_SYMBOLS[0]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-foreground flex items-center justify-center gap-2">
          <span className="text-4xl">🏺</span> African Art History & Motifs
        </h1>
        <p className="text-muted-foreground">
          Identify different Adinkra symbols and traditional African art styles.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Gallery */}
        <div className="md:col-span-1 space-y-4">
          <h2 className="text-lg font-bold">Symbol Gallery</h2>
          <div className="grid grid-cols-2 gap-4">
            {ADINKRA_SYMBOLS.map((item) => (
              <button
                key={item.name}
                onClick={() => setSelectedSymbol(item)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                  selectedSymbol.name === item.name 
                    ? 'border-primary bg-primary/10 shadow-sm' 
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <span className="text-4xl mb-2">{item.symbol}</span>
                <span className="text-xs font-semibold text-center">{item.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Details View */}
        <div className="md:col-span-2 bg-card border border-border p-8 rounded-2xl shadow-sm flex flex-col justify-center min-h-[400px]">
          <div className="text-center space-y-6">
            <div className="text-8xl flex justify-center mb-4">
              <div className="w-32 h-32 bg-muted/50 rounded-full flex items-center justify-center border border-border">
                {selectedSymbol.symbol}
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-black text-foreground mb-1">{selectedSymbol.name}</h2>
              <p className="text-lg font-semibold text-primary">"{selectedSymbol.meaning}"</p>
            </div>
            <div className="bg-background border border-border/50 p-6 rounded-xl max-w-lg mx-auto">
              <p className="text-foreground leading-relaxed">
                {selectedSymbol.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
