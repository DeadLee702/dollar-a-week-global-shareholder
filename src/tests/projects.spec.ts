import { prisma } from '../db/prisma.service';

describe('Projects & Protocol State enforcement', () => {
  it('prevents project creation unless proposal approved', async () => {
    const proposer = await prisma.user.create({ data: { auth_user_id: 'proj_user', display_name: 'ProjUser', status: 'ACTIVE' } });
    const seed = await prisma.seedCell.create({ data: { name: 'Proj Seed', protocol_state: 'STATE_3_LAND_EXECUTION' } });
    const proposal = await prisma.proposal.create({ data: { seed_cell_id: seed.id, proposer_id: proposer.id, title: 'Unapproved Proposal', status: 'PROPOSED' } });

    const svc = new (require('../services/projects.service').ProjectsService)();
    let thrown = false;
    try {
      await svc.createProject({ seed_cell_id: seed.id, proposal_id: proposal.id, project_type: 'WATER', name: 'Well Project' });
    } catch (err: any) {
      thrown = true;
      expect(err.message).toMatch(/not approved/);
    }
    expect(thrown).toBe(true);
  });
});
