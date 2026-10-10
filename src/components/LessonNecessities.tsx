"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book, Download, FileJson, FileText, Landmark, Library, Video } from "lucide-react";
import Link from "next/link";
import {
  canAccessLibraryCatalog,
  canAccessLessonMaterialKind,
  canAccessLessonResources,
  canAccessVideoLessons,
} from "@/lib/utils";

const necessities = [
  {
    title: "Course Syllabi",
    description: "Detailed overview of all curriculum requirements for this semester.",
    icon: <Book className="w-5 h-5 text-blue-500" />,
    link: "/dashboard/lessons/syllabi",
    fileSize: "2.4 MB",
  },
  {
    title: "Academic Reference",
    description: "Standardized reference materials and formatting guidelines.",
    icon: <Library className="w-5 h-5 text-purple-500" />,
    link: "/dashboard/lessons/reference",
    fileSize: "1.2 MB",
  },
  {
    title: "Exam Regulations",
    description: "Official rules and protocols for the upcoming examination period.",
    icon: <Landmark className="w-5 h-5 text-orange-500" />,
    link: "/dashboard/lessons/regulations",
    fileSize: "850 KB",
  },
  {
    title: "Video Lessons",
    description: "Teacher-curated YouTube lessons with in-app playback for students.",
    icon: <Video className="w-5 h-5 text-rose-500" />,
    link: "/dashboard/lessons/video-lessons",
    fileSize: "Streaming",
  },
  {
    title: "Library Catalog",
    description: "Digital access to the school's online book and journal database.",
    icon: <FileJson className="w-5 h-5 text-green-500" />,
    link: "/dashboard/lessons/library",
    fileSize: "Link",
  },
];

type LessonNecessitiesProps = {
  role?: string | null;
};

export function LessonNecessities({ role }: LessonNecessitiesProps) {
  const filteredNecessities = necessities.filter((item) => {
    if (!role) return true;

    if (item.link === "/dashboard/lessons/library") {
      return canAccessLibraryCatalog(role);
    }

    if (item.link === "/dashboard/lessons/regulations") {
      return canAccessLessonMaterialKind(role, "regulations");
    }

    if (item.link === "/dashboard/lessons/video-lessons") {
      return canAccessVideoLessons(role);
    }

    return canAccessLessonResources(role);
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="text-primary w-6 h-6" />
          Academic Necessities
        </h2>
        <p className="text-muted-foreground">Essential resources and reference materials gathered in one place</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredNecessities.map((item, index) => (
          <Link key={index} href={item.link}>
            <Card className="flex flex-row items-center p-4 gap-4 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="p-3 bg-background border rounded-xl shadow-sm">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm truncate">{item.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Download className="w-4 h-4" />
              </Button>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
