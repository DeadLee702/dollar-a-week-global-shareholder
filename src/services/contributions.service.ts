import { Injectable } from '@nestjs/common';
import { prisma } from '../db/prisma.service';
import { ProtocolStateService } from '../protocol-state/protocol-state.service';

@Injectable()
export class ContributionsService {
  constructor(private readonly protocolState: ProtocolStateService) {}

  async createPendingContribution(data: any) {
    const { seed_cell_id, user_id, amount, currency, payment_reference, payment_provider } = data;
    if (!seed_cell_id || !user_id || !amount || !currency) throw new Error('Missing fields');

    const allowed = await this.protocolState.canContribute(user_id, seed_cell_id);
    if (!allowed.allowed) throw new Error(`Not allowed to contribute: ${allowed.reason}`);

    // Create pending contribution record. Only mark SUCCEEDED after webhook reconciliation.
    const contrib = await prisma.contribution.create({
      data: {
        seed_cell_id,
        member_id: await this._resolveMemberId(seed_cell_id, user_id),
        amount: Number(amount),
        currency,
        usd_equivalent: await this._convertToUSD(amount, currency),
        contribution_week: new Date(),
        payment_provider: payment_provider || 'stripe',
        payment_reference: payment_reference || null,
        payment_status: 'PENDING'
      }
    });

    await prisma.auditLog.create({ data: { actor_id: user_id, action: 'create_contribution_pending', entity_type: 'contribution', entity_id: contrib.id, new_state: 'PENDING' } });

    return contrib;
  }

  private async _resolveMemberId(seedCellId: string, userId: string) {
    const m = await prisma.seedCellMember.findFirst({ where: { seed_cell_id: seedCellId, user_id: userId } });
    if (!m) {
      // auto-create membership as PENDING -> per protocol onboarding flow this should be controlled
      const member = await prisma.seedCellMember.create({ data: { seed_cell_id: seedCellId, user_id: userId, membership_status: 'PENDING' } });
      return member.id;
    }
    return m.id;
  }

  private async _convertToUSD(amount: number, currency: string) {
    // Placeholder exchange rate. In production, use a trusted exchange rate service and record source.
    if (currency === 'USD') return Number(amount);
    // Simple mock: assume 1 unit = 1 USD
    return Number(amount);
  }
}
