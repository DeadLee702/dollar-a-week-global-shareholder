import { PaymentReconciliationService } from '../services/payment-reconciliation.service';
import { prisma } from '../db/prisma.service';

describe('Stripe reconciliation', () => {
  it('processes checkout.session with contribution metadata idempotently', async () => {
    const svc = new PaymentReconciliationService();
    // create seed cell and contribution
    const user = await prisma.user.create({ data: { auth_user_id: 'stripeuser', display_name: 'Stripe', status: 'ACTIVE' } });
    const seed = await prisma.seedCell.create({ data: { name: 'Stripe Seed' } });
    const member = await prisma.seedCellMember.create({ data: { seed_cell_id: seed.id, user_id: user.id, membership_status: 'ACTIVE' } });
    const contrib = await prisma.contribution.create({ data: { seed_cell_id: seed.id, member_id: member.id, amount: 1.0, currency: 'USD', usd_equivalent: 1.0, contribution_week: new Date(), payment_status: 'PENDING' } });

    const session = { id: 'sess_test_1', metadata: { contribution_id: contrib.id } };
    const r1 = await svc.processStripeCheckoutSession(session as any);
    expect(r1.ok).toBe(true);

    const r2 = await svc.processStripeCheckoutSession(session as any);
    expect(r2.ok).toBe(true);
    expect(r2.reason).toBe('already_processed');
  });
});
