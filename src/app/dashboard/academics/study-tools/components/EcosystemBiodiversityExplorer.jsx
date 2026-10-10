import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { RefreshCw, Play, AlertTriangle, ArrowRight, ShieldAlert, CheckCircle2, ChevronLeft } from 'lucide-react';

const ORGANISMS = [
  { id: 'sun', name: 'Sun', emoji: '☀️', type: 'energy', role: 'Energy Source', x: 100, y: 250 },
  { id: 'grass', name: 'Grass', emoji: '🌾', type: 'producer', role: 'Producer', x: 250, y: 150 },
  { id: 'tree', name: 'Tree', emoji: '🌳', type: 'producer', role: 'Producer', x: 250, y: 350 },
  { id: 'grasshopper', name: 'Grasshopper', emoji: '🦗', type: 'primary', role: 'Primary Consumer', x: 450, y: 100 },
  { id: 'mouse', name: 'Mouse', emoji: '🐁', type: 'primary', role: 'Primary Consumer', x: 450, y: 250 },
  { id: 'giraffe', name: 'Giraffe', emoji: '🦒', type: 'primary', role: 'Primary Consumer', x: 450, y: 400 },
  { id: 'snake', name: 'Snake', emoji: '🐍', type: 'secondary', role: 'Secondary Consumer', x: 650, y: 150 },
  { id: 'hawk', name: 'Hawk', emoji: '🦅', type: 'apex', role: 'Apex Predator', x: 650, y: 300 },
  { id: 'lion', name: 'Lion', emoji: '🦁', type: 'apex', role: 'Apex Predator', x: 650, y: 450 }
];

const LINKS = [
  { source: 'sun', target: 'grass' },
  { source: 'sun', target: 'tree' },
  { source: 'grass', target: 'grasshopper' },
  { source: 'grass', target: 'mouse' },
  { source: 'tree', target: 'giraffe' },
  { source: 'grasshopper', target: 'snake' },
  { source: 'mouse', target: 'snake' },
  { source: 'mouse', target: 'hawk' },
  { source: 'snake', target: 'hawk' },
  { source: 'giraffe', target: 'lion' }
];

const IMPACT_MAP = {
  sun: { dies: ['grass', 'tree', 'grasshopper', 'mouse', 'giraffe', 'snake', 'hawk', 'lion'], overpopulates: [], explanation: "Without the Sun, producers cannot make food. The entire ecosystem collapses!" },
  grass: { dies: ['grasshopper', 'mouse', 'snake', 'hawk'], overpopulates: [], explanation: "Without grass, primary consumers starve. Predators that rely on them also perish." },
  tree: { dies: ['giraffe', 'lion'], overpopulates: [], explanation: "Without trees, giraffes have no food and die. Lions eventually lose their prey." },
  grasshopper: { dies: [], overpopulates: ['grass'], explanation: "Without grasshoppers, fewer plants are eaten so grass overgrows. Snakes must hunt mice instead." },
  mouse: { dies: [], overpopulates: ['grass'], explanation: "Without mice, grass overgrows. Snakes and Hawks lose a major food source and must compete more." },
  giraffe: { dies: ['lion'], overpopulates: ['tree'], explanation: "Without giraffes, trees overgrow. Lions lose their main prey and face starvation." },
  snake: { dies: [], overpopulates: ['grasshopper', 'mouse'], explanation: "Without snakes, mice and grasshoppers lose a predator and overpopulate, eating all the grass." },
  hawk: { dies: [], overpopulates: ['mouse', 'snake'], explanation: "Without hawks, snakes and mice lose their apex predator and their numbers increase." },
  lion: { dies: [], overpopulates: ['giraffe'], explanation: "Without lions, giraffes have no predators. They overpopulate and eat all the tree leaves, damaging the forest." }
};

