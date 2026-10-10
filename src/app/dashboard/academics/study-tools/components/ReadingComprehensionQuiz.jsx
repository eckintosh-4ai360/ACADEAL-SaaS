"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Check, RotateCcw, Lightbulb, BookOpen, ChevronRight, HelpCircle, Award, ChevronLeft } from "lucide-react";

const PASSAGES = [
  {
    id: 1,
    title: "The Mystery of the Missing Mangoes",
    text: `Kofi's grandfather had the most magnificent mango tree in all of Cape Coast. Every July, its branches bowed under the weight of large, sweet-smelling fruit that gleamed like polished copper in the afternoon sun.\n\nOne Tuesday, Kofi discovered a problem. The lowest branches, which just yesterday held at least a dozen ripe mangoes, were completely bare. He examined the soft earth around the trunk but found no footprints except his own and the small, paired tracks of a wandering goat.\n\n"A goat cannot reach that high," Kofi muttered, rubbing his chin. He looked up into the canopy. High above, hidden among the dense, dark green leaves, he spotted a flash of grey fur and a long, curling tail. A troop of Mona monkeys had discovered grandfather's treasure! Kofi couldn't help but smile; at least the thieves had good taste.`,
    vocabulary: [
      { word: "canopy", meaning: "the uppermost connected branches and leaves of trees" },
      { word: "magnificent", meaning: "impressive to look at; exceptionally beautiful" },
      { word: "canopy", meaning: "the uppermost branches of the trees in a forest, forming a more or less continuous layer." }
    ],
    questions: [
      {
        id: "q1",
        text: "What time of year does the mango tree produce its fruit?",
        options: ["August", "July", "December", "March"],
        answerIndex: 1,
        hint: "Look at the first paragraph when describing the tree's branches.",
        explanation: "The passage explicitly states 'Every July, its branches bowed under the weight of large, sweet-smelling fruit'."
      },
      {
        id: "q2",
        text: "In the context of the passage, what does the phrase 'gleamed like polished copper' suggest about the mangoes?",
        options: [
          "They were very hard and metallic.",
          "They were dirty and needed polish.",
          "They had a shiny, bright orange-brown colour.",
          "They smelled like old coins."
        ],
        answerIndex: 2,
        hint: "Copper is a shiny, reddish-brown metal. The author uses this phrase metaphorically.",
        explanation: "This is a simile used to describe their vibrant, shiny appearance, not their physical texture or smell."
      },
      {
        id: "q3",
        text: "What led Kofi to conclude that a goat was NOT responsible for the missing fruit?",
        options: [
          "He found monkey footprints instead.",
          "Goats don't like eating mangoes.",
          "The missing mangoes were too high up for a goat.",
          "His grandfather had already chased the goat away."
        ],
        answerIndex: 2,
        hint: "What does Kofi say to himself after examining the ground?",
        explanation: "Kofi mutters 'A goat cannot reach that high', showing he reasoned the fruit was taken from branches out of a goat's reach."
      },
      {
        id: "q4",
        text: "What is Kofi's reaction upon discovering the true culprits?",
        options: [
          "He is furious and chases them.",
          "He is frightened and runs to his grandfather.",
          "He is confused about how they got there.",
          "He is amused and slightly admiring."
        ],
        answerIndex: 3,
        hint: "Look at the very last sentence of the passage.",
        explanation: "The passage says 'Kofi couldn't help but smile; at least the thieves had good taste', indicating amusement."
      }
    ]
  },
  {
    id: 2,
    title: "Yaa Asantewaa's Legacy",
    text: `Yaa Asantewaa was born in 1840 in Besease. As the Queen Mother of Ejisu, she became a pivotal figure in the history of the Ashanti Empire.\n\nIn 1900, the British governor, Sir Frederick Hodgson, made a deeply offensive demand: he ordered the Ashanti chiefs to surrender the Golden Stool, the sacred symbol of the Ashanti nation's soul and unity. The chiefs held a secret meeting to discuss their response. Many were afraid and argued for submission, hoping to avoid further conflict with the heavily armed British forces.\n\nIt was then that Yaa Asantewaa famously stood up and declared: "If you, the men of Ashanti, will not go forward, then we will. We, the women, will. I shall call upon my fellow women. We will fight the white men. We will fight till the last of us falls in the battlefields."\n\nHer courage galvanized the Ashanti people, leading to the War of the Golden Stool. Although she was eventually captured and exiled to the Seychelles, where she died in 1921, she successfully protected the Golden Stool. Today, she is remembered as a symbol of resistance and female leadership.`,
    vocabulary: [
      { word: "pivotal", meaning: "of crucial importance in relation to the development or success of something else" },
      { word: "galvanized", meaning: "shocked or excited someone into taking action" },
      { word: "submission", meaning: "the action of accepting or yielding to a superior force or to the will or authority of another person" }
    ],
    questions: [
      {
        id: "q1",
        text: "What was the significance of the Golden Stool to the Ashanti people?",
        options: [
          "It was a valuable trading commodity.",
          "It was the personal property of Yaa Asantewaa.",
          "It symbolized the soul and unity of the nation.",
          "It was a gift from the British governor."
        ],
        answerIndex: 2,
        hint: "Check the second paragraph, specifically the description given right after 'the Golden Stool'.",
        explanation: "The passage explicitly describes the Golden Stool as 'the sacred symbol of the Ashanti nation's soul and unity'."
      },
      {
        id: "q2",
        text: "Why did the Ashanti chiefs initially hesitate to fight the British?",
        options: [
          "They did not care about the Golden Stool.",
          "They were afraid of the British forces and wanted to avoid conflict.",
          "They thought Yaa Asantewaa should fight instead.",
          "They wanted to ally with the British."
        ],
        answerIndex: 1,
        hint: "Read the sentence describing the secret meeting of the chiefs.",
        explanation: "The text states 'Many were afraid and argued for submission, hoping to avoid further conflict with the heavily armed British forces.'"
      },
      {
        id: "q3",
        text: "What does the word 'galvanized' mean as used in the passage?",
        options: [
          "To cover with a protective layer of zinc.",
          "To confuse or bewilder a group of people.",
          "To shock or excite people into taking action.",
          "To anger someone so much they give up."
        ],
        answerIndex: 2,
        hint: "Look at the result of Yaa Asantewaa's speech. What did the people do next?",
        explanation: "Her speech inspired and stirred the people to act and fight the war, matching the definition 'excited into taking action'."
      },
      {
        id: "q4",
        text: "Which of the following is true regarding the outcome of the war according to the passage?",
        options: [
          "Yaa Asantewaa defeated the British and became Governor.",
          "The British captured the Golden Stool.",
          "Yaa Asantewaa was exiled, but the Golden Stool was kept safe.",
          "Yaa Asantewaa died during the battle in 1900."
        ],
        answerIndex: 2,
        hint: "Read the final paragraph carefully to see what happened to Yaa Asantewaa and what happened to the Stool.",
        explanation: "The text explicitly says 'Although she was eventually captured and exiled... she successfully protected the Golden Stool.'"
      }
    ]
  }
];

