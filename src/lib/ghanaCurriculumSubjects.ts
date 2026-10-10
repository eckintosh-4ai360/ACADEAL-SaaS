export type EducationLevel =
  | "Pre School"
  | "Lower Primary"
  | "Upper Primary"
  | "JHS";

export interface CurriculumSubject {
  name: string;
  levels: EducationLevel[];
}

export const GHANA_CURRICULUM_SUBJECTS: CurriculumSubject[] = [
  // Pre School
  { name: "Language & Literacy", levels: ["Pre School"] },
  { name: "Mathematics (Numeracy)", levels: ["Pre School"] },
  { name: "Physical Development", levels: ["Pre School"] },
  { name: "Environmental Studies", levels: ["Pre School"] },
  { name: "Our World Our People", levels: ["Pre School"] },
  { name: "Music & Movement", levels: ["Pre School"] },

  // Primary & JHS Maths/English
  { name: "English Language", levels: ["Lower Primary", "Upper Primary", "JHS"] },
  { name: "Mathematics", levels: ["Lower Primary", "Upper Primary", "JHS"] },

  // Science
  { name: "Science", levels: ["Lower Primary", "Upper Primary"] },
  { name: "Integrated Science", levels: ["JHS"] },

  // Social/Moral
  { name: "Social Studies", levels: ["Lower Primary", "Upper Primary", "JHS"] },
  { name: "Religious & Moral Education", levels: ["Lower Primary", "Upper Primary", "JHS"] },

  // Arts/Tech/Languages
  { name: "Creative Arts", levels: ["Pre School", "Lower Primary", "Upper Primary"] },
  { name: "Creative Arts & Design", levels: ["JHS"] },
  { name: "Physical Education", levels: ["Lower Primary", "Upper Primary"] },
  { name: "Ghanaian Language", levels: ["Pre School", "Lower Primary", "Upper Primary", "JHS"] },
  { name: "Computing", levels: ["Lower Primary", "Upper Primary", "JHS"] },
  { name: "French", levels: ["Lower Primary", "Upper Primary", "JHS"] },
  { name: "History", levels: ["Upper Primary", "JHS"] },
  { name: "Career Technology", levels: ["JHS"] },
  { name: "Arabic", levels: ["JHS"] },
];

export const EDUCATION_LEVELS: EducationLevel[] = [
  "Pre School",
  "Lower Primary",
  "Upper Primary",
  "JHS",
];
