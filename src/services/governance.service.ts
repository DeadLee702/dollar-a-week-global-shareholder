import { Injectable } from '@nestjs/common';
import { prisma } from '../db/prisma.service';
import { ProtocolStateService } from '../protocol-state/protocol-state.service';

@Injectable()
export class GovernanceService {
  constructor(private readonly protocolState: ProtocolStateService) {}

  async createProposal(data: any) {
    // Minimal proposal structure: { seed_cell_id, proposer_id, title, description, requested_amount }
    const { seed_cell_id, proposer_id, title, description, requested_amount } = data;
    if (!seed_cell_id || !proposer_id || !title) throw new Error('Missing fields');

    // check permission to create proposal
    const seed = await prisma.seedCell.findUnique({ where: { id: seed_cell_id } });
    if (!seed) throw new Error('Seed Cell not found');

    // create proposal as a project placeholder in protocol
    const proposal = await prisma.$executeRaw`-- proposals table not yet created; placeholder`;
    // For now, record an audit log
    await prisma.auditLog.create({ data: { actor_id: proposer_id, action: 'create_proposal', entity_type: 'proposal', new_state: 'PROPOSED' } });
    return { message: 'Proposal creation placeholder — implement proposals table', seed_cell_id, title };
  }

  async castVote(data: any) {
    const { proposal_id, user_id, vote } = data;
    if (!proposal_id || !user_id || !vote) throw new Error('Missing fields');
    const can = await this.protocolState.canVote(user_id, proposal_id);
    if (!can.allowed) throw new Error(`Cannot vote: ${can.reason}`);
    // Placeholder: actual vote storage requires proposals & votes tables. Log the action.
    await prisma.auditLog.create({ data: { actor_id: user_id, action: 'cast_vote', entity_type: 'proposal', entity_id: proposal_id, new_state: vote } });
    return { message: 'Vote recorded (audit log). Implement votes table for aggregation.' };
  }
}
