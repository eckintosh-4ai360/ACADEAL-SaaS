import { z } from "zod";
import { extractYouTubeVideoId } from "./youtube";

export const subjectSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, { message: "Subject name is required!" }),
  teachers: z.array(z.string()),
});

export type SubjectSchema = z.infer<typeof subjectSchema>;

export const classSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, { message: "Class name is required!" }),
  capacity: z.number().min(1, { message: "Capacity is required!" }),
  gradeId: z.number().min(1, { message: "Grade is required!" }),
  supervisorId: z.string().optional(),
});

export type ClassSchema = z.infer<typeof classSchema>;

export const schoolClassStructureSchema = z.object({
  streamCount: z
    .number()
    .int({ message: "Stream count must be a whole number." })
    .min(1, { message: "At least one stream is required." })
    .max(26, { message: "Stream count cannot exceed 26." }),
});

export type SchoolClassStructureSchema = z.infer<
  typeof schoolClassStructureSchema
>;

export const teacherSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  address: z.string(),
  img: z.string().optional(),
  birthday: z.date({ message: "Birthday is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  subjects: z.array(z.string()).optional(),
});

export type TeacherSchema = z.infer<typeof teacherSchema>;

export const studentSchema = z.object({
  id: z.string().optional(),
  //* Legacy fields (kept for backward compat, not shown on admission form)
  username: z.string().optional().or(z.literal("")),
  password: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  bloodType: z.string().optional().or(z.literal("")),
  phone: z.string().optional(),
  //* Parent assignment
  parentType: z.enum(["existing", "new"]),
  parentId: z.string().optional(),
  parentName: z.string().optional(),
  parentSurname: z.string().optional(),
  parentPhone: z.string().optional(),
  parentEmail: z.string().optional(),
  parentAddress: z.string().optional().or(z.literal("")),
  //* Core identity
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  otherNames: z.string().optional().or(z.literal("")),
  sex: z.enum(["MALE", "FEMALE"], { message: "Gender is required!" }),
  birthday: z.date({ message: "Date of Birth is required!" }),
  img: z.string().optional(),
  //* Academic
  gradeId: z.number().min(1, { message: "Grade is required!" }),
  classId: z.number().min(1, { message: "Class is required!" }),
  //* Residency
  residencyStatus: z.enum(["DAY", "BOARDING"], { message: "Residency status is required!" }),
  house: z.string().optional().or(z.literal("")),
  //* Guardian / Contact (Legacy/Display fields)
  guardianName: z.string().optional().or(z.literal("")),
  contactNumber: z.string().optional().or(z.literal("")),
  email: z.string().email({ message: "Invalid email address!" }).optional().or(z.literal("")),
  occupation: z.string().optional().or(z.literal("")),
  //* Additional info
  nhisNumber: z.string().optional().or(z.literal("")),
  admissionDate: z.date().optional().nullable(),
  emergencyContact: z.string().optional().or(z.literal("")),
});

export type StudentSchema = z.infer<typeof studentSchema>;

export const examSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  startTime: z.date({ message: "Start time is required!" }),
  endTime: z.date({ message: "End time is required!" }),
  lessonId: z.number({ message: "Lesson is required!" }),
});

export type ExamSchema = z.infer<typeof examSchema>;

export const parentSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().min(1, { message: "Phone is required!" }),
  address: z.string().optional().or(z.literal("")),
  img: z.string().optional(),
});

export type ParentSchema = z.infer<typeof parentSchema>;

export const lessonSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, { message: "Lesson name is required!" }),
  day: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"], {
    message: "Day is required!",
  }),
  startTime: z.date({ message: "Start time is required!" }),
  endTime: z.date({ message: "End time is required!" }),
  subjectId: z.number({ message: "Subject is required!" }),
  classId: z.number({ message: "Class is required!" }),
  teacherId: z.string().min(1, { message: "Teacher is required!" }),
});

export type LessonSchema = z.infer<typeof lessonSchema>;

export const assignmentSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  startDate: z.date({ message: "Start date is required!" }),
  dueDate: z.date({ message: "Due date is required!" }),
  lessonId: z.number({ message: "Lesson is required!" }),
});

export type AssignmentSchema = z.infer<typeof assignmentSchema>;

export const resultSchema = z.object({
  id: z.number().optional(),
  score: z.number().min(0).max(100, { message: "Score must be between 0 and 100!" }),
  examId: z.number().optional(),
  assignmentId: z.number().optional(),
  studentId: z.string().min(1, { message: "Student is required!" }),
});

export type ResultSchema = z.infer<typeof resultSchema>;

export const attendanceSchema = z.object({
  id: z.number().optional(),
  date: z.date({ message: "Date is required!" }),
  present: z.boolean(),
  studentId: z.string().min(1, { message: "Student is required!" }),
  lessonId: z.number({ message: "Lesson is required!" }),
});

export type AttendanceSchema = z.infer<typeof attendanceSchema>;

