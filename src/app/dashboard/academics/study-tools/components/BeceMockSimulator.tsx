"use client";

import { useState, useEffect } from "react";

const ALL_QUESTIONS = [
  // Math
  { subject: "Mathematics", question: "Solve for x in the equation: 2x - 4 = 10", options: ["7", "3", "14", "6"], answer: 0, explanation: "2x = 10 + 4 => 2x = 14 => x = 7." },
  { subject: "Mathematics", question: "Find the area of a triangle with base 4cm and height 5cm.", options: ["10 cm²", "20 cm²", "9 cm²", "18 cm²"], answer: 0, explanation: "Area = 1/2 * base * height = 1/2 * 4 * 5 = 10." },
  { subject: "Mathematics", question: "What is 20% of 500?", options: ["50", "100", "150", "200"], answer: 1, explanation: "(20/100) * 500 = 100." },
  { subject: "Mathematics", question: "Find the Least Common Multiple (LCM) of 4 and 6.", options: ["12", "24", "10", "2"], answer: 0, explanation: "Multiples of 4: 4, 8, 12. Multiples of 6: 6, 12. LCM is 12." },
  { subject: "Mathematics", question: "Express 0.25 as a fraction in its simplest form.", options: ["1/2", "1/4", "1/5", "2/5"], answer: 1, explanation: "0.25 = 25/100 = 1/4." },
  
  // Science
  { subject: "Integrated Science", question: "Which of the following processes involves the release of energy from food?", options: ["Photosynthesis", "Respiration", "Transpiration", "Digestion"], answer: 1, explanation: "Respiration is the chemical process in which energy is released from food substances." },
  { subject: "Integrated Science", question: "What gas do plants take in during photosynthesis?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], answer: 1, explanation: "Plants take in carbon dioxide from the air to produce food." },
  { subject: "Integrated Science", question: "The SI unit of electric current is the...", options: ["Volt", "Ohm", "Ampere", "Joule"], answer: 2, explanation: "Electric current is measured in Amperes (A)." },
  { subject: "Integrated Science", question: "Which planet is closest to the sun?", options: ["Venus", "Earth", "Mars", "Mercury"], answer: 3, explanation: "Mercury is the innermost and closest planet to the sun." },
  { subject: "Integrated Science", question: "At what temperature does water freeze under standard atmospheric pressure?", options: ["100°C", "50°C", "0°C", "-10°C"], answer: 2, explanation: "Water freezes at 0 degrees Celsius." },
  
  // Social Studies
  { subject: "Social Studies", question: "The highest mountain in Ghana is Mount...", options: ["Everest", "Kilimanjaro", "Afadja", "Gemi"], answer: 2, explanation: "Mount Afadja is the highest mountain in Ghana, located in the Volta Region." },
  { subject: "Social Studies", question: "Who was the first President of Ghana?", options: ["J.B. Danquah", "Dr. Kwame Nkrumah", "Jerry John Rawlings", "John Agyekum Kufuor"], answer: 1, explanation: "Dr. Kwame Nkrumah led Ghana to independence and became its first president." },
  { subject: "Social Studies", question: "In which year did Ghana gain independence?", options: ["1957", "1960", "1948", "1966"], answer: 0, explanation: "Ghana gained independence on 6th March 1957." },
  { subject: "Social Studies", question: "What is the capital of the Ashanti Region?", options: ["Accra", "Tamale", "Kumasi", "Sunyani"], answer: 2, explanation: "Kumasi is the capital and administrative centre of the Ashanti Region." },
  { subject: "Social Studies", question: "Which ocean borders Ghana to the south?", options: ["Indian Ocean", "Pacific Ocean", "Atlantic Ocean", "Arctic Ocean"], answer: 2, explanation: "Ghana lies along the Gulf of Guinea and the Atlantic Ocean to the south." },
  
  // English
  { subject: "English Language", question: "Choose the synonym for 'Joyful'.", options: ["Sad", "Happy", "Angry", "Tired"], answer: 1, explanation: "Joyful and Happy both mean feeling, expressing, or causing great pleasure." },
  { subject: "English Language", question: "Identify the noun in this sentence: 'The dog barked loudly.'", options: ["The", "dog", "barked", "loudly"], answer: 1, explanation: "A noun is a naming word. 'Dog' names an animal." },
  { subject: "English Language", question: "What is the plural of 'child'?", options: ["childs", "childrens", "children", "childes"], answer: 2, explanation: "'Children' is the irregular plural form of child." },
  { subject: "English Language", question: "Which of the following is spelt correctly?", options: ["Accomodation", "Accommodation", "Acommodation", "Acomodation"], answer: 1, explanation: "Accommodation has two 'c's and two 'm's." },
  { subject: "English Language", question: "What is the antonym of 'Ancient'?", options: ["Old", "Antique", "Modern", "Historic"], answer: 2, explanation: "Modern is the opposite of ancient." },
  
  // RME
  { subject: "RME", question: "The holy book of Islam is the...", options: ["Bible", "Quran", "Torah", "Vedas"], answer: 1, explanation: "The Quran is the central religious text of Islam." },
  { subject: "RME", question: "In Ghanaian traditional religion, people communicate with the Supreme Being mostly through...", options: ["Angels", "Ancestors and Lesser gods", "Prophets", "Saints"], answer: 1, explanation: "Traditional worshippers often use lesser gods and ancestors as intermediaries." },
  { subject: "RME", question: "According to the Bible, who led the Israelites out of Egypt?", options: ["Abraham", "David", "Jesus", "Moses"], answer: 3, explanation: "Moses is known as the prophet who led the Israelites out of slavery in Egypt." },
  { subject: "RME", question: "A place of worship for Christians is called a...", options: ["Mosque", "Shrine", "Church", "Temple"], answer: 2, explanation: "Christians gather to worship in a Church." },
  { subject: "RME", question: "Giving food to the poor is an act of...", options: ["Charity", "Fasting", "Prayer", "Pilgrimage"], answer: 0, explanation: "Charity involves giving help, typically in the form of money or goods, to those in need." },
  
  // ICT
  { subject: "Computing / ICT", question: "Which of these is an input device?", options: ["Monitor", "Printer", "Keyboard", "Speaker"], answer: 2, explanation: "A keyboard is used to enter (input) data into a computer." },
  { subject: "Computing / ICT", question: "The 'brain' of the computer is the...", options: ["RAM", "Hard Drive", "Motherboard", "CPU"], answer: 3, explanation: "The Central Processing Unit (CPU) executes instructions and is considered the brain." },
  { subject: "Computing / ICT", question: "What does RAM stand for?", options: ["Read Access Memory", "Random Access Memory", "Real Action Memory", "Recent Access Memory"], answer: 1, explanation: "RAM stands for Random Access Memory, the short-term memory of a computer." },
  { subject: "Computing / ICT", question: "Which application is primarily used to browse the internet?", options: ["Microsoft Word", "Web Browser", "Spreadsheet", "Media Player"], answer: 1, explanation: "A Web Browser (like Chrome or Firefox) is used to access websites." },
  { subject: "Computing / ICT", question: "What is the common keyboard shortcut to 'Save' a document?", options: ["Ctrl + C", "Ctrl + P", "Ctrl + S", "Ctrl + V"], answer: 2, explanation: "Ctrl + S is the universal shortcut for saving." },
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function BeceMockSimulator() {
  const [questions, setQuestions] = useState<typeof ALL_QUESTIONS>([]);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes for 30 questions
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  // Initialize random questions when component mounts
  useEffect(() => {
    setQuestions(shuffleArray(ALL_QUESTIONS));
  }, []);

  useEffect(() => {
    if (started && !submitted && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [started, submitted, timeLeft]);

  const handleSelect = (idx: number) => {
    setSelectedAnswers({ ...selectedAnswers, [currentQ]: idx });
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answer) score++;
    });
    return score;
  };

  if (!started) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6 py-12">
        <h1 className="text-4xl font-black flex justify-center items-center gap-3">
          <span className="text-5xl">⏱️</span> BECE Mock Exam
        </h1>
        <p className="text-muted-foreground text-lg">
          Take a timed practice test covering core JHS subjects. You have 30 minutes to complete 30 randomized questions.
        </p>
        <button 
          onClick={() => setStarted(true)}
          className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-bold text-lg hover:opacity-90 shadow-lg"
        >
          Start Mock Exam
        </button>
      </div>
    );
  }

  if (submitted || timeLeft === 0) {
    const score = calculateScore();
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-black">Exam Completed</h1>
          <div className="text-6xl font-black text-primary py-4">
            {score} / {questions.length}
          </div>
          <p className="text-lg text-muted-foreground">
            You scored {Math.round((score / questions.length) * 100)}% on this mock exam.
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Review Answers</h2>
          {questions.map((q, idx) => {
            const userAns = selectedAnswers[idx];
            const isCorrect = userAns === q.answer;
            return (
              <div key={idx} className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{q.subject}</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${isCorrect ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'}`}>
                    {isCorrect ? "Correct" : "Incorrect"}
                  </span>
                </div>
                <p className="text-lg font-semibold mb-4">{idx + 1}. {q.question}</p>
                
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  {q.options.map((opt, oIdx) => {
                    let btnClass = "border border-border bg-muted/20 text-muted-foreground";
                    if (oIdx === q.answer) {
                      btnClass = "bg-green-500/20 border-green-500 text-green-700 font-bold";
                    } else if (oIdx === userAns) {
                      btnClass = "bg-red-500/20 border-red-500 text-red-700 font-bold";
                    }
                    return (
                      <div key={oIdx} className={`p-3 rounded-xl ${btnClass}`}>
                        {String.fromCharCode(65 + oIdx)}. {opt}
                      </div>
                    );
                  })}
                </div>
                
                {!isCorrect && (
                  <div className="bg-muted p-4 rounded-xl text-sm">
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Handle case where questions are not yet loaded
  if (questions.length === 0) return null;

  const q = questions[currentQ];
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="font-semibold text-muted-foreground">
          Question {currentQ + 1} of {questions.length}
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium text-muted-foreground">Time Left:</span>
          <div className={`font-mono font-bold text-xl px-4 py-1 rounded-full ${timeLeft < 300 ? 'bg-red-500/10 text-red-500 animate-pulse' : 'bg-primary/10 text-primary'}`}>
            {mins}:{secs.toString().padStart(2, "0")}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-sm min-h-[400px] flex flex-col">
        <div className="mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full mb-4 inline-block">
            {q.subject}
          </span>
          <h2 className="text-2xl font-semibold leading-relaxed mt-2">{currentQ + 1}. {q.question}</h2>
        </div>

        <div className="space-y-3 flex-1">
          {q.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium ${
                selectedAnswers[currentQ] === idx 
                  ? 'border-primary bg-primary/5 text-primary' 
                  : 'border-border bg-background hover:border-primary/40'
              }`}
            >
              {String.fromCharCode(65 + idx)}. {opt}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-border">
          <button
            disabled={currentQ === 0}
            onClick={() => setCurrentQ((prev) => prev - 1)}
            className="px-6 py-2 rounded-full font-semibold text-muted-foreground disabled:opacity-50 hover:bg-muted"
          >
            Previous
          </button>
          
          {currentQ < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ((prev) => prev + 1)}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-semibold hover:opacity-90"
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => setSubmitted(true)}
              className="bg-green-500 text-white px-8 py-2 rounded-full font-bold hover:bg-green-600"
            >
              Submit Exam
            </button>
          )}
        </div>
      </div>
      
      {/* Question Navigator */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Jump to question</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentQ(idx)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                currentQ === idx
                  ? 'bg-primary text-primary-foreground'
                  : selectedAnswers[idx] !== undefined
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
