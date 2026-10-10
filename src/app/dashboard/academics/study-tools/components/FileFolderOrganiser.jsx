import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  File, 
  Folder, 
  FolderOpen, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video, 
  Type, 
  HardDrive,
  RotateCcw, 
  Target, 
  Award, 
  BookOpen, 
  HelpCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Info,
  Timer,
  Trash2
} from "lucide-react";

const FILE_TYPES = {
  document: { label: "Documents", icon: FileText, color: "text-blue-500", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  image: { label: "Images", icon: ImageIcon, color: "text-purple-500", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  audio: { label: "Music", icon: Music, color: "text-emerald-500", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" }
};

const FILES = [
  { id: "f1", name: "homework", ext: ".doc", type: "document", size: "25 KB" },
  { id: "f2", name: "family_photo", ext: ".jpg", type: "image", size: "1.2 MB" },
  { id: "f3", name: "favourite_song", ext: ".mp3", type: "audio", size: "4.5 MB" },
  { id: "f4", name: "report_card", ext: ".pdf", type: "document", size: "150 KB" },
  { id: "f5", name: "vacation", ext: ".png", type: "image", size: "800 KB" },
  { id: "f6", name: "instrumental", ext: ".wav", type: "audio", size: "12 MB" },
  { id: "f7", name: "essay_outline", ext: ".txt", type: "document", size: "5 KB" },
  { id: "f8", name: "selfie", ext: ".jpeg", type: "image", size: "2.1 MB" },
];

export default function FileFolderOrganiser() {
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState('ready'); // 'ready', 'playing', 'finished'
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [placedFiles, setPlacedFiles] = useState({}); // folderId -> [files]
  const [unplacedFiles, setUnplacedFiles] = useState([]);
  const [feedback, setFeedback] = useState(null);

  // Initialize round
  const startNewRound = useCallback(() => {
    const shuffled = [...FILES].sort(() => Math.random() - 0.5).slice(0, 6);
    setUnplacedFiles(shuffled);
    setPlacedFiles({ document: [], image: [], audio: [] });
    setGameState('playing');
    setTimeLeft(45);
    setScore(0);
    setAttempts(0);
    setFeedback(null);
  }, []);

  // Timer logic
  useEffect(() => {
    let timer;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('finished');
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const handleFileSelect = (file) => {
    if (gameState !== 'playing') return;
    setSelectedFile(file);
    setFeedback(null);
  };

  const handleFolderClick = (folderType) => {
    if (!selectedFile || gameState !== 'playing') return;

    setAttempts(prev => prev + 1);
    
    if (selectedFile.type === folderType) {
      // Correct placement
      setPlacedFiles(prev => ({
        ...prev,
        [folderType]: [...prev[folderType], selectedFile]
      }));
      setUnplacedFiles(prev => prev.filter(f => f.id !== selectedFile.id));
      setScore(prev => prev + 10);
      setFeedback({ status: 'correct', message: `✅ Great! ${selectedFile.ext} belongs in ${FILE_TYPES[folderType].label}.` });
      
      if (unplacedFiles.length === 1) {
        setGameState('finished');
        setScore(prev => prev + timeLeft); // Time bonus
      }
    } else {
      // Incorrect placement
      setFeedback({ status: 'incorrect', message: `❌ Try again! ${selectedFile.ext} is not a ${FILE_TYPES[folderType].label} file.` });
    }
    
    setSelectedFile(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      {/* ── BACK BUTTON ── */}
      <Link 
        href="/dashboard/academics/study-tools"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ChevronLeft size={16} />
        Back to Study Tools
      </Link>

      {/* 1. Header */}
      <header className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-2xl">
            <HardDrive className="text-blue-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">File & Folder Organiser</h1>
            <p className="text-slate-500 font-medium tracking-tight">Clean up your computer and learn file types!</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full border border-blue-200">
            Primary 4–6
          </span>
          <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1">
            <Clock size={16} /> 12 min
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Stats & Desktop */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* 2. "How to Use" box */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <HelpCircle className="text-blue-500" size={18} /> Tutorial
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed font-medium">
              Look at the file extension (like .jpg or .doc). Select a file from the desktop, then click the correct folder to save it!
            </p>
          </section>

          {/* 3. Interactive Control Zone: Desktop/Unplaced Files */}
          <div className="bg-slate-200/50 rounded-[2.5rem] p-6 border-4 border-slate-100 min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">My Desktop</h3>
               <div className="flex gap-2">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${timeLeft < 10 ? 'animate-pulse bg-red-100 text-red-600' : 'bg-white text-slate-600'}`}>
                    <Timer size={14} /> {timeLeft}s
                  </div>
               </div>
            </div>

            {gameState === 'playing' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1">
                {unplacedFiles.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => handleFileSelect(file)}
                    className={`
                      p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 relative group
                      ${selectedFile?.id === file.id ? 'bg-white border-blue-400 shadow-lg scale-105 ring-4 ring-blue-50' : 'bg-white/80 border-transparent hover:border-blue-200 shadow-sm'}
                    `}
                  >
                    <div className={`${FILE_TYPES[file.type].color}`}>
                       {selectedFile?.id === file.id ? <FileText size={40} /> : <File size={40} />}
                    </div>
                    <span className="text-[10px] font-black text-slate-700 truncate w-full text-center">{file.name}{file.ext}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">{file.size}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-4">
                   <Target size={40} className="text-blue-500" />
                </div>
                <h3 className="font-black text-slate-800 mb-2">Ready to Organise?</h3>
                <p className="text-sm text-slate-500 mb-6">Sort all files before the timer runs out!</p>
                <button 
                  onClick={startNewRound}
                  className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-lg shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
                >
                  START CHALLENGE
                </button>
              </div>
            )}
          </div>

          {/* Feedback Area */}
          <div className="min-h-[80px]">
            {feedback && (
              <div className={`
                p-4 rounded-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-300
                ${feedback.status === 'correct' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}
              `}>
                {feedback.status === 'correct' ? <CheckCircle2 className="shrink-0" /> : <XCircle className="shrink-0" />}
                <p className="text-xs font-bold leading-tight">{feedback.message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Folders/Live Visual Output */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Main Visual Display */}
          <div className="bg-white rounded-[3rem] shadow-xl border-8 border-slate-50 p-8 md:p-12 relative flex flex-col items-center">
            
            <div className="w-full flex justify-between items-center mb-12">
               <div>
                  <h2 className="text-2xl font-black text-slate-800">Storage Drive (D:)</h2>
                  <div className="flex gap-2 items-center mt-1">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency Rating</span>
                     <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className={`w-3 h-1 rounded-full ${i <= (score / 20) ? 'bg-emerald-400' : 'bg-slate-100'}`} />
                        ))}
                     </div>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Score</p>
                  <p className="text-3xl font-black text-blue-600">{score}</p>
               </div>
            </div>

            {/* Folder Interface */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
              {Object.entries(FILE_TYPES).map(([id, config]) => {
                const Icon = config.icon;
                const contents = placedFiles[id] || [];
                const isHovered = selectedFile && selectedFile.type === id;

                return (
                  <button
                    key={id}
                    onClick={() => handleFolderClick(id)}
                    className={`
                      group relative flex flex-col items-center p-6 rounded-[2.5rem] border-4 transition-all
                      ${config.bgColor} ${config.borderColor}
                      ${selectedFile ? 'hover:scale-105 active:scale-95' : 'cursor-default'}
                      ${isHovered ? 'ring-8 ring-white shadow-xl translate-y-[-8px]' : 'shadow-md'}
                    `}
                  >
                    <div className={`${config.color} mb-4 transform transition-transform group-hover:scale-110`}>
                      {contents.length > 0 ? <FolderOpen size={80} /> : <Folder size={80} />}
                    </div>
                    <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm mb-1">{config.label}</h4>
                    <span className="text-[10px] font-bold text-slate-500 bg-white/50 px-3 py-1 rounded-full border border-black/5">
                      {contents.length} {contents.length === 1 ? 'file' : 'files'}
                    </span>

                    {/* Mini icons inside folder */}
                    <div className="mt-4 flex flex-wrap justify-center gap-1 min-h-[20px]">
                      {contents.map((f, i) => (
                        <div key={i} className={`w-2 h-2 rounded-sm ${config.color.replace('text', 'bg')}`} title={f.name} />
                      ))}
                    </div>

                    {/* Drop zone indicator */}
                    {selectedFile && (
                      <div className="absolute inset-0 border-4 border-dashed border-white rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <ChevronRight className="rotate-90 text-white" size={32} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Empty State/Instructions */}
            {!selectedFile && gameState === 'playing' && (
              <div className="mt-12 text-slate-400 flex items-center gap-2 animate-bounce">
                <ChevronRight className="rotate-[-90deg]" size={20} />
                <span className="text-xs font-black uppercase tracking-widest">Select a file to save</span>
              </div>
            )}

            {/* Achievement Overlay */}
            {gameState === 'finished' && (
              <div className="absolute inset-0 bg-blue-600/95 rounded-[3rem] z-20 flex flex-col items-center justify-center text-white p-10 text-center animate-in fade-in duration-500">
                <Award size={100} className="mb-6 animate-pulse" />
                <h2 className="text-4xl font-black mb-2 tracking-tighter">Organisation Pro!</h2>
                <p className="text-blue-100 text-lg mb-8 font-medium">Drive cleaned up successfully.</p>
                
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-10">
                   <div className="bg-white/10 p-4 rounded-3xl border border-white/20">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1">Total Score</p>
                      <p className="text-3xl font-black">{score}</p>
                   </div>
                   <div className="bg-white/10 p-4 rounded-3xl border border-white/20">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1">Efficiency</p>
                      <p className="text-3xl font-black">{Math.round((6 / attempts) * 100)}%</p>
                   </div>
                </div>

                <button 
                  onClick={startNewRound}
                  className="bg-white text-blue-600 px-10 py-4 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all"
                >
                  NEW CHALLENGE
                </button>
              </div>
            )}
          </div>

          <div className="bg-blue-100/50 rounded-3xl p-6 border-2 border-blue-50 flex items-center gap-6">
              <div className="bg-white p-3 rounded-2xl shadow-sm text-blue-500">
                  <FileText size={24} />
              </div>
              <p className="text-sm font-medium text-slate-600 italic leading-relaxed">
                "File extensions like <strong>.doc</strong> and <strong>.pdf</strong> tell the computer what kind of information is inside a file!"
              </p>
          </div>
        </div>
      </main>

      {/* 6. Educational Value Footer */}
      <footer className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-blue-600" size={24} />
          Digital Literacy Skills
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 tracking-tight">
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-blue-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Recognize <strong>file extensions</strong> (.doc, .jpg, .mp3) and their purposes.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-purple-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Understand <strong>folder hierarchy</strong> and how to categorize digital assets.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Improve <strong>motor skills</strong> through drag-and-drop interactions.</p>
          </div>
          <div className="flex gap-4">
            <div className="h-2 w-2 rounded-full bg-orange-400 mt-2 shrink-0" />
            <p className="text-slate-600 text-sm">Practice <strong>time management</strong> and efficiency in digital tasks.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
