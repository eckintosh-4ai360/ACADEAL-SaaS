"use client";

import { useState } from "react";
import { Search, Volume2, BookOpen, AlertCircle, Loader2 } from "lucide-react";

interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: {
    definition: string;
    example?: string;
    synonyms: string[];
    antonyms: string[];
  }[];
  synonyms: string[];
  antonyms: string[];
}

interface DictionaryPhonetic {
  text: string;
  audio: string;
}

interface DictionaryData {
  word: string;
  phonetic: string;
  phonetics: DictionaryPhonetic[];
  meanings: DictionaryMeaning[];
  sourceUrls: string[];
}

export default function DictionaryTool() {
  const [word, setWord] = useState("");
  const [data, setData] = useState<DictionaryData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!word.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/dictionary/search?word=${encodeURIComponent(word.trim())}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch word");
      }

      setData(Array.isArray(json) ? json : [json]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const playAudio = (audioUrl: string) => {
    if (audioUrl) {
      new Audio(audioUrl).play();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-[32px] border border-slate-200/70 bg-white/80 p-6 text-center shadow-[0_24px_80px_-52px_rgba(15,23,42,0.82)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-950/70 dark:shadow-[0_28px_90px_-60px_rgba(2,6,23,0.95)]">
        <div className="inline-flex items-center justify-center rounded-2xl bg-sky-100 p-3 text-sky-600 shadow-sm dark:bg-sky-500/15 dark:text-sky-300">
          <BookOpen size={32} />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
          Dictionary & Meaning Explorer
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-400">
          Search for words to find their meanings, parts of speech, pronunciation, and examples.
        </p>
      </div>

      <div className="relative mx-auto max-w-xl rounded-[28px] border border-slate-200/70 bg-white/80 p-3 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.72)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-950/70">
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-sky-500 dark:text-slate-500 dark:group-focus-within:text-sky-300" />
          </div>
          <input
            type="text"
            className="block w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-4 pl-11 pr-32 text-lg leading-5 text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-400/20"
            placeholder="Search for any word..."
            value={word}
            onChange={(e) => setWord(e.target.value)}
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <button
              type="submit"
              disabled={loading || !word.trim()}
              className="flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-2 font-medium text-white shadow-sm transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 dark:focus:ring-offset-slate-950"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Search"}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 shadow-sm animate-in fade-in zoom-in-95 duration-300 dark:border-rose-900/60 dark:bg-rose-950/30">
          <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-rose-500 dark:text-rose-300" />
          <div>
            <h3 className="text-sm font-medium text-rose-800 dark:text-rose-100">Word not found</h3>
            <p className="mt-1 text-sm text-rose-700 dark:text-rose-200">
              We couldn&apos;t find definitions for the word you were looking for. Please try another search.
            </p>
          </div>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {data.map((entry, index) => {
            const audioPhonetic = entry.phonetics?.find((p) => p.audio && p.audio.length > 0);

            return (
              <div key={index} className="relative overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.82)] backdrop-blur-xl sm:p-10 dark:border-slate-700/70 dark:bg-slate-950/70 dark:shadow-[0_28px_90px_-60px_rgba(2,6,23,0.95)]">
                <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 -mr-32 -mt-32 rounded-full bg-gradient-to-br from-sky-500/10 to-indigo-500/10 blur-3xl dark:from-sky-400/10 dark:to-cyan-400/10"></div>
                
                <div className="relative">
                  <div className="mb-8 flex flex-col gap-4 border-b border-slate-200/70 pb-8 sm:flex-row sm:items-baseline dark:border-slate-800">
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50">
                      {entry.word}
                    </h2>
                    {entry.phonetic && (
                      <span className="rounded-lg bg-sky-500/10 px-3 py-1 font-serif text-xl font-medium text-sky-700 sm:text-2xl dark:text-sky-300">
                        {entry.phonetic}
                      </span>
                    )}
                    {audioPhonetic && (
                      <button
                        onClick={() => playAudio(audioPhonetic.audio)}
                        className="group mt-2 flex items-center justify-center rounded-full bg-sky-500/10 p-3 text-sky-700 transition-colors hover:bg-sky-500/20 sm:mt-0 dark:text-sky-300"
                        title="Listen to pronunciation"
                      >
                        <Volume2 className="h-6 w-6 group-hover:scale-110 transition-transform" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-10">
                    {entry.meanings.map((meaning, mIndex) => (
                      <div key={mIndex} className="space-y-6">
                        <div className="flex items-center gap-4">
                          <h3 className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-1.5 text-xl font-bold italic text-slate-800 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100">
                            {meaning.partOfSpeech}
                          </h3>
                          <div className="h-px flex-grow bg-slate-200 dark:bg-slate-800"></div>
                        </div>

                        <ul className="space-y-6 pl-2 sm:pl-6">
                          {meaning.definitions.map((def, dIndex) => (
                            <li key={dIndex} className="relative">
                              <span className="absolute -left-6 top-1.5 mt-1 h-2 w-2 rounded-full bg-sky-400"></span>
                              <div className="space-y-3">
                                <p className="text-lg leading-relaxed text-slate-800 dark:text-slate-200">
                                  {def.definition}
                                </p>
                                {def.example && (
                                  <div className="rounded-2xl border border-slate-200 border-l-4 border-l-sky-400 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70 dark:border-l-sky-300">
                                    <p className="italic text-slate-600 dark:text-slate-300">&ldquo;{def.example}&rdquo;</p>
                                  </div>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>

                        {meaning.synonyms && meaning.synonyms.length > 0 && (
                          <div className="flex items-baseline gap-3 pl-2 sm:pl-6 pt-2">
                            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Synonyms</span>
                            <div className="flex flex-wrap gap-2">
                              {meaning.synonyms.map((syn, synIdx) => (
                                <button 
                                  key={synIdx} 
                                  onClick={() => { setWord(syn); setTimeout(() => handleSearch(), 50); }}
                                  className="cursor-pointer font-medium text-sky-700 transition-colors hover:text-sky-900 hover:underline dark:text-sky-300 dark:hover:text-sky-200"
                                >
                                  {syn}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {meaning.antonyms && meaning.antonyms.length > 0 && (
                          <div className="flex items-baseline gap-3 pl-2 sm:pl-6 pt-1">
                            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Antonyms</span>
                            <div className="flex flex-wrap gap-2">
                              {meaning.antonyms.map((ant, antIdx) => (
                                <button 
                                  key={antIdx} 
                                  onClick={() => { setWord(ant); setTimeout(() => handleSearch(), 50); }}
                                  className="cursor-pointer font-medium text-amber-700 transition-colors hover:text-amber-900 hover:underline dark:text-amber-300 dark:hover:text-amber-200"
                                >
                                  {ant}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
