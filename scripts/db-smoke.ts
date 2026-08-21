import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function smoke() {
  console.log('Smoke: DB connection test');
  const count = await prisma.seedCell.count();
  console.log('seedCell count', count);
}

smoke().then(()=>process.exit(0)).catch(e=>{console.error(e); process.exit(1)});