export const eventSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  startTime: z.date({ message: "Start time is required!" }),
  endTime: z.date({ message: "End time is required!" }),
  classId: z.number().optional(),
  sendSms: z.boolean().optional(),
});

export type EventSchema = z.infer<typeof eventSchema>;

export const announcementSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  date: z.date({ message: "Date is required!" }),
  classId: z.number().optional(),
  sendSms: z.boolean().optional(),
});

export type AnnouncementSchema = z.infer<typeof announcementSchema>;

export const feeSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  amount: z.number().min(0, { message: "Amount must be positive!" }),
  dueDate: z.date({ message: "Due date is required!" }),
  status: z.enum(["PENDING", "PAID", "OVERDUE"], { message: "Status is required!" }),
  description: z.string().optional(),
  studentId: z.string().min(1, { message: "Student is required!" }),
});

export type FeeSchema = z.infer<typeof feeSchema>;

export const excursionCampaignSchema = z.object({
  id: z.number().optional(),
  classId: z.number().min(1, { message: "Class is required!" }),
  title: z.string().min(1, { message: "Excursion title is required!" }),
  targetAmount: z.number().min(0.01, { message: "Target amount must be greater than zero!" }),
});

export type ExcursionCampaignSchema = z.infer<typeof excursionCampaignSchema>;

export const excursionPaymentSchema = z.object({
  id: z.number().optional(),
  campaignId: z.number().min(1, { message: "Excursion campaign is required!" }),
  studentId: z.string().min(1, { message: "Student is required!" }),
  amount: z.number().min(0.01, { message: "Paid amount must be greater than zero!" }),
  note: z.string().optional(),
});

export type ExcursionPaymentSchema = z.infer<typeof excursionPaymentSchema>;

export const feeCollectionCampaignSchema = z.object({
  id: z.number().optional(),
  classId: z.number().min(1, { message: "Class is required!" }),
  title: z.string().min(1, { message: "Collection title is required!" }),
  collectionType: z.enum(["PRINTING_FEE", "MOCK_FEE", "SPECIAL_DONATION"], {
    message: "Collection type is required!",
  }),
  targetAmount: z.number().min(0.01, { message: "Target amount must be greater than zero!" }),
});

export type FeeCollectionCampaignSchema = z.infer<typeof feeCollectionCampaignSchema>;

export const feeCollectionPaymentSchema = z.object({
  id: z.number().optional(),
  campaignId: z.number().min(1, { message: "Collection campaign is required!" }),
  studentId: z.string().min(1, { message: "Student is required!" }),
  amount: z.number().min(0.01, { message: "Paid amount must be greater than zero!" }),
  note: z.string().optional(),
});

export type FeeCollectionPaymentSchema = z.infer<typeof feeCollectionPaymentSchema>;

export const gradeFeeSchema = z.object({
  title: z.string().min(1, { message: "Title is required!" }),
  amount: z.number().min(0, { message: "Amount must be positive!" }),
  dueDate: z.date({ message: "Due date is required!" }),
  status: z.enum(["PENDING", "PAID", "OVERDUE"], { message: "Status is required!" }),
  description: z.string().optional(),
  gradeId: z.number().min(1, { message: "Grade is required!" }),
});

export type GradeFeeSchema = z.infer<typeof gradeFeeSchema>;

export const adminSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "Name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  img: z.string().optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN"], { message: "Role is required!" }),
});

export type AdminSchema = z.infer<typeof adminSchema>;

export const timetableSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  semester: z.string().min(1, { message: "Semester is required!" }),
  academicYear: z.string().min(1, { message: "Academic Year is required!" }),
  targetGroup: z.enum(["PRE_SCHOOL", "LOWER_PRIMARY", "UPPER_PRIMARY", "JUNIOR_HIGH"], {
    message: "Target group is required!",
  }),
  fileUrl: z.string().optional().or(z.literal("")),
  fileType: z.enum(["PDF", "IMAGE"]).optional(),
});

export type TimetableSchema = z.infer<typeof timetableSchema>;

