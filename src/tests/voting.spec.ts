import { prisma } from '../db/prisma.service';

describe('Voting / Governance', () => {
  it('rejects duplicate vote by same user on same proposal', async () => {
    // create user, seed cell, member, proposal
    const user = await prisma.user.create({ data: { auth_user_id: 'testuser', display_name: 'Test', status: 'ACTIVE' } });
    const seed = await prisma.seedCell.create({ data: { name: 'Test Seed', protocol_state: 'STATE_1_ACCUMULATION' } });
    const member = await prisma.seedCellMember.create({ data: { seed_cell_id: seed.id, user_id: user.id, membership_status: 'ACTIVE' } });
    const proposal = await prisma.proposal.create({ data: { seed_cell_id: seed.id, proposer_id: user.id, title: 'Test Proposal' } });

    // first vote
    const v1 = await prisma.vote.create({ data: { proposal_id: proposal.id, user_id: user.id, seed_cell_member_id: member.id, choice: 'FOR' } });

    let thrown = false;
    try {
      // second vote should violate unique index and throw
      await prisma.vote.create({ data: { proposal_id: proposal.id, user_id: user.id, seed_cell_member_id: member.id, choice: 'AGAINST' } });
    } catch (err) {
      thrown = true;
    }
    expect(thrown).toBe(true);
  });
});
