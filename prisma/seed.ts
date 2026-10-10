import { PrismaClient } from "@prisma/client";
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter });

async function main() {
  //* Clear existing data to avoid conflicts
  await prisma.staff.deleteMany({});
  await prisma.admin.deleteMany({});

  //* Create Super Admin
  const hashedSuperAdminPassword = await bcrypt.hash("Admin@123", 10);
  const superAdmin = await prisma.$transaction(async (tx) => {
    const staffProfile = await tx.staff.create({
      data: {
        staffId: "STAFF-SA-001",
        username: "superadmin",
        password: hashedSuperAdminPassword,
        name: "Super Admin",
        email: "superadmin@school.com",
        phone: "+1234567890",
        staffType: "ADMIN",
        adminRole: "SUPER_ADMIN",
      },
    });

    return tx.admin.create({
      data: {
        username: "superadmin",
        staffId: "STAFF-SA-001",
        staffProfileId: staffProfile.id,
        password: hashedSuperAdminPassword,
        name: "Super Admin",
        email: "superadmin@school.com",
        phone: "+1234567890",
        role: "SUPER_ADMIN",
      },
    });
  });

  console.log("Super Admin created:", superAdmin);

  //* Create Regular Admin
  const hashedAdminPassword = await bcrypt.hash("Admin@123", 10);
  const admin = await prisma.$transaction(async (tx) => {
    const staffProfile = await tx.staff.create({
      data: {
        staffId: "STAFF-ADM-001",
        username: "admin",
        password: hashedAdminPassword,
        name: "Admin User",
        email: "admin@school.com",
        phone: "+1234567891",
        staffType: "ADMIN",
        adminRole: "ADMIN",
      },
    });

    return tx.admin.create({
      data: {
        username: "admin",
        staffId: "STAFF-ADM-001",
        staffProfileId: staffProfile.id,
        password: hashedAdminPassword,
        name: "Admin User",
        email: "admin@school.com",
        phone: "+1234567891",
        role: "ADMIN",
      },
    });
  });

  console.log("Admin created:", admin);

  //* Create or update Grades
  await Promise.all([
    prisma.grade.upsert({ where: { level: 1 }, update: {}, create: { level: 1 } }),
    prisma.grade.upsert({ where: { level: 2 }, update: {}, create: { level: 2 } }),
    prisma.grade.upsert({ where: { level: 3 }, update: {}, create: { level: 3 } }),
    prisma.grade.upsert({ where: { level: 4 }, update: {}, create: { level: 4 } }),
    prisma.grade.upsert({ where: { level: 5 }, update: {}, create: { level: 5 } }),
    prisma.grade.upsert({ where: { level: 6 }, update: {}, create: { level: 6 } }),
    prisma.grade.upsert({ where: { level: 7 }, update: {}, create: { level: 7 } }),
    prisma.grade.upsert({ where: { level: 8 }, update: {}, create: { level: 8 } }),
    prisma.grade.upsert({ where: { level: 9 }, update: {}, create: { level: 9 } }),
    prisma.grade.upsert({ where: { level: 10 }, update: {}, create: { level: 10 } }),
    prisma.grade.upsert({ where: { level: 11 }, update: {}, create: { level: 11 } }),
    prisma.grade.upsert({ where: { level: 12 }, update: {}, create: { level: 12 } }),
    prisma.grade.upsert({ where: { level: 13 }, update: {}, create: { level: 13 } }),
    prisma.grade.upsert({ where: { level: 14 }, update: {}, create: { level: 14 } }),
  ]);

  console.log("Grades created");

  //* Create or update Subjects
  const curriculumSubjects = [
    "Mathematics",
    "English",
    "English Language",
    "Science",
    "Integrated Science",
    "Social Studies",
    "Computing / ICT",
    "Career Technology",
    "Creative Arts",
    "Creative Arts and Design",
    "Religious and Moral Education (RME)",
    "Ghanaian Language",
    "French",
    "Physical Education (PE)",
    "Physical and Health Education (PHE)",
    "Our World Our People (OWOP)",
    "History of Ghana",
    "History",
    "Geography",
    "Language and Literacy",
    "Numeracy",
    "Songs & Culture",
    "General Learning"
  ];

  await Promise.all(
    curriculumSubjects.map((name) =>
      prisma.subject.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  console.log("Subjects created");

  //* Create System Settings
  await prisma.systemSettings.create({
    data: {
      schoolName: "Demo School",
      schoolShortName: "DS",
      schoolEmail: "info@demoschool.com",
      schoolPhone: "+1234567890",
      schoolAddress: "123 Education Street, Learning City",
      academicYear: "2024-2025",
      currency: "GHS",
      timezone: "Africa/Accra",
      dateFormat: "MM/dd/yyyy",
    },
  });

  console.log("System settings created");

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
