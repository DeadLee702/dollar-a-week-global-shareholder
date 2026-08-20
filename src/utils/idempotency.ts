import { prisma } from '../db/prisma.service';

export async function clearIdempotency() {
  // Removes idempotency keys older than TTL (configurable)
  const days = Number(process.env.IDEMPOTENCY_TTL_DAYS || '7');
  const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000);
  await prisma.idempotencyKey.deleteMany({ where: { created_at: { lt: cutoff } } as any });
}
