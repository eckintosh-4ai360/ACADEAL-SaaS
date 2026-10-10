"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Filter,
  Lock,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Send,
  ShieldCheck,
  ThumbsUp,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

type ViewerRole = "admin" | "teacher" | "student";
type ThreadTag = "Question" | "Announcement" | "Resource" | "Poll";
type ViewState = "home" | "forum" | "thread" | "compose";
type ForumLevel = "All" | "JHS" | "Primary";
type ThreadFilter = "All" | ThreadTag;

type Viewer = { role: ViewerRole; displayName: string; username: string };
type Reply = { id: string; authorName: string; authorRole: ViewerRole; authorUsername: string; body: string; createdAt: number; likes: number; isAcceptedAnswer: boolean };
type Thread = { id: string; forumId: string; title: string; body: string; authorName: string; authorRole: ViewerRole; authorUsername: string; createdAt: number; views: number; isPinned: boolean; tags: ThreadTag[]; replies: Reply[] };
type Forum = { id: string; className: string; level: Exclude<ForumLevel, "All">; subject: string; teacher: string; overview: string; note: string; accent: string; badge: string; glow: string };
type ForumSummary = { topicCount: number; replyCount: number; solvedCount: number; lastActivity: number };

const now = Date.now();
const ago = (minutes: number) => now - minutes * 60 * 1000;
let generatedSequence = 1000;
let generatedStamp = now;
const THREAD_TAGS: ThreadTag[] = ["Question", "Announcement", "Resource", "Poll"];
const ROLE_COPY = {
  admin: { label: "Admin", summary: "Full moderation is active.", detail: "You can pin threads, delete forums, and keep the board tidy.", badge: "border-amber-300/70 bg-amber-100 text-amber-900 dark:border-amber-400/35 dark:bg-amber-950/70 dark:text-amber-100" },
  teacher: { label: "Teacher", summary: "Teaching tools are active.", detail: "You can post announcements, pin guidance, and mark strong answers.", badge: "border-emerald-300/70 bg-emerald-100 text-emerald-900 dark:border-emerald-400/35 dark:bg-emerald-950/70 dark:text-emerald-100" },
  student: { label: "Student", summary: "Student mode is locked to your login.", detail: "Teacher and admin switching is disabled on this page.", badge: "border-sky-300/70 bg-sky-100 text-sky-900 dark:border-sky-400/35 dark:bg-sky-950/70 dark:text-sky-100" },
} as const;
const TAG_COPY: Record<ThreadTag, string> = {
  Question: "border-sky-300/70 bg-sky-100 text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-100",
  Announcement: "border-rose-300/70 bg-rose-100 text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-100",
  Resource: "border-emerald-300/70 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100",
  Poll: "border-violet-300/70 bg-violet-100 text-violet-800 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-100",
};

const FORUMS: Forum[] = [
  { id: "f1", className: "JHS 3", level: "JHS", subject: "Mathematics", teacher: "Mr. Samuel Boamah", overview: "Revision board for indices, algebra drills, and mock alerts.", note: "Fastest board for exam prep and worked examples.", accent: "bg-sky-500 dark:bg-sky-400", badge: "border-sky-300/70 bg-sky-100 text-sky-900 dark:border-sky-400/30 dark:bg-sky-400/[0.12] dark:text-sky-100", glow: "from-sky-200/70 via-cyan-100/60 to-transparent dark:from-sky-400/30 dark:via-cyan-400/[0.12] dark:to-transparent" },
  { id: "f2", className: "JHS 2", level: "JHS", subject: "Integrated Science", teacher: "Mrs. Patricia Ennin", overview: "Concept help for diagrams, experiments, and science videos.", note: "Useful for definitions, resources, and practical explanations.", accent: "bg-emerald-500 dark:bg-emerald-400", badge: "border-emerald-300/70 bg-emerald-100 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-400/[0.12] dark:text-emerald-100", glow: "from-emerald-200/70 via-teal-100/60 to-transparent dark:from-emerald-400/30 dark:via-teal-400/[0.12] dark:to-transparent" },
  { id: "f3", className: "Primary 6", level: "Primary", subject: "English Language", teacher: "Mr. Emmanuel Tetteh", overview: "Reading, grammar, and writing support for class practice.", note: "Good for comprehension help and sentence correction.", accent: "bg-amber-500 dark:bg-amber-400", badge: "border-amber-300/70 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/[0.12] dark:text-amber-100", glow: "from-amber-200/70 via-orange-100/60 to-transparent dark:from-amber-400/30 dark:via-orange-400/[0.12] dark:to-transparent" },
  { id: "f4", className: "JHS 1A", level: "JHS", subject: "Social Studies", teacher: "Mr. Daniel Quaye", overview: "Reflection board for civic values and class discussions.", note: "Best for quick opinions, polls, and recap notes.", accent: "bg-violet-500 dark:bg-violet-400", badge: "border-violet-300/70 bg-violet-100 text-violet-900 dark:border-violet-400/30 dark:bg-violet-400/[0.12] dark:text-violet-100", glow: "from-violet-200/70 via-fuchsia-100/60 to-transparent dark:from-violet-400/30 dark:via-fuchsia-400/[0.12] dark:to-transparent" },
  { id: "f5", className: "Primary 4", level: "Primary", subject: "Computing", teacher: "Mrs. Gifty Andoh", overview: "Simple ICT board for practical steps and beginner help.", note: "Great for first-time computer questions and reminders.", accent: "bg-teal-500 dark:bg-teal-400", badge: "border-teal-300/70 bg-teal-100 text-teal-900 dark:border-teal-400/30 dark:bg-teal-400/[0.12] dark:text-teal-100", glow: "from-teal-200/70 via-cyan-100/60 to-transparent dark:from-teal-400/30 dark:via-cyan-400/[0.12] dark:to-transparent" },
];

