"use client";

import { useState } from "react";

export default function ClimateChangeSimulator() {
  const [deforestation, setDeforestation] = useState(50);
  const [emissions, setEmissions] = useState(50);
  const [renewable, setRenewable] = useState(20);

  // Simple formula for simulation
  const temperatureIncrease = ((deforestation * 0.4) + (emissions * 0.8) - (renewable * 0.5)) / 100 * 3;
  const airQuality = 100 - (emissions * 0.7) - (deforestation * 0.3) + (renewable * 0.5);

  const getStatusColor = (val: number, invert: boolean = false) => {
    const score = invert ? 100 - val : val;
    if (score < 30) return "text-red-500";
    if (score < 70) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-foreground flex items-center justify-center gap-2">
          <span className="text-4xl">🌍</span> Climate Change Simulator
        </h1>
        <p className="text-muted-foreground">
          Adjust the sliders below to see how human activities impact the environment.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6 bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold">Human Activities</h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium flex items-center gap-2">🪓 Deforestation Rate</label>
                <span className="text-sm font-bold text-muted-foreground">{deforestation}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={deforestation} 
                onChange={(e) => setDeforestation(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium flex items-center gap-2">🏭 Carbon Emissions</label>
                <span className="text-sm font-bold text-muted-foreground">{emissions}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={emissions} 
                onChange={(e) => setEmissions(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium flex items-center gap-2">☀️ Renewable Energy Adoption</label>
                <span className="text-sm font-bold text-muted-foreground">{renewable}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={renewable} 
                onChange={(e) => setRenewable(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col justify-center">
          <h2 className="text-lg font-bold">Environmental Impact</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background border border-border p-4 rounded-xl text-center">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Global Temp. Change</p>
              <div className={`text-3xl font-black ${temperatureIncrease > 1.5 ? 'text-red-500' : 'text-green-500'}`}>
                +{Math.max(0, temperatureIncrease).toFixed(1)}°C
              </div>
            </div>
            <div className="bg-background border border-border p-4 rounded-xl text-center">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Air Quality Index</p>
              <div className={`text-3xl font-black ${getStatusColor(airQuality)}`}>
                {Math.min(100, Math.max(0, airQuality)).toFixed(0)}
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
            <p className="text-sm text-foreground">
              {temperatureIncrease > 1.5 
                ? "Warning: Temperature increase above 1.5°C leads to severe climate risks. Increase renewable energy to combat this!" 
                : "Good job! The environment is stable under these conditions."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
