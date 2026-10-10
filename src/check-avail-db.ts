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
  console.log('--- Checking Meeting Availability ---');
  
  try {
    const availabilities = await prisma.meetingAvailability.count();
    console.log('Total Availability Records:', availabilities);

    if (availabilities === 0) {
      console.log('No availability records found. Fetching teachers to create some defaults...');
      const teachers = await prisma.teacher.findMany({
        select: { id: true, name: true, surname: true }
      });

      console.log('Found teachers:', teachers.map(t => `${t.name} ${t.surname} (${t.id})`));
    } else {
      const samples = await prisma.meetingAvailability.findMany({
        take: 5,
        include: { teacher: { select: { name: true, surname: true } } }
      });
      console.log('Sample Availability Records:', JSON.stringify(samples, null, 2));
    }

  } catch (error) {
    console.error('Check error:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
