import { prisma } from '../db/prisma.service';

describe('Multisig + Land Gate integration', () => {
  it('executes land purchase when conditions met', async () => {
    // Setup: create user, seed, members, custodians, proposal, land acquisition, due diligence, treasury account and tx
    const proposer = await prisma.user.create({ data: { auth_user_id: 'land_prop', display_name: 'LandProp', status: 'ACTIVE' } });
    const seed = await prisma.seedCell.create({ data: { name: 'Land Seed', protocol_state: 'STATE_2_LAND_GATE' } });
    const proposerMember = await prisma.seedCellMember.create({ data: { seed_cell_id: seed.id, user_id: proposer.id, membership_status: 'ACTIVE', voting_eligible: true } });

    // Assign custodians
    const cust1 = await prisma.custodian.create({ data: { seed_cell_id: seed.id, user_id: proposer.id, display_name: 'Custodian1' } });
    const cust2User = await prisma.user.create({ data: { auth_user_id: 'cust2', display_name: 'Cust2', status: 'ACTIVE' } });
    const cust2 = await prisma.custodian.create({ data: { seed_cell_id: seed.id, user_id: cust2User.id, display_name: 'Custodian2' } });

    // Create proposal and land acquisition
    const proposal = await prisma.proposal.create({ data: { seed_cell_id: seed.id, proposer_id: proposer.id, title: 'Acquire Land' } });
    const la = await prisma.landAcquisition.create({ data: { proposal_id: proposal.id, seed_cell_id: seed.id, location_description: 'Test Plot', acreage: 10, purchase_price: 1000 } });

    // Add due diligence and verify it
    const dd = await prisma.dueDiligence.create({ data: { proposal_id: proposal.id, seed_cell_id: seed.id, uploader_id: proposer.id, file_reference: 'doc1.pdf', file_hash: 'hash1', verified: true, verified_by: proposer.id, verified_at: new Date() } });

    // Setup treasury account with sufficient deployable balance
    await prisma.treasuryAccount.create({ data: { seed_cell_id: seed.id, gross_balance: 2000, deployable_balance: 2000, currency: 'USD' } });

    // Create treasury transaction linked to proposal
    const tx = await prisma.treasuryTransaction.create({ data: { seed_cell_id: seed.id, proposal_id: proposal.id, amount: 1000, currency: 'USD', destination: 'vendor_xyz', transaction_type: 'LAND_PURCHASE', status: 'PENDING', required_signatures: 2, collected_signatures: 0, governance_approval_reference: 'gov_approved' } });

    // Submit signatures
    const svc = new (require('../services/multisig.service').MultisigService)();
    await svc.submitSignature(tx.id, cust1.id, 'sigref1', proposer.id);
    await svc.submitSignature(tx.id, cust2.id, 'sigref2', cust2User.id);

    // Execute transaction
    const exec = await svc.executeTransaction(tx.id, proposer.id);
    expect(exec.ok).toBe(true);

    // Verify treasury transaction status
    const txAfter = await prisma.treasuryTransaction.findUnique({ where: { id: tx.id } });
    expect(txAfter?.status).toBe('EXECUTED');

    // Verify resource ledger entry
    const assets = await prisma.resourceLedger.findMany({ where: { seed_cell_id: seed.id, asset_type: 'LAND' } });
    expect(assets.length).toBeGreaterThanOrEqual(1);

    // Verify seed cell state transitioned
    const seedAfter = await prisma.seedCell.findUnique({ where: { id: seed.id } });
    expect(seedAfter?.protocol_state).toBe('STATE_3_LAND_EXECUTION');
  });

  it('rejects execution when insufficient signatures', async () => {
    const proposer = await prisma.user.create({ data: { auth_user_id: 'land_prop2', display_name: 'LandProp2', status: 'ACTIVE' } });
    const seed = await prisma.seedCell.create({ data: { name: 'Land Seed 2', protocol_state: 'STATE_2_LAND_GATE' } });
    const proposerMember = await prisma.seedCellMember.create({ data: { seed_cell_id: seed.id, user_id: proposer.id, membership_status: 'ACTIVE' } });
    const proposal = await prisma.proposal.create({ data: { seed_cell_id: seed.id, proposer_id: proposer.id, title: 'Acquire Land 2' } });
    const la = await prisma.landAcquisition.create({ data: { proposal_id: proposal.id, seed_cell_id: seed.id, location_description: 'Test Plot 2', acreage: 5, purchase_price: 500 } });
    const dd = await prisma.dueDiligence.create({ data: { proposal_id: proposal.id, seed_cell_id: seed.id, uploader_id: proposer.id, file_reference: 'doc2.pdf', file_hash: 'hash2', verified: true, verified_by: proposer.id, verified_at: new Date() } });
    await prisma.treasuryAccount.create({ data: { seed_cell_id: seed.id, gross_balance: 1000, deployable_balance: 1000, currency: 'USD' } });
    const tx = await prisma.treasuryTransaction.create({ data: { seed_cell_id: seed.id, proposal_id: proposal.id, amount: 800, currency: 'USD', destination: 'vendor_2', transaction_type: 'LAND_PURCHASE', status: 'PENDING', required_signatures: 2, collected_signatures: 0, governance_approval_reference: 'gov_approved' } });

    const cust1 = await prisma.custodian.create({ data: { seed_cell_id: seed.id, display_name: 'OnlyCust' } });
    const svc = new (require('../services/multisig.service').MultisigService)();
    // submit only one signature
    await svc.submitSignature(tx.id, cust1.id, 'sigref_only', proposer.id);

    let thrown = false;
    try {
      await svc.executeTransaction(tx.id, proposer.id);
    } catch (err: any) {
      thrown = true;
      expect(err.message).toMatch(/Insufficient custodian signatures/);
    }
    expect(thrown).toBe(true);
  });

  it('rejects execution when due diligence missing', async () => {
    const proposer = await prisma.user.create({ data: { auth_user_id: 'land_prop3', display_name: 'LandProp3', status: 'ACTIVE' } });
    const seed = await prisma.seedCell.create({ data: { name: 'Land Seed 3', protocol_state: 'STATE_2_LAND_GATE' } });
    const proposerMember = await prisma.seedCellMember.create({ data: { seed_cell_id: seed.id, user_id: proposer.id, membership_status: 'ACTIVE' } });
    const proposal = await prisma.proposal.create({ data: { seed_cell_id: seed.id, proposer_id: proposer.id, title: 'Acquire Land 3' } });
    const la = await prisma.landAcquisition.create({ data: { proposal_id: proposal.id, seed_cell_id: seed.id, location_description: 'Test Plot 3', acreage: 2, purchase_price: 200 } });
    await prisma.treasuryAccount.create({ data: { seed_cell_id: seed.id, gross_balance: 500, deployable_balance: 500, currency: 'USD' } });
    const tx = await prisma.treasuryTransaction.create({ data: { seed_cell_id: seed.id, proposal_id: proposal.id, amount: 200, currency: 'USD', destination: 'vendor_3', transaction_type: 'LAND_PURCHASE', status: 'PENDING', required_signatures: 1, collected_signatures: 0, governance_approval_reference: 'gov_approved' } });
    const cust1 = await prisma.custodian.create({ data: { seed_cell_id: seed.id, display_name: 'CustMissingDD' } });
    const svc = new (require('../services/multisig.service').MultisigService)();
    await svc.submitSignature(tx.id, cust1.id, 'sigdd', proposer.id);

    let thrown = false;
    try {
      await svc.executeTransaction(tx.id, proposer.id);
    } catch (err: any) {
      thrown = true;
      expect(err.message).toMatch(/Due diligence not completed/);
    }
    expect(thrown).toBe(true);
  });

  it('rejects execution when insufficient deployable capital', async () => {
    const proposer = await prisma.user.create({ data: { auth_user_id: 'land_prop4', display_name: 'LandProp4', status: 'ACTIVE' } });
    const seed = await prisma.seedCell.create({ data: { name: 'Land Seed 4', protocol_state: 'STATE_2_LAND_GATE' } });
    const proposerMember = await prisma.seedCellMember.create({ data: { seed_cell_id: seed.id, user_id: proposer.id, membership_status: 'ACTIVE' } });
    const proposal = await prisma.proposal.create({ data: { seed_cell_id: seed.id, proposer_id: proposer.id, title: 'Acquire Land 4' } });
    const la = await prisma.landAcquisition.create({ data: { proposal_id: proposal.id, seed_cell_id: seed.id, location_description: 'Test Plot 4', acreage: 20, purchase_price: 2000 } });
    const dd = await prisma.dueDiligence.create({ data: { proposal_id: proposal.id, seed_cell_id: seed.id, uploader_id: proposer.id, file_reference: 'doc4.pdf', file_hash: 'hash4', verified: true, verified_by: proposer.id, verified_at: new Date() } });
    // treasury account with insufficient deployable_balance
    await prisma.treasuryAccount.create({ data: { seed_cell_id: seed.id, gross_balance: 100, deployable_balance: 100, currency: 'USD' } });
    const tx = await prisma.treasuryTransaction.create({ data: { seed_cell_id: seed.id, proposal_id: proposal.id, amount: 1500, currency: 'USD', destination: 'vendor_4', transaction_type: 'LAND_PURCHASE', status: 'PENDING', required_signatures: 1, collected_signatures: 0, governance_approval_reference: 'gov_approved' } });
    const cust1 = await prisma.custodian.create({ data: { seed_cell_id: seed.id, display_name: 'CustInsuff' } });
    const svc = new (require('../services/multisig.service').MultisigService)();
    await svc.submitSignature(tx.id, cust1.id, 'sigbig', proposer.id);

    let thrown = false;
    try {
      await svc.executeTransaction(tx.id, proposer.id);
    } catch (err: any) {
      thrown = true;
      expect(err.message).toMatch(/Insufficient deployable capital/);
    }
    expect(thrown).toBe(true);
  });
});
