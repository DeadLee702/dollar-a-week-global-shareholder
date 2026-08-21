import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDemo() {
  console.log('Cleaning demo records...');
  await prisma.financialEvent.deleteMany({ where: {} });
  await prisma.contribution.deleteMany({ where: {} });
  await prisma.treasurySignature.deleteMany({ where: {} });
  console.log('Done');
}

cleanupDemo()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