const INITIAL_THREADS: Record<string, Thread[]> = {
  f1: [
    { id: "t1", forumId: "f1", title: "BECE mock timetable is ready", body: "Mock papers begin on Monday at 8:00 AM. Revise algebra, indices, and geometry. Bring your mathematical set.", authorName: "Mr. Samuel Boamah", authorRole: "teacher", authorUsername: "samuel.boamah", createdAt: ago(120), views: 45, isPinned: true, tags: ["Announcement"], replies: [{ id: "r1", authorName: "Kofi Mensah", authorRole: "student", authorUsername: "kofi.mensah", body: "Thank you sir. Are JHS 1 and JHS 2 topics included too?", createdAt: ago(70), likes: 2, isAcceptedAnswer: false }] },
    { id: "t2", forumId: "f1", title: "Negative indices still confuse me", body: "Why does x^-2 become 1 over x squared? A simple explanation will help.", authorName: "Ama Osei", authorRole: "student", authorUsername: "ama.osei", createdAt: ago(960), views: 22, isPinned: false, tags: ["Question"], replies: [{ id: "r2", authorName: "Kwame Addo", authorRole: "student", authorUsername: "kwame.addo", body: "A negative power means take the reciprocal. So x^-2 is 1 divided by x^2.", createdAt: ago(920), likes: 12, isAcceptedAnswer: true }] },
  ],
  f2: [
    { id: "t3", forumId: "f2", title: "Useful animation for photosynthesis", body: "This short animation explains chlorophyll, sunlight, water, and carbon dioxide in one clear flow.", authorName: "Mrs. Patricia Ennin", authorRole: "teacher", authorUsername: "patricia.ennin", createdAt: ago(4200), views: 60, isPinned: false, tags: ["Resource"], replies: [] },
    { id: "t4", forumId: "f2", title: "Difference between speed and velocity", body: "Please explain with one everyday example that is easy to remember.", authorName: "Yaw Barimah", authorRole: "student", authorUsername: "yaw.barimah", createdAt: ago(1140), views: 18, isPinned: false, tags: ["Question"], replies: [{ id: "r3", authorName: "Mrs. Patricia Ennin", authorRole: "teacher", authorUsername: "patricia.ennin", body: "Velocity is speed with a direction. Example: 50 km/h north.", createdAt: ago(1080), likes: 15, isAcceptedAnswer: false }] },
  ],
  f3: [{ id: "t5", forumId: "f3", title: "Comprehension revision challenge", body: "Post one tricky word from the passage and explain its meaning before assembly tomorrow.", authorName: "Mr. Emmanuel Tetteh", authorRole: "teacher", authorUsername: "emmanuel.tetteh", createdAt: ago(180), views: 27, isPinned: true, tags: ["Announcement"], replies: [] }],
  f4: [{ id: "t6", forumId: "f4", title: "Share one example of responsible citizenship", body: "Post one simple action a student can do to support the school or community, then say why it matters.", authorName: "Mr. Daniel Quaye", authorRole: "teacher", authorUsername: "daniel.quaye", createdAt: ago(1500), views: 29, isPinned: false, tags: ["Poll"], replies: [] }],
  f5: [{ id: "t7", forumId: "f5", title: "Why is the keyboard called an input device?", body: "I want a simple explanation I can remember during tests.", authorName: "Kojo Mensimah", authorRole: "student", authorUsername: "kojo.mensimah", createdAt: ago(3100), views: 11, isPinned: false, tags: ["Question"], replies: [{ id: "r4", authorName: "Mrs. Gifty Andoh", authorRole: "teacher", authorUsername: "gifty.andoh", body: "It sends letters, numbers, and commands into the computer.", createdAt: ago(3020), likes: 9, isAcceptedAnswer: true }] }],
};

