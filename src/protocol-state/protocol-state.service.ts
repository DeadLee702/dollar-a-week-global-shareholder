import { Injectable } from '@nestjs/common';
import { prisma } from '../db/prisma.service';

@Injectable()
export class ProtocolStateService {
  // Centralized checks for protocol state enforcement

  async canContribute(userId: string, seedCellId: string) {
    const seed = await prisma.seedCell.findUnique({ where: { id: seedCellId } });
    if (!seed) return { allowed: false, reason: 'Seed Cell not found' };
    const allowedStates = ['STATE_1_ACCUMULATION', 'STATE_2_LAND_GATE'];
    if (!allowedStates.includes(seed.protocol_state)) {
      return { allowed: false, reason: `Contributions are not accepted in state ${seed.protocol_state}` };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { allowed: false, reason: 'User not found' };
    if (user.status !== 'ACTIVE') return { allowed: false, reason: 'User not active' };

    // Ensure user has at most one active membership across seed cells unless protocol permits
    const activeMemberships = await prisma.seedCellMember.count({ where: { user_id: userId, membership_status: 'ACTIVE' } });
    if (activeMemberships > 1) return { allowed: false, reason: 'User has multiple active memberships' };

    return { allowed: true };
  }

  async canVote(userId: string, proposalId: string) {
    // Verify proposal exists and is in a votable status
    const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
    if (!proposal) return { allowed: false, reason: 'Proposal not found' };
    if (proposal.status !== 'PROPOSED' && proposal.status !== 'VOTING') {
      return { allowed: false, reason: `Proposal status ${proposal.status} does not allow voting` };
    }

    // Check user verification
    const verification = await prisma.memberVerification.findFirst({ where: { user_id: userId, verification_status: 'VERIFIED' } });
    if (!verification) return { allowed: false, reason: 'User not verified' };

    // Check membership in the same seed cell as the proposal
    const member = await prisma.seedCellMember.findFirst({ where: { user_id: userId, seed_cell_id: proposal.seed_cell_id, membership_status: 'ACTIVE' } });
    if (!member) return { allowed: false, reason: 'User is not an active member of the proposal Seed Cell' };

    // Check voting eligibility flag (derived server-side)
    if (!member.voting_eligible) return { allowed: false, reason: 'Member not eligible to vote' };

    // Prevent duplicate vote: check votes table
    const existingVote = await prisma.vote.findFirst({ where: { proposal_id: proposalId, user_id: userId } });
    if (existingVote) return { allowed: false, reason: 'User has already voted on this proposal' };

    return { allowed: true };
  }

  async canExecuteTreasury(transactionId: string) {
    const tx = await prisma.treasuryTransaction.findUnique({ where: { id: transactionId } });
    if (!tx) return { allowed: false, reason: 'Transaction not found' };
    if (tx.status !== 'CUSTODY_APPROVED' && tx.status !== 'EXECUTION_AUTHORIZED') {
      return { allowed: false, reason: `Transaction status ${tx.status} does not allow execution` };
    }
    // Additional checks should be performed by treasury service: deployable capital, due diligence, disputes, expiration
    return { allowed: true };
  }

  // Server-side helper to validate state transitions for seed cells
  async canTransitionSeedCell(seedCellId: string, targetState: string) {
    const seed = await prisma.seedCell.findUnique({ where: { id: seedCellId } });
    if (!seed) return { allowed: false, reason: 'Seed Cell not found' };
    const order = [
      'STATE_1_ACCUMULATION',
      'STATE_2_LAND_GATE',
      'STATE_3_LAND_EXECUTION',
      'STATE_4_HARDWARE_DEPLOYMENT',
      'STATE_5_RESOURCE_NETWORK',
      'STATE_6_REPLICATION'
    ];
    const currentIndex = order.indexOf(seed.protocol_state);
    const targetIndex = order.indexOf(targetState);
    if (targetIndex === -1) return { allowed: false, reason: 'Invalid target state' };
    if (targetIndex <= currentIndex) return { allowed: false, reason: 'Can only progress forward in state order' };
    // Additional domain checks (e.g., land acquired before moving to next states) should be enforced elsewhere
    return { allowed: true };
  }
}