export default function EcosystemBiodiversityExplorer() {
  const [removedNode, setRemovedNode] = useState(null);
  const [nodeStates, setNodeStates] = useState({});
  const [simulationStep, setSimulationStep] = useState(0); 
  const [attempts, setAttempts] = useState(0);

  // Initialize all nodes to 'alive'
  useEffect(() => {
    resetSimulation();
  }, []);

  const resetSimulation = useCallback(() => {
    setRemovedNode(null);
    setSimulationStep(0);
    const initialStates = {};
    ORGANISMS.forEach(org => {
      initialStates[org.id] = 'alive';
    });
    setNodeStates(initialStates);
  }, []);

  const handleNodeClick = (id) => {
    if (removedNode) return; // Only allow one removal per simulation
    
    setRemovedNode(id);
    setAttempts(a => a + 1);
    
    // Step 1: Just remove the target node
    setNodeStates(prev => ({ ...prev, [id]: 'removed' }));
    setSimulationStep(1);
    
    // Step 2: Show cascading effects after a delay
    setTimeout(() => {
      const impacts = IMPACT_MAP[id];
      setNodeStates(prev => {
        const next = { ...prev };
        impacts.dies.forEach(depId => {
          if (next[depId] !== 'removed') next[depId] = 'dying';
        });
        impacts.overpopulates.forEach(depId => {
          if (next[depId] !== 'removed') next[depId] = 'overpopulating';
        });
        return next;
      });
      setSimulationStep(2);
    }, 1500);
  };

  const getLinkColor = (sourceId, targetId) => {
    const sState = nodeStates[sourceId];
    const tState = nodeStates[targetId];
    
    if (sState === 'removed' || tState === 'removed' || sState === 'dying' || tState === 'dying') {
      return '#cbd5e1'; // slate-300 (faded out) // death link
    }
    return '#6366f1'; // indigo-500 (active energy flow)
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 p-4">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      {/* 1. Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-t-8 border-teal-600">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">🌍</span>
              <h1 className="text-3xl font-bold text-slate-800">Ecosystem & Biodiversity Explorer</h1>
            </div>
            <p className="text-lg text-slate-600 font-medium">Build a food web and observe the cascading effects of extinction.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="bg-teal-100 text-teal-800 px-4 py-1 rounded-full font-bold uppercase tracking-wider text-sm">JHS 1–3 Science</span>
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <RefreshCw className="w-4 h-4" /> 22 min
            </span>
          </div>
        </div>
      </div>

      {/* 2. How to Use Box */}
      <div className="bg-indigo-50 border-l-4 border-indigo-500 p-5 rounded-r-xl shadow-sm">
        <h3 className="text-lg font-bold text-indigo-900 mb-1 flex items-center gap-2">
          <Play className="w-5 h-5 text-indigo-600" /> How to Play
        </h3>
        <p className="text-indigo-800 text-base">
          Observe how energy flows from the Sun through producers to consumers. 
          <strong> Click on any living thing to remove it from the ecosystem</strong>, and watch what happens to the animals that depend on it!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Visual Output Area (Interactive Control Zone combined) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-4 relative overflow-hidden flex flex-col items-center border-2 border-slate-100">
          <div className="w-full overflow-x-auto pb-4">
            <div className="min-w-[800px] h-[550px] relative bg-slate-50 rounded-xl border border-slate-200">
              
              <svg className="w-full h-full absolute inset-0 pointer-events-none" viewBox="0 0 800 550">
                <defs>
                  <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
                  </marker>
                  <marker id="arrowhead-dead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                  </marker>
                  <marker id="arrowhead-over" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                  </marker>
                </defs>
                
                {/* Draw lines showing energy flow */}
                {LINKS.map((link, idx) => {
                  const sourceNode = ORGANISMS.find(o => o.id === link.source);
                  const targetNode = ORGANISMS.find(o => o.id === link.target);
                  
                  // Adjust coords to center of nodes
                  const sx = sourceNode.x;
                  const sy = sourceNode.y;
                  const tx = targetNode.x;
                  const ty = targetNode.y;
                  
                  const sState = nodeStates[link.source];
                  const tState = nodeStates[link.target];
                  const isDead = sState === 'removed' || tState === 'removed' || sState === 'dying' || tState === 'dying';
                  
                  return (
                    <line
                      key={`link-${idx}`}
                      x1={sx}
                      y1={sy}
                      x2={tx}
                      y2={ty}
                      stroke={getLinkColor(link.source, link.target)}
                      strokeWidth="3"
                      strokeDasharray={isDead ? "5,5" : "none"}
                      markerEnd={`url(#arrowhead-${isDead ? 'dead' : 'active'})`}
                      className="transition-all duration-1000 ease-in-out"
                    />
                  );
                })}
              </svg>

              {/* Draw Nodes */}
              {ORGANISMS.map((org) => {
                const state = nodeStates[org.id];
                const isRemoved = state === 'removed';
                const isDying = state === 'dying';
                const isOverpopulating = state === 'overpopulating';
                
                let bgClass = "bg-white border-2 border-indigo-200 hover:border-indigo-500 hover:shadow-md cursor-pointer";
                let iconFilter = "";
                let statusBadge = null;

                if (isRemoved) {
                  bgClass = "bg-slate-100 border-2 border-slate-300 opacity-50";
                  iconFilter = "grayscale";
                  statusBadge = <div className="absolute -top-3 -right-3 bg-slate-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">EXTINCT</div>;
                } else if (isDying) {
                  bgClass = "bg-red-50 border-2 border-red-400";
                  iconFilter = "grayscale opacity-70";
                  statusBadge = <div className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm animate-pulse">DYING</div>;
                } else if (isOverpopulating) {
                  bgClass = "bg-green-50 border-4 border-green-500 shadow-lg";
                  statusBadge = <div className="absolute -top-3 -right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm animate-bounce">OVERPOPULATING</div>;
                }

                return (
                  <div
                    key={org.id}
                    onClick={() => handleNodeClick(org.id)}
                    className={`absolute flex flex-col items-center justify-center rounded-full w-[70px] h-[70px] transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${bgClass} ${!removedNode ? 'hover:scale-110' : ''}`}
                    style={{ left: org.x, top: org.y, zIndex: 10 }}
                    title={!removedNode ? `Remove ${org.name}` : org.name}
                  >
                    {statusBadge}
                    <span className={`text-3xl transition-all duration-500 ${iconFilter}`}>
                      {org.emoji}
                    </span>
                    <span className="absolute -bottom-6 whitespace-nowrap text-xs font-bold text-slate-700 bg-white/80 px-1 rounded">
                      {org.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="w-full mt-4 flex justify-between items-center px-4">
            <div className="flex gap-4 text-sm font-medium text-slate-600">
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-indigo-500"></div> Energy Flow</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> Critical Danger</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Overpopulation</span>
            </div>
            
            <button
              onClick={resetSimulation}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
            >
              <RefreshCw className="w-5 h-5" /> Reset Ecosystem
            </button>
          </div>
        </div>

        {/* 3. Feedback / Score Panel */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 flex flex-col h-full">
          <div className="p-5 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-indigo-600" /> Observation Log
            </h3>
            <p className="text-sm text-slate-500 mt-1">Attempts made: {attempts}</p>
          </div>
          
          <div className="p-6 flex-grow flex flex-col gap-4">
            {!removedNode ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/50">
                <AlertTriangle className="w-12 h-12 text-indigo-300 mb-3" />
                <h4 className="text-lg font-bold text-indigo-800 mb-2">Ecosystem is stable</h4>
                <p className="text-indigo-600/80">Click on any organism in the food web to remove it and observe the cascading effects on biodiversity.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 h-full">
                <div className="bg-slate-100 p-4 rounded-xl border-l-4 border-slate-400 animate-in fade-in slide-in-from-right-4">
                  <span className="text-xs font-bold uppercase text-slate-500">Extinct Species</span>
                  <div className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    {ORGANISMS.find(o => o.id === removedNode)?.emoji} {ORGANISMS.find(o => o.id === removedNode)?.name} removed.
                  </div>
                </div>

                {simulationStep >= 2 ? (
                  <div className="bg-teal-50 p-4 rounded-xl border-l-4 border-teal-500 animate-in fade-in slide-in-from-bottom-4 duration-500 flex-grow">
                    <span className="text-xs font-bold uppercase text-teal-700">Ecological Consequence</span>
                    <p className="text-teal-900 font-medium text-lg mt-1 mb-3">
                      {IMPACT_MAP[removedNode]?.explanation}
                    </p>
                    
                    {IMPACT_MAP[removedNode]?.dies.length > 0 && (
                      <div className="mt-3">
                        <span className="text-xs font-bold text-red-600 uppercase">Perish from starvation</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {IMPACT_MAP[removedNode].dies.map(id => {
                            const org = ORGANISMS.find(o => o.id === id);
                            return <span key={id} className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> {org?.emoji} {org?.name}</span>
                          })}
                        </div>
                      </div>
                    )}

                    {IMPACT_MAP[removedNode]?.overpopulates.length > 0 && (
                      <div className="mt-3">
                        <span className="text-xs font-bold text-green-600 uppercase">Overpopulation Risk</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {IMPACT_MAP[removedNode].overpopulates.map(id => {
                            const org = ORGANISMS.find(o => o.id === id);
                            return <span key={id} className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-bold flex items-center gap-1"><ArrowRight className="w-3 h-3"/> {org?.emoji} {org?.name}</span>
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-grow flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-3 text-indigo-600 font-medium animate-pulse">Calculating cascade...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Educational Footer */}
      <div className="bg-slate-800 text-white rounded-2xl p-6 mt-2 shadow-lg">
        <h4 className="text-xl font-bold mb-4 flex items-center gap-2 text-teal-300">
          <CheckCircle2 className="w-6 h-6" /> What We Learned
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-slate-700 p-2 rounded-lg text-teal-400 mt-1"><ArrowRight className="w-4 h-4" /></div>
            <p className="text-slate-200"><strong>Interdependence:</strong> All living things in an ecosystem depend on each other for survival. The removal of one species affects many others.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-slate-700 p-2 rounded-lg text-teal-400 mt-1"><ArrowRight className="w-4 h-4" /></div>
            <p className="text-slate-200"><strong>Energy Flow:</strong> The arrows show the direction energy flows—from the Sun, to producers (plants), and then to consumers (animals).</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-slate-700 p-2 rounded-lg text-teal-400 mt-1"><ArrowRight className="w-4 h-4" /></div>
            <p className="text-slate-200"><strong>Cascading Effects:</strong> Extinction causes a chain reaction. Predators starve without prey, and populations explode without predators.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-slate-700 p-2 rounded-lg text-teal-400 mt-1"><ArrowRight className="w-4 h-4" /></div>
            <p className="text-slate-200"><strong>Biodiversity Matters:</strong> A complex food web with high biodiversity is more resilient to changes than a simple food chain.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