export default function ReadingComprehensionQuiz() {
  const [passageIndex, setPassageIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionId: selectedIndex }
  const [feedback, setFeedback] = useState({}); // { questionId: { status, message } }
  const [attempts, setAttempts] = useState({}); // { questionId: count }
  const [showVocab, setShowVocab] = useState(false);
  const [highlightedText, setHighlightedText] = useState(null); // String to highlight in passage

  const currentPassage = PASSAGES[passageIndex];
  const currentQuestion = currentPassage.questions[currentQuestionIndex];
  
  const isQuestionAnsweredCorrectly = feedback[currentQuestion.id]?.status === "correct";

  const handleSelectAnswer = (optionIndex) => {
    if (isQuestionAnsweredCorrectly) return; // Don't allow changing answer after getting it right
    
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionIndex
    }));
  };

  const handleCheckAnswer = () => {
    const selected = selectedAnswers[currentQuestion.id];
    if (selected === undefined) return;

    const currentAttempts = (attempts[currentQuestion.id] || 0) + 1;
    setAttempts(prev => ({ ...prev, [currentQuestion.id]: currentAttempts }));

    if (selected === currentQuestion.answerIndex) {
      setFeedback(prev => ({
        ...prev,
        [currentQuestion.id]: {
          status: "correct",
          message: currentQuestion.explanation
        }
      }));
    } else {
      setFeedback(prev => ({
        ...prev,
        [currentQuestion.id]: {
          status: "incorrect",
          message: currentAttempts >= 2 ? currentQuestion.hint : "Not quite right. Try again!"
        }
      }));
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < currentPassage.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const switchPassage = (index) => {
    setPassageIndex(index);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setFeedback({});
    setAttempts({});
    setShowVocab(false);
    setHighlightedText(null);
  };

  const calculateScore = () => {
    let correctOnFirstTry = 0;
    currentPassage.questions.forEach(q => {
      if (feedback[q.id]?.status === "correct" && attempts[q.id] === 1) {
        correctOnFirstTry++;
      }
    });
    return Math.round((correctOnFirstTry / currentPassage.questions.length) * 100);
  };

  const allQuestionsAnswered = currentPassage.questions.every(q => feedback[q.id]?.status === "correct");

  // Format passage text to highlight vocabulary or hints if needed
  const renderPassageText = () => {
    let text = currentPassage.text;
    
    // Split by newlines for paragraphs
    return text.split('\n\n').map((paragraph, pIdx) => {
        let content = paragraph;
        
        // Simple highlighting mechanism
        if (highlightedText && paragraph.includes(highlightedText)) {
            const parts = paragraph.split(highlightedText);
            return (
                <p key={pIdx} className="mb-4 text-slate-700 leading-relaxed text-lg">
                    {parts.map((part, i) => (
                        <span key={i}>
                            {part}
                            {i < parts.length - 1 && (
                                <span className="bg-amber-200 text-amber-900 px-1 rounded font-medium shadow-sm transition-all duration-300">
                                    {highlightedText}
                                </span>
                            )}
                        </span>
                    ))}
                </p>
            );
        }

        return <p key={pIdx} className="mb-4 text-slate-700 leading-relaxed sm:text-lg">{content}</p>;
    });
  };


  return (
    <div className="w-full max-w-6xl mx-auto bg-slate-50 rounded-3xl overflow-hidden shadow-2xl font-sans text-slate-800">
      {/* ── BACK BUTTON ── */}
      <div className="p-4 sm:p-6 pb-0">
        <Link 
          href="/dashboard/academics/study-tools"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Study Tools
        </Link>
      </div>

      {/* Header section */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 p-6 sm:p-8 text-white relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-white/5 shrink-0">
            📖
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Comprehension Explorer</h1>
            <p className="text-blue-200 text-lg font-medium opacity-90">Read closely, think deeply, answer correctly.</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
           <div className="flex gap-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm border border-white/10 text-nowrap">JHS 1–3</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm border border-white/10 flex items-center gap-1">⏰ 20m</span>
          </div>
          {allQuestionsAnswered && (
              <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-md flex items-center gap-1 animate-in zoom-in">
                  <Award size={16}/> Score: {calculateScore()}%
              </div>
          )}
        </div>
      </div>

      {/* Passage Selector */}
      <div className="bg-white border-b border-slate-200 px-6 sm:px-8 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {PASSAGES.map((p, idx) => (
              <button 
                  key={p.id}
                  onClick={() => switchPassage(idx)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                      passageIndex === idx 
                        ? "bg-indigo-100 text-indigo-800 border-2 border-indigo-300" 
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200 border-2 border-transparent"
                  }`}
              >
                  {p.title}
              </button>
          ))}
      </div>

      <div className="p-6 sm:p-8 bg-slate-50 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Passage */}
        <div className="lg:col-span-7 flex flex-col gap-4">
            
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full max-h-[800px]">
                {/* Passage Header */}
                <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-blue-900">{currentPassage.title}</h2>
                    <button 
                        onClick={() => setShowVocab(!showVocab)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            showVocab ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                        }`}
                    >
                        <BookOpen size={14} /> Vocabulary
                    </button>
                </div>

                {/* Vocabulary Drawer */}
                {showVocab && (
                    <div className="bg-amber-50 px-6 py-3 border-b border-amber-100 animate-in slide-in-from-top-2">
                        <p className="text-xs uppercase tracking-widest font-bold text-amber-700/70 mb-2">Key Words</p>
                        <div className="flex flex-wrap gap-2">
                            {currentPassage.vocabulary.map((v, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => setHighlightedText(v.word)}
                                    className="bg-white border border-amber-200 px-2 py-1 rounded shadow-sm text-sm hover:border-amber-400 group relative"
                                >
                                    <span className="font-bold text-amber-900 group-hover:underline">{v.word}</span>
                                    {/* Tooltip */}
                                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-48 bg-slate-800 text-white text-xs p-2 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                                        {v.meaning}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* The Reading Text */}
                <div className="p-6 sm:p-8 overflow-y-auto font-serif">
                    {renderPassageText()}
                </div>
            </div>
            
        </div>

        {/* Right Column: Questions & Controls */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 flex gap-4 items-start shadow-sm">
            <div className="bg-indigo-500 rounded-full p-2 text-white mt-1 shrink-0">
              <Lightbulb size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 mb-1">How to Use</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Read the passage carefully. Click on <strong>Vocabulary</strong> to see tricky words. Answer the questions on the right to test your understanding!
              </p>
            </div>
          </div>

          {/* Question Panel */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1">
              
              {/* Progress Bar */}
              <div className="px-6 pt-6 pb-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                      <span>Question Details</span>
                      <span>{currentQuestionIndex + 1} of {currentPassage.questions.length}</span>
                  </div>
                  <div className="flex gap-1.5 h-2">
                      {currentPassage.questions.map((q, i) => {
                          const status = feedback[q.id]?.status;
                          let bg = "bg-slate-100";
                          if (status === "correct") bg = "bg-emerald-400";
                          else if (i === currentQuestionIndex) bg = "bg-indigo-400";
                          return <div key={q.id} className={`flex-1 rounded-full transition-colors ${bg}`}></div>
                      })}
                  </div>
              </div>

              {/* The Question */}
              <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-slate-800 mb-6 leading-snug">
                       {currentQuestion.text}
                  </h3>

                  <div className="flex flex-col gap-3 flex-1">
                      {currentQuestion.options.map((opt, i) => {
                          const isSelected = selectedAnswers[currentQuestion.id] === i;
                          const isCorrect = isQuestionAnsweredCorrectly && currentQuestion.answerIndex === i;
                          const isWrongSelection = feedback[currentQuestion.id]?.status === "incorrect" && isSelected;
                          
                          let btnClass = "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 bg-white";
                          
                          if (isCorrect) {
                              btnClass = "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500 ring-opacity-50";
                          } else if (isWrongSelection) {
                              btnClass = "border-rose-300 bg-rose-50 text-rose-800";
                          } else if (isSelected) {
                              btnClass = "border-indigo-500 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500 ring-opacity-50";
                          }

                          // Option letter A, B, C, D
                          const letter = String.fromCharCode(65 + i);

                          return (
                              <button 
                                  key={i}
                                  onClick={() => handleSelectAnswer(i)}
                                  // disabled={isQuestionAnsweredCorrectly}
                                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${btnClass}`}
                              >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 transition-colors ${
                                      isCorrect ? "bg-emerald-500 text-white" :
                                      isWrongSelection ? "bg-rose-500 text-white" :
                                      isSelected ? "bg-indigo-500 text-white" :
                                      "bg-slate-100 text-slate-500"
                                  }`}>
                                      {letter}
                                  </div>
                                  <span className="font-medium pt-1 leading-snug">{opt}</span>
                              </button>
                          );
                      })}
                  </div>

                  {/* Feedback Area */}
                   {feedback[currentQuestion.id] && (
                        <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 ${
                            feedback[currentQuestion.id].status === 'correct' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                            'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}>
                            <div className="mt-0.5 shrink-0">
                                {feedback[currentQuestion.id].status === 'correct' ? <Check className="text-emerald-600" size={20} /> : <HelpCircle className="text-amber-600" size={20} />}
                            </div>
                            <div>
                                <h4 className="font-bold text-sm tracking-tight mb-1">
                                    {feedback[currentQuestion.id].status === 'correct' ? 'Correct!' : 'Hint'}
                                </h4>
                                <p className="text-sm font-medium opacity-90 leading-relaxed">{feedback[currentQuestion.id].message}</p>
                            </div>
                        </div>
                    )}

              </div>

              {/* Action Buttons */}
              <div className="p-6 bg-slate-50 rounded-b-3xl border-t border-slate-200 flex gap-3">
                  {!isQuestionAnsweredCorrectly ? (
                      <button 
                          onClick={handleCheckAnswer}
                          disabled={selectedAnswers[currentQuestion.id] === undefined}
                          className={`flex-1 py-4 font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                              selectedAnswers[currentQuestion.id] !== undefined
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                          }`}
                      >
                          <Check size={20} /> Check Answer
                      </button>
                  ) : (
                      currentQuestionIndex < currentPassage.questions.length - 1 ? (
                          <button 
                              onClick={nextQuestion}
                              className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 animate-pulse"
                          >
                              Next Question <ChevronRight size={20} />
                          </button>
                      ) : (
                          <button 
                              onClick={() => {
                                  const nextPIdx = (passageIndex + 1) % PASSAGES.length;
                                  switchPassage(nextPIdx);
                              }}
                              className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                             Try Next Passage <ChevronRight size={20} />
                          </button>
                      )
                  )}
                  
                  {/* Prev/Next nav for review */}
                  {isQuestionAnsweredCorrectly && currentQuestionIndex > 0 && (
                      <button 
                          onClick={prevQuestion}
                          className="px-6 py-4 bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl transition-all"
                      >
                          Review
                      </button>
                  )}
              </div>
          </div>
        </div>
      </div>

      {/* Educational Footer */}
      <div className="bg-slate-100/50 p-6 sm:p-8 border-t border-slate-200">
        <h4 className="font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200/80">🧠 What students are learning:</h4>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 text-sm font-medium">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 shrink-0 mt-0.5">•</span>
            <span><strong>Literal Comprehension:</strong> Finding stated facts directly within the text (Who, what, when, where).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 shrink-0 mt-0.5">•</span>
            <span><strong>Inferential Reading:</strong> Reading between the lines to draw logical conclusions not explicitly stated.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 shrink-0 mt-0.5">•</span>
            <span><strong>Vocabulary in Context:</strong> Using surrounding context clues to decipher the meaning of unfamiliar words.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 shrink-0 mt-0.5">•</span>
            <span><strong>Test Strategy:</strong> Eliminating obviously wrong answers and referencing the text before answering.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
