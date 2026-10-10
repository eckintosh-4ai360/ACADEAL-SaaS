-- CreateTable
CREATE TABLE "ClassSubjectTeacher" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSubjectTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassSubjectTeacher_classId_subjectId_key" ON "ClassSubjectTeacher"("classId", "subjectId");

-- CreateIndex
CREATE INDEX "ClassSubjectTeacher_teacherId_idx" ON "ClassSubjectTeacher"("teacherId");

-- CreateIndex
CREATE INDEX "ClassSubjectTeacher_subjectId_idx" ON "ClassSubjectTeacher"("subjectId");

-- AddForeignKey
ALTER TABLE "ClassSubjectTeacher" ADD CONSTRAINT "ClassSubjectTeacher_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubjectTeacher" ADD CONSTRAINT "ClassSubjectTeacher_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubjectTeacher" ADD CONSTRAINT "ClassSubjectTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
