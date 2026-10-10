import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function PunctuationFixer() {
  // Game state
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [userPunctuation, setUserPunctuation] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [selectedTool, setSelectedTool] = useState('period'); // period, comma, question

  // Sentences with missing punctuation - for Primary 4-6
  const sentences = useMemo(() => [
    {
      text: "The little dog ran to the park",
      missing: [{ position: 25, correct: '.' }],
      hint: "This sentence tells us something happened, so it needs a full stop at the end."
    },
    {
      text: "I like apples oranges and bananas",
      missing: [{ position: 11, correct: ',' }, { position: 21, correct: '.' }],
      hint: "When we list things, we use commas to separate them, and a full stop at the end."
    },
    {
      text: "Can you see the big rainbow",
      missing: [{ position: 24, correct: '?' }],
      hint: "This is a question, so it needs a question mark at the end."
    },
    {
      text: "The bird flew high in the blue sky",
      missing: [{ position: 26, correct: '.' }],
      hint: "This is a statement, so it needs a full stop at the end."
    },
    {
      text: "My favourite colours are red blue and green",
      missing: [{ position: 21, correct: ',' }, { position: 31, correct: '.' }],
      hint: "List three things using commas, then end with a full stop."
    },
    {
      text: "What time is it now",
      missing: [{ position: 15, correct: '?' }],
      hint: "Asking about time needs a question mark."
    },
    {
      text: "She went to school early in the morning",
      missing: [{ position: 28, correct: '.' }],
      hint: "A sentence about what someone did needs a full stop."
    },
    {
      text: "I have a cat a dog and a rabbit",
      missing: [{ position: 8, correct: ',' }, { position: 15, correct: ',' }, { position: 25, correct: '.' }],
      hint: "When listing three things, use two commas and end with a full stop."
    },
    {
      text: "Where is my pencil case",
      missing: [{ position: 19, correct: '?' }],
      hint: "This asks about a location, so use a question mark."
    },
    {
      text: "The flowers are pretty and colourful",
      missing: [{ position: 25, correct: '.' }],
      hint: "This describes something nice, so end with a full stop."
    }
  ], []);

  const currentSentence = sentences[currentSentenceIndex];

  // Handle punctuation tool selection
  const selectTool = useCallback((tool) => {
    setSelectedTool(tool);
  }, []);

  // Handle clicking on a position to add punctuation
  const handlePositionClick = useCallback((position) => {
    if (gameOver || gameWon || feedback?.correct) return;
    
    setUserPunctuation(prev => {
      const current = prev[position];
      if (current) {
        // If already has punctuation at this position, remove it
        const newPunct = { ...prev };
        delete newPunct[position];
        return newPunct;
      } else {
        // Add selected punctuation at this position
        return { ...prev, [position]: selectedTool };
      }
    });
  }, [selectedTool, gameOver, gameWon, feedback]);

  // Check answer
  const checkAnswer = useCallback(() => {
    if (gameOver || gameWon) return;

    let correct = true;
    const userKeys = Object.keys(userPunctuation);
    const correctPositions = currentSentence.missing.map(m => m.position);

    // Check if user has all correct punctuation marks
    for (const missing of currentSentence.missing) {
      if (userPunctuation[missing.position] !== missing.correct) {
        correct = false;
        break;
      }
    }

    // Check if user added extra incorrect punctuation
    for (const key of userKeys) {
      const pos = parseInt(key);
      if (!currentSentence.missing.find(m => m.position === pos)) {
        correct = false;
        break;
      }
    }

    if (correct) {
      setScore(prev => prev + 10);
      setFeedback({ correct: true, message: "✅ Fantastic! You got it right!" });
      setTimeout(() => {
        if (currentSentenceIndex < sentences.length - 1) {
          setCurrentSentenceIndex(prev => prev + 1);
          setUserPunctuation({});
          setFeedback(null);
          setAttempts(0);
        } else {
          setGameWon(true);
          setShowCelebration(true);
        }
      }, 1500);
    } else {
      setAttempts(prev => prev + 1);
      const newLives = lives - 1;
      setLives(newLives);
      
      if (newLives <= 0) {
        setGameOver(true);
        // Show correct answer
        const correctAnswer = {};
        currentSentence.missing.forEach(m => {
          correctAnswer[m.position] = m.correct;
        });
        setUserPunctuation(correctAnswer);
        setFeedback({ correct: false, message: "😢 Game Over! Better luck next time!" });
      } else {
        setFeedback({ correct: false, message: "❌ Not quite right. Try again!" });
      }
    }
  }, [userPunctuation, currentSentence, currentSentenceIndex, sentences.length, lives]);

  // Reset game
  const resetGame = useCallback(() => {
    setScore(0);
    setLives(3);
    setCurrentSentenceIndex(0);
    setUserPunctuation({});
    setFeedback(null);
    setAttempts(0);
    setGameOver(false);
    setGameWon(false);
    setShowCelebration(false);
    setSelectedTool('period');
  }, []);

  // Calculate progress
  const progress = useMemo(() => {
    return ((currentSentenceIndex + 1) / sentences.length) * 100;
  }, [currentSentenceIndex, sentences.length]);

  // Render word with clickable positions
  const renderSentence = () => {
    const words = currentSentence.text.split(' ');
    let charIndex = 0;
    
    return (
      <div className="flex flex-wrap justify-center gap-x-16 gap-y-12 text-3xl md:text-5xl">
        {words.map((word, wordIndex) => {
          const wordStart = charIndex;
          const wordEnd = charIndex + word.length;
          charIndex = wordEnd + 1; // +1 for space
          
          return (
            <div key={wordIndex} className="flex items-center">
              <div className="relative group">
                <span className="text-slate-900 font-extrabold tracking-tight drop-shadow-sm">{word}</span>
                {/* Clickable area after each word */}
                {wordIndex < words.length - 1 && (
                  <button
                    onClick={() => handlePositionClick(wordEnd)}
                    className={`absolute -right-10 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-125 hover:shadow-xl ${
                      userPunctuation[wordEnd]
                        ? 'bg-orange-500 text-white shadow-lg ring-4 ring-orange-200'
                        : 'bg-slate-100 border-2 border-slate-200 hover:bg-orange-100 text-slate-400'
                    }`}
                    disabled={gameOver || gameWon || feedback?.correct}
                  >
                    <span className="text-xl font-black">
                      {userPunctuation[wordEnd] || '+'}
                    </span>
                  </button>
                )}
                {/* Last word - end of sentence */}
                {wordIndex === words.length - 1 && (
                  <button
                    onClick={() => handlePositionClick(wordEnd)}
                    className={`absolute -right-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-125 hover:shadow-xl ${
                      userPunctuation[wordEnd]
                        ? 'bg-orange-500 text-white shadow-lg ring-4 ring-orange-200'
                        : 'bg-slate-100 border-2 border-slate-200 hover:bg-orange-100 text-slate-400'
                    }`}
                    disabled={gameOver || gameWon || feedback?.correct}
                  >
                    <span className="text-2xl font-black">
                      {userPunctuation[wordEnd] || '+'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-orange-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* ── BACK BUTTON ── */}
        <div className="mb-4">
          <Link 
            href="/dashboard/academics/study-tools"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Study Tools
          </Link>
        </div>

        {/* HEADER */}
        <header className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl">📝</span>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800">Punctuation Fixer</h1>
                <p className="text-lg text-slate-600">Add the missing punctuation marks!</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-semibold text-sm">
                📚 Level 4-6
              </span>
              <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold text-sm">
                ⏱️ 10 min
              </span>
            </div>
          </div>
        </header>

        {/* HOW TO USE BOX */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-5 mb-6">
          <h3 className="text-lg font-bold text-yellow-800 mb-2">📖 How to Play</h3>
          <p className="text-yellow-900">
            Choose a punctuation mark below, then tap the <span className="font-bold">+</span> buttons after words to add punctuation. 
            Press "Check My Answer" when you're done!
          </p>
        </div>

        {/* MAIN GAME AREA */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* LEFT PANEL - Controls & Score */}
          <div className="md:col-span-1 space-y-4">
            {/* SCORE CARD */}
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <h3 className="text-lg font-bold text-slate-700 mb-3">🏆 Score</h3>
              <div className="text-4xl font-bold text-blue-600">{score}</div>
            </div>

            {/* LIVES */}
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <h3 className="text-lg font-bold text-slate-700 mb-3">❤️ Lives</h3>
              <div className="flex gap-2">
                {[...Array(3)].map((_, i) => (
                  <span 
                    key={i} 
                    className={`text-3xl transition-all duration-300 ${
                      i < lives ? 'opacity-100 scale-100' : 'opacity-30 scale-75'
                    }`}
                  >
                    ❤️
                  </span>
                ))}
              </div>
            </div>

            {/* PUNCTUATION TOOLS */}
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <h3 className="text-lg font-bold text-slate-700 mb-3">🔧 Choose Mark</h3>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => selectTool('period')}
                  className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 ${
                    selectedTool === 'period' 
                      ? 'bg-blue-500 text-white shadow-lg ring-4 ring-blue-300' 
                      : 'bg-slate-100 text-slate-600 hover:bg-blue-100'
                  }`}
                >
                  <span className="text-3xl font-bold">.</span>
                  <span className="text-xs mt-1">Full Stop</span>
                </button>
                <button
                  onClick={() => selectTool('comma')}
                  className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 ${
                    selectedTool === 'comma' 
                      ? 'bg-green-500 text-white shadow-lg ring-4 ring-green-300' 
                      : 'bg-slate-100 text-slate-600 hover:bg-green-100'
                  }`}
                >
                  <span className="text-3xl font-bold">,</span>
                  <span className="text-xs mt-1">Comma</span>
                </button>
                <button
                  onClick={() => selectTool('question')}
                  className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 ${
                    selectedTool === 'question' 
                      ? 'bg-orange-500 text-white shadow-lg ring-4 ring-orange-300' 
                      : 'bg-slate-100 text-slate-600 hover:bg-orange-100'
                  }`}
                >
                  <span className="text-3xl font-bold">?</span>
                  <span className="text-xs mt-1">Question</span>
                </button>
              </div>
            </div>

            {/* ATTEMPTS */}
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <h3 className="text-lg font-bold text-slate-700 mb-3">🔄 Attempts</h3>
              <div className="text-2xl font-semibold text-slate-600">{attempts}</div>
            </div>
          </div>

          {/* CENTER - Visual Output Area */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-6 min-h-[400px] flex flex-col">
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-slate-600 mb-2">
                  <span>Progress</span>
                  <span>{currentSentenceIndex + 1} / {sentences.length}</span>
                </div>
                <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-400 to-green-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Sentence Display */}
              {!gameOver && !gameWon && (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="bg-white border-4 border-slate-50 rounded-[2rem] p-10 md:p-16 w-full shadow-inner">
                    {renderSentence()}
                  </div>
                </div>
              )}

              {/* GAME OVER / WIN SCREENS */}
              {(gameOver || gameWon) && (
                <div className="flex-1 flex flex-col items-center justify-center">
                  {showCelebration && (
                    <div className="text-8xl mb-4 animate-bounce">🎉</div>
                  )}
                  <h2 className={`text-3xl font-bold mb-4 ${gameWon ? 'text-green-600' : 'text-red-600'}`}>
                    {gameWon ? '🎉 Congratulations!' : '😢 Game Over'}
                  </h2>
                  {gameWon && (
                    <p className="text-xl text-slate-600 mb-2">You completed all sentences!</p>
                  )}
                  <p className="text-2xl font-bold text-blue-600">Final Score: {score}</p>
                </div>
              )}

              {/* FEEDBACK AREA */}
              {feedback && !gameWon && !gameOver && (
                <div className={`mt-6 p-4 rounded-2xl text-center transition-all duration-300 ${
                  feedback.correct ? 'bg-green-100 border-2 border-green-300' : 'bg-red-100 border-2 border-red-300'
                }`}>
                  <p className="text-lg font-bold">{feedback.message}</p>
                  {!feedback.correct && attempts > 0 && (
                    <p className="text-sm text-slate-600 mt-2">💡 Hint: {currentSentence.hint}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CHECK ANSWER BUTTON */}
        {!gameOver && !gameWon && (
          <div className="text-center mb-6">
            <button
              onClick={checkAnswer}
              disabled={feedback?.correct}
              className={`min-h-14 text-lg font-bold px-12 py-4 rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg ${
                feedback?.correct
                  ? 'bg-green-400 text-white cursor-default'
                  : 'bg-gradient-to-r from-blue-500 to-green-500 text-white hover:from-blue-600 hover:to-green-600'
              }`}
            >
              {feedback?.correct ? '✅ Great Job!' : 'Check My Answer'}
            </button>
          </div>
        )}

        {/* PLAY AGAIN BUTTON */}
        {(gameOver || gameWon) && (
          <div className="text-center mb-6">
            <button
              onClick={resetGame}
              className="min-h-14 text-lg font-bold px-12 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white transition-all duration-300 hover:scale-105 shadow-lg hover:from-orange-600 hover:to-red-600"
            >
              🔄 Play Again
            </button>
          </div>
        )}

        {/* EDUCATIONAL VALUE FOOTER */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">📚 What You'll Learn</h3>
          <ul className="grid md:grid-cols-2 gap-3">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 text-xl">✓</span>
              <span className="text-slate-700">When to use full stops (.) to end sentences</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 text-xl">✓</span>
              <span className="text-slate-700">How to use commas (,) to separate items in a list</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 text-xl">✓</span>
              <span className="text-slate-700">When to use question marks (?) for questions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500 text-xl">✓</span>
              <span className="text-slate-700">How proper punctuation makes writing clearer</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
