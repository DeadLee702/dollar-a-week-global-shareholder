import { prisma } from '../db/prisma.service';

import { ProtocolStateService } from '../protocol-state/protocol-state.service';

describe('GovernanceService integration', () => {
  it('prevents unverified user from voting', async () => {
    // create user without verification and attempt to vote
    const user = await prisma.user.create({ data: { auth_user_id: 'unverified_user', display_name: 'Unverified', status: 'ACTIVE' } });
    const seed = await prisma.seedCell.create({ data: { name: 'Governance Seed' } });
    const member = await prisma.seedCellMember.create({ data: { seed_cell_id: seed.id, user_id: user.id, membership_status: 'ACTIVE', voting_eligible: false } });
    const proposer = await prisma.user.create({ data: { auth_user_id: 'prop', display_name: 'Prop', status: 'ACTIVE' } });
    const propMember = await prisma.seedCellMember.create({ data: { seed_cell_id: seed.id, user_id: proposer.id, membership_status: 'ACTIVE', voting_eligible: true } });
    const proposal = await prisma.proposal.create({ data: { seed_cell_id: seed.id, proposer_id: proposer.id, title: 'Test Proposal' } });

    const svc = new ProtocolStateService();
    const can = await svc.canVote(user.id, proposal.id);
    expect(can.allowed).toBe(false);
    expect(can.reason).toMatch(/not verified|not eligible/i);
  });

  it('allows verified member to vote once', async () => {
    const user = await prisma.user.create({ data: { auth_user_id: 'verified_user', display_name: 'Verified', status: 'ACTIVE' } });
    await prisma.memberVerification.create({ data: { user_id: user.id, verification_status: 'VERIFIED' } });
    const seed = await prisma.seedCell.create({ data: { name: 'Governance Seed 2' } });
    const member = await prisma.seedCellMember.create({ data: { seed_cell_id: seed.id, user_id: user.id, membership_status: 'ACTIVE', voting_eligible: true } });
    const proposer = await prisma.user.create({ data: { auth_user_id: 'prop2', display_name: 'Prop2', status: 'ACTIVE' } });
    const propMember = await prisma.seedCellMember.create({ data: { seed_cell_id: seed.id, user_id: proposer.id, membership_status: 'ACTIVE', voting_eligible: true } });
    const proposal = await prisma.proposal.create({ data: { seed_cell_id: seed.id, proposer_id: proposer.id, title: 'Test Proposal 2' } });

    const protocol = new ProtocolStateService();
    const gov = new (require('../services/governance.service').GovernanceService)(protocol);

    const vote = await gov.castVote({ proposal_id: proposal.id, user_id: user.id, choice: 'FOR' });
    expect(vote).toBeDefined();

    // second vote should be rejected
    let thrown = false;
    try {
      await gov.castVote({ proposal_id: proposal.id, user_id: user.id, choice: 'AGAINST' });
    } catch (err) {
      thrown = true;
    }
    expect(thrown).toBe(true);
  });
});