const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
const trimText = (text: string, max = 160) => text.length <= max ? text : `${text.slice(0, max - 3).trim()}...`;
const nextId = (prefix: string) => { generatedSequence += 1; return `${prefix}-${generatedSequence}`; };
const nextStamp = () => { generatedStamp += 60 * 1000; return generatedStamp; };
const timeAgo = (stamp: number) => {
  const mins = Math.max(0, Math.round((Date.now() - stamp) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return mins === 1 ? "1 min ago" : `${mins} mins ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
};
const threadActivity = (thread: Thread) => Math.max(thread.createdAt, ...thread.replies.map((reply) => reply.createdAt), 0);

export default function DiscussionForums({ viewer }: { viewer: Viewer }) {
  const [currentView, setCurrentView] = useState<ViewState>("home");
  const [selectedForumId, setSelectedForumId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [forumSearch, setForumSearch] = useState("");
  const [forumLevel, setForumLevel] = useState<ForumLevel>("All");
  const [threadSearch, setThreadSearch] = useState("");
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>("All");
  const [forums, setForums] = useState(FORUMS);
  const [threadsByForum, setThreadsByForum] = useState<Record<string, Thread[]>>(INITIAL_THREADS);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadBody, setNewThreadBody] = useState("");
  const [newThreadTag, setNewThreadTag] = useState<ThreadTag>("Question");
  const [newReplyText, setNewReplyText] = useState("");
  const [likedReplyIds, setLikedReplyIds] = useState<string[]>([]);
  const deferredForumSearch = useDeferredValue(forumSearch);
  const deferredThreadSearch = useDeferredValue(threadSearch);
  const canModerate = viewer.role !== "student";
  const canDeleteForum = viewer.role === "admin";
  const allowedTags = canModerate ? THREAD_TAGS : (["Question", "Resource", "Poll"] as ThreadTag[]);
  const roleCopy = ROLE_COPY[viewer.role];
  const selectedForum = useMemo(() => forums.find((forum) => forum.id === selectedForumId) ?? null, [forums, selectedForumId]);
  const selectedThread = useMemo(() => !selectedForumId || !selectedThreadId ? null : (threadsByForum[selectedForumId] ?? []).find((thread) => thread.id === selectedThreadId) ?? null, [selectedForumId, selectedThreadId, threadsByForum]);
  const forumStats = useMemo<Record<string, ForumSummary>>(() => Object.fromEntries(forums.map((forum) => {
    const threads = threadsByForum[forum.id] ?? [];
    return [forum.id, {
      topicCount: threads.length,
      replyCount: threads.reduce((sum, thread) => sum + thread.replies.length, 0),
      solvedCount: threads.filter((thread) => thread.replies.some((reply) => reply.isAcceptedAnswer)).length,
      lastActivity: threads.length ? Math.max(...threads.map(threadActivity)) : 0,
    }];
  })), [forums, threadsByForum]);
  const filteredForums = useMemo(() => {
    const query = deferredForumSearch.trim().toLowerCase();
    return forums.filter((forum) => (forumLevel === "All" || forum.level === forumLevel) && (!query || forum.className.toLowerCase().includes(query) || forum.subject.toLowerCase().includes(query) || forum.teacher.toLowerCase().includes(query) || forum.overview.toLowerCase().includes(query)));
  }, [deferredForumSearch, forumLevel, forums]);
  const activeThreads = useMemo(() => {
    if (!selectedForumId) return [];
    const query = deferredThreadSearch.trim().toLowerCase();
    return [...(threadsByForum[selectedForumId] ?? [])].filter((thread) => (threadFilter === "All" || thread.tags.includes(threadFilter)) && (!query || thread.title.toLowerCase().includes(query) || thread.body.toLowerCase().includes(query) || thread.authorName.toLowerCase().includes(query))).sort((left, right) => (left.isPinned === right.isPinned ? threadActivity(right) - threadActivity(left) : left.isPinned ? -1 : 1));
  }, [deferredThreadSearch, selectedForumId, threadFilter, threadsByForum]);
  const totalThreads = Object.values(forumStats).reduce((sum, stat) => sum + stat.topicCount, 0);
  const totalReplies = Object.values(forumStats).reduce((sum, stat) => sum + stat.replyCount, 0);
  const totalSolved = Object.values(forumStats).reduce((sum, stat) => sum + stat.solvedCount, 0);
  const selectedForumSummary = selectedForumId ? forumStats[selectedForumId] : null;

  const goHome = () => { setCurrentView("home"); setSelectedForumId(null); setSelectedThreadId(null); setThreadSearch(""); setThreadFilter("All"); };
  const openForum = (forumId: string) => { setSelectedForumId(forumId); setSelectedThreadId(null); setCurrentView("forum"); setThreadSearch(""); setThreadFilter("All"); };
  const openThread = (threadId: string) => {
    if (!selectedForumId) return;
    setThreadsByForum((current) => ({ ...current, [selectedForumId]: (current[selectedForumId] ?? []).map((thread) => thread.id === threadId ? { ...thread, views: thread.views + 1 } : thread) }));
    setSelectedThreadId(threadId);
    setCurrentView("thread");
  };
  const deleteForum = (forumId: string) => {
    if (!canDeleteForum) return;
    setForums((current) => current.filter((forum) => forum.id !== forumId));
    setThreadsByForum((current) => { const next = { ...current }; delete next[forumId]; return next; });
    if (selectedForumId === forumId) goHome();
  };
  const togglePin = (threadId: string) => {
    if (!canModerate || !selectedForumId) return;
    setThreadsByForum((current) => ({ ...current, [selectedForumId]: (current[selectedForumId] ?? []).map((thread) => thread.id === threadId ? { ...thread, isPinned: !thread.isPinned } : thread) }));
  };
  const deleteThread = (threadId: string) => {
    if (!selectedForumId) return;
    const target = (threadsByForum[selectedForumId] ?? []).find((thread) => thread.id === threadId);
    if (!target || (!canModerate && target.authorUsername !== viewer.username)) return;
    setThreadsByForum((current) => ({ ...current, [selectedForumId]: (current[selectedForumId] ?? []).filter((thread) => thread.id !== threadId) }));
    if (selectedThreadId === threadId) { setSelectedThreadId(null); setCurrentView("forum"); }
  };
  const createThread = () => {
    if (!selectedForumId || !newThreadTitle.trim() || !newThreadBody.trim()) return;
    const nextThread: Thread = { id: nextId("thread"), forumId: selectedForumId, title: newThreadTitle.trim(), body: newThreadBody.trim(), authorName: viewer.displayName, authorRole: viewer.role, authorUsername: viewer.username, createdAt: nextStamp(), views: 1, isPinned: false, tags: [allowedTags.includes(newThreadTag) ? newThreadTag : allowedTags[0]], replies: [] };
    setThreadsByForum((current) => ({ ...current, [selectedForumId]: [nextThread, ...(current[selectedForumId] ?? [])] }));
    setNewThreadTitle(""); setNewThreadBody(""); setNewThreadTag("Question"); setSelectedThreadId(nextThread.id); setCurrentView("thread");
  };
  const postReply = () => {
    if (!selectedForumId || !selectedThreadId || !newReplyText.trim()) return;
    const nextReply: Reply = { id: nextId("reply"), authorName: viewer.displayName, authorRole: viewer.role, authorUsername: viewer.username, body: newReplyText.trim(), createdAt: nextStamp(), likes: 0, isAcceptedAnswer: false };
    setThreadsByForum((current) => ({ ...current, [selectedForumId]: (current[selectedForumId] ?? []).map((thread) => thread.id === selectedThreadId ? { ...thread, replies: [...thread.replies, nextReply] } : thread) }));
    setNewReplyText("");
  };
  const toggleLike = (replyId: string) => {
    if (!selectedForumId || !selectedThreadId) return;
    const liked = likedReplyIds.includes(replyId);
    setThreadsByForum((current) => ({ ...current, [selectedForumId]: (current[selectedForumId] ?? []).map((thread) => thread.id !== selectedThreadId ? thread : { ...thread, replies: thread.replies.map((reply) => reply.id === replyId ? { ...reply, likes: Math.max(0, reply.likes + (liked ? -1 : 1)) } : reply) }) }));
    setLikedReplyIds((current) => liked ? current.filter((id) => id !== replyId) : [...current, replyId]);
  };
  const markAccepted = (replyId: string) => {
    if (!selectedForumId || !selectedThread) return;
    if (!(canModerate || selectedThread.authorUsername === viewer.username) || !selectedThread.tags.includes("Question")) return;
    const active = selectedThread.replies.find((reply) => reply.id === replyId)?.isAcceptedAnswer;
    setThreadsByForum((current) => ({ ...current, [selectedForumId]: (current[selectedForumId] ?? []).map((thread) => thread.id !== selectedThread.id ? thread : { ...thread, replies: thread.replies.map((reply) => ({ ...reply, isAcceptedAnswer: !active && reply.id === replyId })) }) }));
  };

  const renderHome = () => (
    <section className="space-y-5">
      <div className="grid gap-3 rounded-[28px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_18px_70px_-50px_rgba(15,23,42,0.25)] dark:border-white/10 dark:bg-slate-950/65 dark:shadow-[0_18px_70px_-50px_rgba(15,23,42,0.88)] lg:grid-cols-[1fr,220px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={forumSearch}
            onChange={(event) => setForumSearch(event.target.value)}
            placeholder="Search class, subject, teacher, or board purpose..."
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400/45 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-slate-500"
          />
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-white/[0.06]">
          <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <select
            value={forumLevel}
            onChange={(event) => setForumLevel(event.target.value as ForumLevel)}
            className="h-12 w-full bg-transparent text-sm text-slate-900 outline-none dark:text-white"
          >
            <option value="All">All levels</option>
            <option value="JHS">JHS</option>
            <option value="Primary">Primary</option>
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Available Boards
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
            Pick a class conversation space
          </h2>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
          {filteredForums.length} board{filteredForums.length === 1 ? "" : "s"}
        </div>
      </div>

      {filteredForums.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300/70 bg-white/75 px-6 py-16 text-center dark:border-white/[0.12] dark:bg-slate-950/55">
          <MessageSquare className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
          <h3 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">
            No boards match this search
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Try another class, subject, or teacher name.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredForums.map((forum) => {
            const stats = forumStats[forum.id];

            return (
              <article
                key={forum.id}
                className="group relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/85 shadow-[0_24px_90px_-42px_rgba(15,23,42,0.22)] transition-transform duration-300 hover:-translate-y-1 dark:border-white/10 dark:bg-slate-950/75 dark:shadow-[0_24px_90px_-42px_rgba(15,23,42,0.88)]"
              >
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90 dark:opacity-80", forum.glow)} />
                <div className={cn("absolute inset-x-0 top-0 h-1.5", forum.accent)} />

                <div className="relative p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", forum.badge)}>
                        {forum.className}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
                        {forum.level}
                      </span>
                    </div>

                    {canDeleteForum && (
                      <button
                        type="button"
                        onClick={() => deleteForum(forum.id)}
                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:border-rose-400/35 hover:bg-rose-400/10 hover:text-rose-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:text-rose-100"
                        aria-label={`Delete ${forum.subject} forum`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-5 space-y-3">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                        {forum.subject}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {forum.overview}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Users className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      Teacher: {forum.teacher}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-white/[0.06]">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">Threads</p>
                      <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{stats.topicCount}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-white/[0.06]">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">Replies</p>
                      <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{stats.replyCount}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-white/[0.06]">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">Solved</p>
                      <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{stats.solvedCount}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">
                        Last active
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                        {stats.lastActivity ? timeAgo(stats.lastActivity) : "No activity yet"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openForum(forum.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-all hover:border-emerald-400/45 hover:bg-emerald-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-emerald-400/[0.12]"
                    >
                      Open board
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 text-xs leading-5 text-slate-500 dark:border-white/10 dark:bg-slate-900/75 dark:text-slate-400">
                    {forum.note}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );

  const renderForum = () => !selectedForum ? null : (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-[30px] border border-slate-200/70 bg-white/[0.82] shadow-[0_28px_100px_-48px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-950/[0.72] dark:shadow-[0_28px_100px_-48px_rgba(15,23,42,0.9)]">
        <div className={cn("border-b border-slate-200/70 bg-gradient-to-r p-6 dark:border-white/10", selectedForum.glow)}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]", selectedForum.badge)}>
                  {selectedForum.className}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
                  {selectedForum.level}
                </span>
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                  {selectedForum.subject}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {selectedForum.overview}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  {selectedForum.teacher}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  {selectedForumSummary?.lastActivity ? timeAgo(selectedForumSummary.lastActivity) : "No activity yet"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView("compose")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-400/25 dark:bg-emerald-400/[0.12] dark:text-emerald-50 dark:hover:bg-emerald-400/[0.18]"
            >
              <Plus className="h-4 w-4" />
              {viewer.role === "student" ? "Ask a question" : "Start a thread"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200/70 p-4 dark:border-white/10 md:grid-cols-[1fr,220px] xl:grid-cols-[1fr,220px,1fr]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={threadSearch}
              onChange={(event) => setThreadSearch(event.target.value)}
              placeholder="Search thread title, text, or author..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400/45 focus:outline-none focus:ring-2 focus:ring-sky-400/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-slate-500"
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-white/[0.06]">
            <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <select
              value={threadFilter}
              onChange={(event) => setThreadFilter(event.target.value as ThreadFilter)}
              className="h-12 w-full bg-transparent text-sm text-slate-900 outline-none dark:text-white"
            >
              <option value="All">All thread types</option>
              {THREAD_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-white/[0.06]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">Threads</p>
              <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{selectedForumSummary?.topicCount ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-white/[0.06]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">Replies</p>
              <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{selectedForumSummary?.replyCount ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-white/[0.06]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">Solved</p>
              <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{selectedForumSummary?.solvedCount ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {activeThreads.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-slate-300/70 bg-white/70 px-6 py-14 text-center dark:border-white/[0.12] dark:bg-white/[0.04]">
              <MessageSquare className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500" />
              <h3 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">
                No threads match this board filter
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Reset the filter or start a fresh discussion.
              </p>
            </div>
          ) : activeThreads.map((thread) => {
            const solved = thread.replies.some((reply) => reply.isAcceptedAnswer);

            return (
              <article
                key={thread.id}
                className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/[0.88] transition-colors hover:border-slate-300 dark:border-white/10 dark:bg-slate-900/75 dark:hover:border-white/[0.16]"
              >
                <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                  <button type="button" onClick={() => openThread(thread.id)} className="flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      {thread.isPinned && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/[0.12] dark:text-amber-100">
                          <Pin className="h-3 w-3" />
                          Pinned
                        </span>
                      )}
                      {thread.tags.map((tag) => (
                        <span key={tag} className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", TAG_COPY[tag])}>
                          {tag}
                        </span>
                      ))}
                      {solved && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/70 bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/[0.12] dark:text-emerald-100">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          Solved
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                      {thread.title}
                    </h3>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {trimText(thread.body, 220)}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4" />{thread.authorName}</span>
                      <span className="inline-flex items-center gap-2"><MessageSquare className="h-4 w-4" />{thread.replies.length} replies</span>
                      <span className="inline-flex items-center gap-2"><Search className="h-4 w-4" />{thread.views} views</span>
                      <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{timeAgo(threadActivity(thread))}</span>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                    <button
                      type="button"
                      onClick={() => openThread(thread.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:border-sky-400/45 hover:bg-sky-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-sky-400/[0.12]"
                    >
                      Open
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-2">
                      {canModerate && (
                        <button
                          type="button"
                          onClick={() => togglePin(thread.id)}
                          className={cn(
                            "rounded-2xl border px-3 py-2 text-sm font-medium transition-colors",
                            thread.isPinned
                              ? "border-amber-300/70 bg-amber-100 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/[0.12] dark:text-amber-100"
                              : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:text-amber-800 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:border-amber-400/30 dark:hover:text-amber-100",
                          )}
                        >
                          {thread.isPinned ? "Unpin" : "Pin"}
                        </button>
                      )}
                      {(canModerate || thread.authorUsername === viewer.username) && (
                        <button
                          type="button"
                          onClick={() => deleteThread(thread.id)}
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-rose-400/45 hover:bg-rose-50 hover:text-rose-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-rose-400/10 dark:hover:text-rose-100"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
  const renderThread = () => !selectedThread || !selectedForum ? null : (
    <section className="space-y-5">
      <article className="overflow-hidden rounded-[30px] border border-slate-200/70 bg-white/[0.82] shadow-[0_28px_100px_-48px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-950/[0.72] dark:shadow-[0_28px_100px_-48px_rgba(15,23,42,0.9)]">
        <div className="border-b border-slate-200/70 px-6 py-5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {selectedThread.tags.map((tag) => (
                <span key={tag} className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", TAG_COPY[tag])}>
                  {tag}
                </span>
              ))}
              {selectedThread.isPinned && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/[0.12] dark:text-amber-100">
                  <Pin className="h-3 w-3" />
                  Pinned
                </span>
              )}
              {selectedThread.replies.some((reply) => reply.isAcceptedAnswer) && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/70 bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/[0.12] dark:text-emerald-100">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Solved
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canModerate && (
                <button
                  type="button"
                  onClick={() => togglePin(selectedThread.id)}
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-sm font-medium transition-colors",
                    selectedThread.isPinned
                      ? "border-amber-300/70 bg-amber-100 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/[0.12] dark:text-amber-100"
                      : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:text-amber-800 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:border-amber-400/30 dark:hover:text-amber-100",
                  )}
                >
                  {selectedThread.isPinned ? "Unpin thread" : "Pin thread"}
                </button>
              )}
              {(canModerate || selectedThread.authorUsername === viewer.username) && (
                <button
                  type="button"
                  onClick={() => deleteThread(selectedThread.id)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-rose-400/45 hover:bg-rose-50 hover:text-rose-700 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-rose-400/10 dark:hover:text-rose-100"
                >
                  Delete thread
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {selectedForum.className} / {selectedForum.subject}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              {selectedThread.title}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-slate-900/[0.92]">
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-black text-white", selectedThread.authorRole === "student" ? "border-sky-400/35 bg-sky-400/70 dark:bg-sky-400/[0.18]" : "border-emerald-400/35 bg-emerald-500/75 dark:bg-emerald-400/[0.18]")}>
              {initials(selectedThread.authorName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-950 dark:text-white">{selectedThread.authorName}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {ROLE_COPY[selectedThread.authorRole].label}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{timeAgo(selectedThread.createdAt)}</span>
              <span className="inline-flex items-center gap-2"><MessageSquare className="h-4 w-4" />{selectedThread.replies.length} replies</span>
              <span className="inline-flex items-center gap-2"><Search className="h-4 w-4" />{selectedThread.views} views</span>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 text-[15px] leading-8 text-slate-700 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200">
            {selectedThread.body}
          </div>
        </div>
      </article>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Replies</p>
            <h3 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
              {selectedThread.replies.length} response{selectedThread.replies.length === 1 ? "" : "s"}
            </h3>
          </div>
          {((canModerate || selectedThread.authorUsername === viewer.username) && selectedThread.tags.includes("Question")) && (
            <div className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
              You can mark the best answer here.
            </div>
          )}
        </div>

        {selectedThread.replies.length === 0 ? (
          <div className="rounded-[26px] border border-dashed border-slate-300/70 bg-white/75 px-6 py-14 text-center dark:border-white/[0.12] dark:bg-slate-950/55">
            <MessageSquare className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500" />
            <h4 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">No replies yet</h4>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Start the conversation and help this class move forward.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedThread.replies.map((reply) => {
              const canMark = (canModerate || selectedThread.authorUsername === viewer.username) && selectedThread.tags.includes("Question");
              const liked = likedReplyIds.includes(reply.id);
              return (
                <article key={reply.id} className={cn("rounded-[26px] border p-5 shadow-[0_20px_90px_-50px_rgba(15,23,42,0.18)] dark:shadow-[0_20px_90px_-50px_rgba(15,23,42,0.92)]", reply.isAcceptedAnswer ? "border-emerald-300/80 bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-950/40" : "border-slate-200/80 bg-white/[0.88] dark:border-white/10 dark:bg-slate-900/[0.88]")}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-black text-white", reply.authorRole === "student" ? "border-sky-400/35 bg-sky-400/70 dark:bg-sky-400/[0.18]" : "border-emerald-400/35 bg-emerald-500/75 dark:bg-emerald-400/[0.18]")}>{initials(reply.authorName)}</div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-950 dark:text-white">{reply.authorName}</p>
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:border-white/10 dark:bg-slate-900/[0.88] dark:text-slate-300">
                            {ROLE_COPY[reply.authorRole].label}
                          </span>
                          {reply.isAcceptedAnswer && (
                            <span className="rounded-full border border-emerald-300/70 bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/[0.12] dark:text-emerald-100">
                              Accepted answer
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{timeAgo(reply.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => toggleLike(reply.id)} className={cn("inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition-colors", liked ? "border-sky-300/70 bg-sky-100 text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/[0.12] dark:text-sky-100" : "border-slate-200 bg-white text-slate-700 hover:border-sky-400/45 hover:bg-sky-50 hover:text-sky-800 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-sky-400/[0.12] dark:hover:text-sky-100")}><ThumbsUp className="h-4 w-4" />{reply.likes}</button>
                      {canMark && <button type="button" onClick={() => markAccepted(reply.id)} className={cn("rounded-2xl border px-3 py-2 text-sm font-medium transition-colors", reply.isAcceptedAnswer ? "border-emerald-300/70 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/[0.12] dark:text-emerald-100" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400/45 hover:bg-emerald-50 hover:text-emerald-800 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-emerald-400/[0.12] dark:hover:text-emerald-100")}>{reply.isAcceptedAnswer ? "Accepted" : "Mark as best"}</button>}
                    </div>
                  </div>
                  <div className="mt-4 rounded-[22px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm leading-7 text-slate-700 dark:border-white/10 dark:bg-slate-900/95 dark:text-slate-200">{reply.body}</div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-[30px] border border-slate-200/70 bg-white/[0.82] p-5 shadow-[0_28px_100px_-48px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-950/[0.72] dark:shadow-[0_28px_100px_-48px_rgba(15,23,42,0.9)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Reply</p>
            <h3 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Add your response</h3>
          </div>
          <div className={cn("rounded-2xl border px-4 py-2 text-sm", roleCopy.badge)}>
            Signed in as {roleCopy.label}
          </div>
        </div>
        <div className="mt-5 flex gap-4">
          <div className={cn("hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-sm font-black text-white sm:flex", viewer.role === "student" ? "border-sky-400/35 bg-sky-400/70 dark:bg-sky-400/[0.18]" : "border-emerald-400/35 bg-emerald-500/75 dark:bg-emerald-400/[0.18]")}>{initials(viewer.displayName)}</div>
          <div className="flex-1">
            <textarea rows={4} value={newReplyText} onChange={(event) => setNewReplyText(event.target.value)} placeholder="Write a clear reply, resource tip, or follow-up question..." className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-900 placeholder:text-slate-400 focus:border-emerald-400/45 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 dark:border-white/10 dark:bg-slate-900/95 dark:text-white dark:placeholder:text-slate-400" />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Keep replies specific so other students can learn from them quickly.</p>
              <button type="button" onClick={postReply} disabled={!newReplyText.trim()} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-emerald-400/25 dark:bg-emerald-400/[0.12] dark:text-emerald-50 dark:hover:bg-emerald-400/[0.18] dark:disabled:border-white/10 dark:disabled:bg-slate-900/90 dark:disabled:text-slate-400"><Send className="h-4 w-4" />Send reply</button>
            </div>
          </div>
        </div>
      </section>
    </section>
  );

  const renderCompose = () => (
    <section className="grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
      <article className="overflow-hidden rounded-[30px] border border-slate-200/70 bg-white/[0.82] shadow-[0_28px_100px_-48px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-950/[0.72] dark:shadow-[0_28px_100px_-48px_rgba(15,23,42,0.9)]">
        <div className="border-b border-slate-200/70 px-6 py-5 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">New thread</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Start a focused class discussion</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Pick the right board, give the thread a useful title, and make the first message easy to answer.</p>
        </div>
        <div className="space-y-5 px-6 py-6">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Forum</span>
            <select value={selectedForumId ?? ""} onChange={(event) => setSelectedForumId(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-emerald-400/45 focus:ring-2 focus:ring-emerald-400/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
              <option value="" disabled>Select a class board</option>
              {forums.map((forum) => <option key={forum.id} value={forum.id}>{forum.className} / {forum.subject}</option>)}
            </select>
          </label>
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Thread type</span>
            <div className="flex flex-wrap gap-2">
              {THREAD_TAGS.map((tag) => {
                const disabled = !allowedTags.includes(tag);
                const selected = newThreadTag === tag;
                return <button key={tag} type="button" onClick={() => !disabled && setNewThreadTag(tag)} disabled={disabled} className={cn("rounded-2xl border px-4 py-2 text-sm font-medium transition-colors", disabled ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-600" : selected ? TAG_COPY[tag] : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white")}>{tag}</button>;
              })}
            </div>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Title</span>
            <input value={newThreadTitle} onChange={(event) => setNewThreadTitle(event.target.value)} placeholder="Example: I need help with algebraic substitution" className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400/45 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-slate-500" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">First message</span>
            <textarea rows={9} value={newThreadBody} onChange={(event) => setNewThreadBody(event.target.value)} placeholder="Add the key details, what you already understand, and exactly where you need help." className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-900 placeholder:text-slate-400 focus:border-emerald-400/45 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-slate-500" />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 px-6 py-5 dark:border-white/10">
          <button type="button" onClick={() => setCurrentView("forum")} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white">Back to board</button>
          <button type="button" onClick={createThread} disabled={!selectedForumId || !newThreadTitle.trim() || !newThreadBody.trim()} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-emerald-400/25 dark:bg-emerald-400/[0.12] dark:text-emerald-50 dark:hover:bg-emerald-400/[0.18] dark:disabled:border-white/10 dark:disabled:bg-white/[0.06] dark:disabled:text-slate-500"><Send className="h-4 w-4" />Post discussion</button>
        </div>
      </article>
      <aside className="space-y-5">
        <div className={cn("rounded-[30px] border bg-white/[0.82] p-5 shadow-[0_28px_100px_-48px_rgba(15,23,42,0.22)] dark:bg-slate-950/[0.72] dark:shadow-[0_28px_100px_-48px_rgba(15,23,42,0.9)]", roleCopy.badge)}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-current/80">Permission check</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{roleCopy.label} access</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-100/90">{roleCopy.detail}</p>
        </div>
        <div className="rounded-[30px] border border-slate-200/70 bg-white/[0.82] p-5 shadow-[0_28px_100px_-48px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-950/[0.72] dark:shadow-[0_28px_100px_-48px_rgba(15,23,42,0.9)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Strong thread formula</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            <p>Use a title that says exactly what the thread is about.</p>
            <p>Explain the problem clearly so replies do not waste time.</p>
            <p>Student accounts can post questions, resources, and polls, but not staff announcements.</p>
          </div>
        </div>
      </aside>
    </section>
  );

  return (
    <div className="space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/[0.82] shadow-[0_30px_120px_-55px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_30px_120px_-55px_rgba(15,23,42,0.95)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_30%),linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(241,245,249,0.98))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(135deg,_rgba(15,23,42,0.92),_rgba(2,6,23,0.98))]" />
        <div className="relative grid gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.35fr,0.9fr]">
          <div className="space-y-4">
            <p className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700 dark:border-white/[0.12] dark:bg-slate-900/90 dark:text-slate-100">Class Community</p>
            <div>
              <h1 className="max-w-2xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">Discussion forums rebuilt for stronger student attention and cleaner role flow.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Browse by class, enter the right board quickly, and respond with the permissions tied to the signed-in account.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-900/[0.88]"><p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Boards</p><p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{forums.length}</p></div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-900/[0.88]"><p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Threads</p><p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{totalThreads}</p></div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-900/[0.88]"><p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Solved</p><p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{totalSolved}</p></div>
            </div>
          </div>
          <div className="rounded-[28px] border border-slate-200/70 bg-white/85 p-5 dark:border-white/10 dark:bg-slate-900/95">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Access mode</p><p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{roleCopy.label}</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{roleCopy.summary}</p></div>
              <div className={cn("inline-flex h-11 w-11 items-center justify-center rounded-2xl border", roleCopy.badge)}>{viewer.role === "student" ? <Lock className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}</div>
            </div>
            <div className={cn("mt-4 rounded-2xl border px-4 py-3 text-sm", roleCopy.badge)}>
              <p className="font-semibold">{viewer.displayName}</p>
              <p className="mt-1 text-xs leading-5 text-slate-700 dark:text-slate-100/90">{roleCopy.detail}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-slate-950/90"><p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Replies</p><p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{totalReplies}</p></div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-slate-950/90"><p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Security</p><p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{viewer.role === "student" ? "Role locked" : "Role verified"}</p></div>
            </div>
          </div>
        </div>
      </section>

      <nav className="flex flex-wrap items-center gap-2 rounded-[24px] border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-[0_18px_60px_-48px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300 dark:shadow-none">
        <button type="button" onClick={goHome} className="rounded-full px-3 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/[0.06] dark:hover:text-white">Forums</button>
        {selectedForum && <><ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500" /><button type="button" onClick={() => openForum(selectedForum.id)} className="rounded-full px-3 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/[0.06] dark:hover:text-white">{selectedForum.className} / {selectedForum.subject}</button></>}
        {selectedThread && <><ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500" /><span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-900 dark:bg-white/[0.06] dark:text-white">{trimText(selectedThread.title, 56)}</span></>}
        {currentView === "compose" && <><ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500" /><span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-900 dark:bg-white/[0.06] dark:text-white">New discussion</span></>}
      </nav>

      <div className="flex items-center justify-between gap-3 rounded-[24px] border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-[0_18px_60px_-48px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300 dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl border text-white", viewer.role === "student" ? "border-sky-400/35 bg-sky-400/70 dark:bg-sky-400/[0.18]" : "border-emerald-400/35 bg-emerald-500/75 dark:bg-emerald-400/[0.18]")}>{viewer.role === "student" ? <Lock className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}</div>
          <div><p className="font-semibold text-slate-950 dark:text-white">Signed in as {viewer.displayName}</p><p className="text-xs text-slate-500 dark:text-slate-400">{viewer.role === "student" ? "Student role is locked here. Teacher/Admin switching is not available." : "Extra controls only appear because this account already has the required role."}</p></div>
        </div>
      </div>

      {currentView === "home" && renderHome()}
      {currentView === "forum" && renderForum()}
      {currentView === "thread" && renderThread()}
      {currentView === "compose" && renderCompose()}
    </div>
  );
}
