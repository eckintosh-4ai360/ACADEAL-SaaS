/**
 * Seed a control-plane tenant's database with the default logins
 * (superadmin / admin, password Admin@123), grades, and subjects.
 *
 * Unlike prisma/seed.ts this never deletes anything: existing admins are
 * left alone and SystemSettings is only created when the table is empty.
 *
 * Usage:
 *   TARGET_SLUG=<slug> npm run seed:tenant
 *   TARGET_DOMAIN=<domain> npm run seed:tenant
 *
 * With no target set, the registered tenants are listed and nothing is written.
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import { listControlPlaneSchoolTenants } from "../src/lib/control-plane";

const DEFAULT_PASSWORD = "Admin@123";

const DEFAULT_ADMINS = [
  {
    username: "superadmin",
    staffId: "STAFF-SA-001",
    name: "Super Admin",
    email: "superadmin@school.com",
    phone: "+1234567890",
    role: "SUPER_ADMIN",
  },
  {
    username: "admin",
    staffId: "STAFF-ADM-001",
    name: "Admin User",
    email: "admin@school.com",
    phone: "+1234567891",
    role: "ADMIN",
  },
] as const;

const CURRICULUM_SUBJECTS = [
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
  "General Learning",
];

type Tenant = Awaited<ReturnType<typeof listControlPlaneSchoolTenants>>[number];

async function seedTenant(tenant: Tenant, databaseUrl: string) {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    try {
      await prisma.admin.count();
    } catch (error) {
      if ((error as { code?: string }).code === "P2021") {
        throw new Error(
          "Tables are missing. Run `prisma migrate deploy` against this tenant's database first."
        );
      }
      throw error;
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    for (const account of DEFAULT_ADMINS) {
      const existingAdmin = await prisma.admin.findFirst({
        where: { OR: [{ username: account.username }, { staffId: account.staffId }] },
        select: { username: true },
      });

      if (existingAdmin) {
        console.log(`  • "${account.username}" already exists — left unchanged.`);
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const staffProfile =
          (await tx.staff.findUnique({ where: { staffId: account.staffId } })) ??
          (await tx.staff.create({
            data: {
              staffId: account.staffId,
              username: account.username,
              password: hashedPassword,
              name: account.name,
              email: account.email,
              phone: account.phone,
              staffType: "ADMIN",
              adminRole: account.role,
            },
          }));

        await tx.admin.create({
          data: {
            username: account.username,
            staffId: account.staffId,
            staffProfileId: staffProfile.id,
            password: hashedPassword,
            name: account.name,
            email: account.email,
            phone: account.phone,
            role: account.role,
          },
        });
      });

      console.log(`  ✅ Created "${account.username}" (${account.role}).`);
    }

    for (let level = 1; level <= 14; level++) {
      await prisma.grade.upsert({ where: { level }, update: {}, create: { level } });
    }
    console.log("  ✅ Grades 1–14 ensured.");

    for (const name of CURRICULUM_SUBJECTS) {
      await prisma.subject.upsert({ where: { name }, update: {}, create: { name } });
    }
    console.log(`  ✅ ${CURRICULUM_SUBJECTS.length} subjects ensured.`);

    if ((await prisma.systemSettings.count()) === 0) {
      await prisma.systemSettings.create({
        data: {
          schoolName: tenant.schoolName,
          currency: "GHS",
          timezone: "Africa/Accra",
          dateFormat: "MM/dd/yyyy",
        },
      });
      console.log("  ✅ SystemSettings created.");
    } else {
      console.log("  • SystemSettings already present — left unchanged.");
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function main() {
  const tenants = await listControlPlaneSchoolTenants();

  if (tenants.length === 0) {
    console.error("❌ No tenants found in the control plane registry.");
    process.exit(1);
  }

  const targetSlug = process.env.TARGET_SLUG;
  const targetDomain = process.env.TARGET_DOMAIN;

  if (!targetSlug && !targetDomain) {
    console.log("📋 Registered tenants:");
    tenants.forEach((t) => {
      console.log(`  slug: "${t.slug}" | school: "${t.schoolName}" | domains: ${t.domains?.join(", ") || "none"}`);
    });
    console.log("\nSet TARGET_SLUG or TARGET_DOMAIN to seed one of them. Nothing was written.");
    return;
  }

  const tenant = tenants.find((t) =>
    targetSlug ? t.slug === targetSlug : t.domains?.includes(targetDomain!)
  );

  if (!tenant) {
    console.error(`❌ No tenant found for ${targetSlug ? `slug "${targetSlug}"` : `domain "${targetDomain}"`}.`);
    process.exit(1);
  }

  const databaseUrl = tenant.databaseUrl || tenant.databaseUrlUnpooled || tenant.directUrl;
  if (!databaseUrl) {
    console.error(`❌ Tenant "${tenant.slug}" has no database URL.`);
    process.exit(1);
  }

  console.log(`🌱 Seeding [${tenant.slug}] ${tenant.schoolName}...\n`);
  await seedTenant(tenant, databaseUrl);
  console.log(`\n✅ Done. Log in with superadmin / ${DEFAULT_PASSWORD} or admin / ${DEFAULT_PASSWORD}.`);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
