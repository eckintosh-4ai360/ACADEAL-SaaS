DO $$
BEGIN
    CREATE TYPE "StaffType" AS ENUM ('ADMIN', 'TEACHER');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "Staff" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "img" TEXT,
    "sex" "UserSex",
    "birthday" TIMESTAMP(3),
    "permissions" JSONB,
    "staffType" "StaffType" NOT NULL,
    "adminRole" "AdminRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Staff_staffId_key" ON "Staff"("staffId");
CREATE UNIQUE INDEX IF NOT EXISTS "Staff_staffType_username_key" ON "Staff"("staffType", "username");
CREATE INDEX IF NOT EXISTS "Staff_staffType_name_surname_idx" ON "Staff"("staffType", "name", "surname");
CREATE INDEX IF NOT EXISTS "Staff_email_idx" ON "Staff"("email");
CREATE INDEX IF NOT EXISTS "Staff_phone_idx" ON "Staff"("phone");

ALTER TABLE "Admin"
ADD COLUMN IF NOT EXISTS "staffProfileId" TEXT;

ALTER TABLE "Teacher"
ADD COLUMN IF NOT EXISTS "staffProfileId" TEXT;

INSERT INTO "Staff" (
    "id",
    "staffId",
    "username",
    "password",
    "name",
    "surname",
    "email",
    "phone",
    "address",
    "img",
    "sex",
    "birthday",
    "permissions",
    "staffType",
    "adminRole",
    "createdAt",
    "updatedAt"
)
SELECT
    'admin-' || a."id",
    a."staffId",
    a."username",
    a."password",
    a."name",
    NULL,
    a."email",
    a."phone",
    NULL,
    a."img",
    NULL,
    NULL,
    a."permissions",
    'ADMIN'::"StaffType",
    a."role",
    a."createdAt",
    a."updatedAt"
FROM "Admin" a
ON CONFLICT ("staffId") DO UPDATE
SET
    "username" = EXCLUDED."username",
    "password" = EXCLUDED."password",
    "name" = EXCLUDED."name",
    "surname" = EXCLUDED."surname",
    "email" = EXCLUDED."email",
    "phone" = EXCLUDED."phone",
    "address" = EXCLUDED."address",
    "img" = EXCLUDED."img",
    "sex" = EXCLUDED."sex",
    "birthday" = EXCLUDED."birthday",
    "permissions" = EXCLUDED."permissions",
    "staffType" = EXCLUDED."staffType",
    "adminRole" = EXCLUDED."adminRole",
    "createdAt" = EXCLUDED."createdAt",
    "updatedAt" = EXCLUDED."updatedAt";

INSERT INTO "Staff" (
    "id",
    "staffId",
    "username",
    "password",
    "name",
    "surname",
    "email",
    "phone",
    "address",
    "img",
    "sex",
    "birthday",
    "permissions",
    "staffType",
    "adminRole",
    "createdAt",
    "updatedAt"
)
SELECT
    'teacher-' || t."id",
    t."staffId",
    t."username",
    t."password",
    t."name",
    t."surname",
    t."email",
    t."phone",
    t."address",
    t."img",
    t."sex",
    t."birthday",
    t."permissions",
    'TEACHER'::"StaffType",
    NULL,
    t."createdAt",
    t."updatedAt"
FROM "Teacher" t
ON CONFLICT ("staffId") DO UPDATE
SET
    "username" = EXCLUDED."username",
    "password" = EXCLUDED."password",
    "name" = EXCLUDED."name",
    "surname" = EXCLUDED."surname",
    "email" = EXCLUDED."email",
    "phone" = EXCLUDED."phone",
    "address" = EXCLUDED."address",
    "img" = EXCLUDED."img",
    "sex" = EXCLUDED."sex",
    "birthday" = EXCLUDED."birthday",
    "permissions" = EXCLUDED."permissions",
    "staffType" = EXCLUDED."staffType",
    "adminRole" = EXCLUDED."adminRole",
    "createdAt" = EXCLUDED."createdAt",
    "updatedAt" = EXCLUDED."updatedAt";

UPDATE "Admin" a
SET "staffProfileId" = s."id"
FROM "Staff" s
WHERE s."staffId" = a."staffId"
  AND s."staffType" = 'ADMIN'::"StaffType";

UPDATE "Teacher" t
SET "staffProfileId" = s."id"
FROM "Staff" s
WHERE s."staffId" = t."staffId"
  AND s."staffType" = 'TEACHER'::"StaffType";

CREATE UNIQUE INDEX IF NOT EXISTS "Admin_staffProfileId_key" ON "Admin"("staffProfileId");
CREATE UNIQUE INDEX IF NOT EXISTS "Teacher_staffProfileId_key" ON "Teacher"("staffProfileId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Admin_staffProfileId_fkey'
    ) THEN
        ALTER TABLE "Admin"
        ADD CONSTRAINT "Admin_staffProfileId_fkey"
        FOREIGN KEY ("staffProfileId") REFERENCES "Staff"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Teacher_staffProfileId_fkey'
    ) THEN
        ALTER TABLE "Teacher"
        ADD CONSTRAINT "Teacher_staffProfileId_fkey"
        FOREIGN KEY ("staffProfileId") REFERENCES "Staff"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END
$$;
