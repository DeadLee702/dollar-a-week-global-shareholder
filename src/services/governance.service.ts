import { Injectable } from '@nestjs/common';
import { prisma } from '../db/prisma.service';
import { ProtocolStateService } from '../protocol-state/protocol-state.service';

@Injectable()
export class GovernanceService {
  constructor(private readonly protocolState: ProtocolStateService) {}

  async createProposal(data: any) {
    const { seed_cell_id, proposer_id, title, description, requested_amount } = data;
    if (!seed_cell_id || !proposer_id || !title) throw new Error('Missing fields');

    // Confirm proposer is an active member of the seed cell
    const member = await prisma.seedCellMember.findFirst({ where: { seed_cell_id, user_id: proposer_id, membership_status: 'ACTIVE' } });
    if (!member) throw new Error('Proposer must be an active member of the Seed Cell');

    // Create proposal
    const proposal = await prisma.proposal.create({ data: { seed_cell_id, proposer_id, title, description, requested_amount: requested_amount || null, status: 'PROPOSED' } });

    await prisma.auditLog.create({ data: { actor_id: proposer_id, action: 'create_proposal', entity_type: 'proposal', entity_id: proposal.id, new_state: 'PROPOSED' } });

    return proposal;
  }

  async castVote(data: any) {
    const { proposal_id, user_id, choice } = data;
    if (!proposal_id || !user_id || !choice) throw new Error('Missing fields');

    const can = await this.protocolState.canVote(user_id, proposal_id);
    if (!can.allowed) throw new Error(`Cannot vote: ${can.reason}`);

    // Create vote record
    try {
      const member = await prisma.seedCellMember.findFirst({ where: { user_id, seed_cell_id: (await prisma.proposal.findUnique({ where: { id: proposal_id } })).seed_cell_id, membership_status: 'ACTIVE' } });
      const vote = await prisma.vote.create({ data: { proposal_id, user_id, seed_cell_member_id: member!.id, choice } });
      await prisma.auditLog.create({ data: { actor_id: user_id, action: 'cast_vote', entity_type: 'proposal', entity_id: proposal_id, new_state: choice } });
      return vote;
    } catch (err: any) {
      // Propagate clear error messages
      if (err.code === 'P2002' || err.message?.includes('duplicate')) {
        throw new Error('Duplicate vote detected');
      }
      throw err;
    }
  }
}