export const courseSyllabusSchema = z.object({
  id: z.number().optional(),
  title: z
    .string()
    .min(1, { message: "Title is required!" })
    .max(191, { message: "Title must be 191 characters or fewer!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  subjectId: z.number().int().min(1, { message: "Subject is required!" }),
  gradeId: z.number().int().min(1, { message: "Grade is required!" }),
  topicsText: z.string().optional().or(z.literal("")),
  fileName: z
    .string()
    .min(1, { message: "PDF file is required!" })
    .max(191, { message: "Filename must be 191 characters or fewer!" }),
  filePath: z.string().min(1, { message: "PDF file is required!" }),
  fileSizeBytes: z.number().int().min(1, { message: "PDF file is required!" }),
  mimeType: z
    .string()
    .min(1, { message: "File type is required!" })
    .max(191, { message: "File type is too long!" }),
});

export type CourseSyllabusSchema = z.infer<typeof courseSyllabusSchema>;

export const academicReferenceMaterialSchema = z.object({
  id: z.number().optional(),
  category: z
    .string()
    .min(1, { message: "Category is required!" })
    .max(191, { message: "Category must be 191 characters or fewer!" }),
  title: z
    .string()
    .min(1, { message: "Title is required!" })
    .max(191, { message: "Title must be 191 characters or fewer!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  resourceType: z
    .string()
    .min(1, { message: "Resource type is required!" })
    .max(191, { message: "Resource type must be 191 characters or fewer!" }),
  fileName: z
    .string()
    .min(1, { message: "PDF file is required!" })
    .max(191, { message: "Filename must be 191 characters or fewer!" }),
  filePath: z.string().min(1, { message: "PDF file is required!" }),
  fileSizeBytes: z.number().int().min(1, { message: "PDF file is required!" }),
  mimeType: z
    .string()
    .min(1, { message: "File type is required!" })
    .max(191, { message: "File type is too long!" }),
});

export type AcademicReferenceMaterialSchema = z.infer<typeof academicReferenceMaterialSchema>;

export const examRegulationDocumentSchema = z.object({
  id: z.number().optional(),
  title: z
    .string()
    .min(1, { message: "Title is required!" })
    .max(191, { message: "Title must be 191 characters or fewer!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  fileName: z
    .string()
    .min(1, { message: "PDF file is required!" })
    .max(191, { message: "Filename must be 191 characters or fewer!" }),
  filePath: z.string().min(1, { message: "PDF file is required!" }),
  fileSizeBytes: z.number().int().min(1, { message: "PDF file is required!" }),
  mimeType: z
    .string()
    .min(1, { message: "File type is required!" })
    .refine(
      (mimeType) =>
        mimeType === "application/pdf" ||
        mimeType === "application/x-pdf" ||
        mimeType === "application/acrobat" ||
        mimeType === "applications/vnd.pdf" ||
        mimeType === "text/pdf",
      { message: "Only PDF files are allowed!" }
    ),
});

export type ExamRegulationDocumentSchema = z.infer<typeof examRegulationDocumentSchema>;

export const videoLessonSchema = z.object({
  id: z.number().optional(),
  title: z
    .string()
    .min(1, { message: "Title is required!" })
    .max(191, { message: "Title must be 191 characters or fewer!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  youtubeUrl: z
    .string()
    .min(1, { message: "YouTube URL is required!" })
    .max(500, { message: "YouTube URL is too long!" })
    .refine((url) => extractYouTubeVideoId(url) !== null, {
      message: "Enter a valid YouTube video link.",
    }),
  subjectId: z.number().int().min(1, { message: "Subject is required!" }),
  gradeId: z.number().int().min(1, { message: "Grade is required!" }),
});

export type VideoLessonSchema = z.infer<typeof videoLessonSchema>;

export const updateVideoLessonSchema = videoLessonSchema.extend({
  id: z.number().int().min(1, { message: "Video lesson is required!" }),
});

export type UpdateVideoLessonSchema = z.infer<typeof updateVideoLessonSchema>;

export const libraryCatalogItemSchema = z
  .object({
    id: z.number().optional(),
    itemType: z.enum(["BOOK", "DIGITAL_RESOURCE"], {
      message: "Item type is required!",
    }),
    title: z
      .string()
      .min(1, { message: "Title is required!" })
      .max(191, { message: "Title must be 191 characters or fewer!" }),
    author: z.string().optional().or(z.literal("")),
    isbn: z.string().optional().or(z.literal("")),
    category: z
      .string()
      .min(1, { message: "Category is required!" })
      .max(191, { message: "Category must be 191 characters or fewer!" }),
    gradeRange: z.string().optional().or(z.literal("")),
    availability: z.enum(["AVAILABLE", "LIMITED", "UNAVAILABLE"], {
      message: "Availability is required!",
    }),
    copies: z
      .number({ message: "Copies must be a number!" })
      .int({ message: "Copies must be a whole number!" })
      .min(0, { message: "Copies cannot be negative!" }),
    description: z.string().min(1, { message: "Description is required!" }),
    externalUrl: z.string().url({ message: "Enter a valid URL!" }).optional().or(z.literal("")),
  })
  .superRefine((data, context) => {
    if (data.itemType === "BOOK" && !(data.author || "").trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["author"],
        message: "Author is required for books.",
      });
    }

    if (data.itemType === "DIGITAL_RESOURCE" && !(data.externalUrl || "").trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["externalUrl"],
        message: "A resource URL is required for digital resources.",
      });
    }
  });

export type LibraryCatalogItemSchema = z.infer<typeof libraryCatalogItemSchema>;

export const libraryBorrowSchema = z.object({
  id: z.number().optional(),
  itemId: z
    .number({ message: "Item is required!" })
    .int({ message: "Invalid item ID!" })
    .min(1, { message: "Item is required!" }),
  studentId: z.string().min(1, { message: "Student is required!" }),
  dueDate: z.date({ message: "Due date is required!" }),
  notes: z.string().optional().or(z.literal("")),
});

export type LibraryBorrowSchema = z.infer<typeof libraryBorrowSchema>;

