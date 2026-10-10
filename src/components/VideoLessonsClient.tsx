"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ExternalLink, Filter, PlayCircle, Search, Video } from "lucide-react";

import { DeleteVideoLessonButton } from "@/components/DeleteVideoLessonButton";
import { EditVideoLessonModal } from "@/components/forms/EditVideoLessonModal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

type VideoLessonView = {
  id: number;
  title: string;
  description: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  thumbnailUrl: string;
  subjectId: number;
  gradeId: number;
  uploadedByName: string;
  subjectName: string;
  gradeLabel: string;
  updatedAt: string;
  canManage: boolean;
};

interface VideoLessonsClientProps {
  lessons: VideoLessonView[];
  featureReady: boolean;
  subjects: { id: number; name: string }[];
  grades: { id: number; label: string }[];
}

export function VideoLessonsClient({
  lessons,
  featureReady,
  subjects,
  grades,
}: VideoLessonsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);

  const subjectFilters = ["all", ...Array.from(new Set(lessons.map((lesson) => lesson.subjectName)))];
  const gradeFilters = ["all", ...Array.from(new Set(lessons.map((lesson) => lesson.gradeLabel)))];

  const filteredLessons = lessons.filter((lesson) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      lesson.title.toLowerCase().includes(query) ||
      lesson.description.toLowerCase().includes(query) ||
      lesson.subjectName.toLowerCase().includes(query) ||
      lesson.gradeLabel.toLowerCase().includes(query);

    const matchesSubject = subjectFilter === "all" || lesson.subjectName === subjectFilter;
    const matchesGrade = gradeFilter === "all" || lesson.gradeLabel === gradeFilter;

    return matchesSearch && matchesSubject && matchesGrade;
  });

  const selectedLesson =
    activeLessonId === null
      ? null
      : lessons.find((lesson) => lesson.id === activeLessonId) || null;

  const handleOpenPlayer = (lessonId: number) => {
    setActiveLessonId(lessonId);
    setIsPlayerOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Total Videos
              </p>
              <p className="mt-2 text-2xl font-black text-foreground">{lessons.length}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Subjects</p>
              <p className="mt-2 text-2xl font-black text-foreground">{subjectFilters.length - 1}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Grades</p>
              <p className="mt-2 text-2xl font-black text-foreground">{gradeFilters.length - 1}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title, description, or subject"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
            >
              <option value="all">All Subjects</option>
              {subjectFilters
                .filter((subject) => subject !== "all")
                .map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
            </Select>
            <Select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}>
              <option value="all">All Grades</option>
              {gradeFilters
                .filter((grade) => grade !== "all")
                .map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
            </Select>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>
              Showing {filteredLessons.length} of {lessons.length} video lesson
              {lessons.length === 1 ? "" : "s"}
            </span>
          </div>
        </CardContent>
      </Card>

      {filteredLessons.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredLessons.map((lesson) => (
            <Card
              key={lesson.id}
              className="relative h-full border-border/40 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              {lesson.canManage && (
                <div
                  className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-border/50 bg-background/90 p-1 shadow-sm backdrop-blur"
                  onClick={(event) => event.stopPropagation()}
                >
                  {subjects.length > 0 && grades.length > 0 && (
                    <EditVideoLessonModal
                      lesson={{
                        id: lesson.id,
                        title: lesson.title,
                        description: lesson.description,
                        youtubeUrl: lesson.youtubeUrl,
                        subjectId: lesson.subjectId,
                        gradeId: lesson.gradeId,
                      }}
                      subjects={subjects}
                      grades={grades}
                    />
                  )}
                  <DeleteVideoLessonButton
                    lessonId={lesson.id}
                    lessonTitle={lesson.title}
                  />
                </div>
              )}
              <button
                type="button"
                className="group block h-full w-full text-left"
                onClick={() => handleOpenPlayer(lesson.id)}
              >
                <div className="relative overflow-hidden rounded-t-xl border-b border-border/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={lesson.thumbnailUrl}
                    alt={`${lesson.title} thumbnail`}
                    className="h-44 w-full object-cover"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src = "/img/ECKINTOSH LOGO.png";
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35 transition-colors group-hover:bg-black/45">
                    <PlayCircle className="h-11 w-11 text-white" />
                  </div>
                </div>
                <CardHeader className="space-y-2 pb-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{lesson.subjectName}</Badge>
                    <Badge variant="outline">{lesson.gradeLabel}</Badge>
                  </div>
                  <CardTitle className="line-clamp-2 text-base font-bold">{lesson.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <p className="line-clamp-3 text-sm text-muted-foreground">{lesson.description}</p>
                  <div className="text-xs text-muted-foreground">
                    <p>By {lesson.uploadedByName}</p>
                    <p>Updated {format(new Date(lesson.updatedAt), "yyyy-MM-dd")}</p>
                  </div>
                </CardContent>
              </button>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-4 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted/40">
              <Video className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                {featureReady
                  ? "No video lessons match the current filters."
                  : "Video lessons setup is not ready yet."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {featureReady
                  ? "Try another search/filter or ask a teacher to publish a lesson."
                  : "Run the Prisma migration, regenerate Prisma, and restart the app."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
        <DialogContent className="w-[96vw] max-w-[980px] p-4 sm:p-6">
          {selectedLesson && (
            <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-xl">{selectedLesson.title}</DialogTitle>
                  <DialogDescription>
                    {selectedLesson.subjectName} | {selectedLesson.gradeLabel} | By{" "}
                    {selectedLesson.uploadedByName}
                  </DialogDescription>
                </DialogHeader>

              <div className="overflow-hidden rounded-xl border border-border/60 bg-black">
                <div className="relative w-full pt-[56.25%]">
                  <iframe
                    src={getYouTubeEmbedUrl(selectedLesson.youtubeVideoId)}
                    title={selectedLesson.title}
                    className="absolute left-0 top-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">{selectedLesson.description}</p>
                <a
                  href={selectedLesson.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary hover:text-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Watch on YouTube
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
