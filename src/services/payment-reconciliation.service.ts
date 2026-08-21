import { Injectable } from '@nestjs/common';
import { prisma } from '../db/prisma.service';

@Injectable()
export class PaymentReconciliationService {
  // Responsible for processing payment provider webhook events and reconciling contributions

  async processStripeCheckoutSession(session: any) {
    // session should contain metadata with contribution id or member info
    const idempotencyKey = `stripe_session_${session.id}`;
    const existing = await prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
    if (existing) return { ok: true, reason: 'already_processed' };

    await prisma.idempotencyKey.create({ data: { key: idempotencyKey } });

    // Assume session.metadata.contribution_id exists (you must set metadata when creating the session)
    const contributionId = session.metadata?.contribution_id;
    if (!contributionId) {
      return { ok: false, reason: 'missing_metadata' };
    }

    // Use DB function to mark contribution succeeded for idempotency and atomicity
    try {
      await prisma.$executeRaw`SELECT fn_mark_contribution_succeeded(${contributionId}::uuid, ${new Date().toISOString()}::timestamptz, ${session.id}::text)`;
      return { ok: true };
    } catch (err: any) {
      console.error('Reconciliation failed', err);
      return { ok: false, reason: err.message };
    }
  }
}
