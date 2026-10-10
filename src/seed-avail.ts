import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || "";
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Seeding Default Teacher Availability ---');
  
  try {
    const teachers = await prisma.teacher.findMany({
      select: { id: true, name: true, surname: true }
    });

    if (teachers.length === 0) {
      console.log('No teachers found to seed availability for.');
      return;
    }

    const availabilities = [];
    
    // Days 1-5 (Mon-Fri)
    for (const teacher of teachers) {
      for (let day = 1; day <= 5; day++) {
        availabilities.push({
          teacherId: teacher.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          isActive: true
        });
      }
    }

    console.log(`Creating ${availabilities.length} availability records...`);
    
    await prisma.meetingAvailability.createMany({
      data: availabilities,
      skipDuplicates: true
    });

    console.log('✅ Default availability seeded successfully (Mon-Fri, 09:00-17:00).');

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
