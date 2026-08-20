import { Injectable } from '@nestjs/common';
import { prisma } from '../db/prisma.service';

@Injectable()
export class ProjectsService {
  // Create project linked to a proposal
  async createProject(data: any) {
    const { seed_cell_id, proposal_id, project_type, name, description, budget, infrastructure_type } = data;
    if (!seed_cell_id || !proposal_id || !project_type || !name) throw new Error('Missing fields');

    // Ensure proposal exists and is APPROVED (basic check)
    const proposal = await prisma.proposal.findUnique({ where: { id: proposal_id } });
    if (!proposal) throw new Error('Proposal not found');
    if (proposal.status !== 'APPROVED' && proposal.status !== 'FUNDED') throw new Error('Proposal not approved or funded');

    // Create project
    const project = await prisma.project.create({ data: { seed_cell_id, proposal_id, project_type, name, description, status: 'FUNDED', budget: budget || 0, infrastructure_type } });

    await prisma.auditLog.create({ data: { actor_id: proposal.proposer_id, action: 'create_project', entity_type: 'project', entity_id: project.id, new_state: project.status } });

    return project;
  }

  // Record infrastructure asset commissioning
  async recordInfrastructure(seedCellId: string, projectId: string, assetType: string, assetRef: string, capacity: any, metadata: any) {
    const asset = await prisma.infrastructureAsset.create({ data: { seed_cell_id: seedCellId, project_id: projectId, asset_type: assetType, asset_reference: assetRef, capacity: capacity || {}, metadata: metadata || {}, status: 'OPERATIONAL', commissioning_date: new Date() } });

    await prisma.resourceLedger.create({ data: { seed_cell_id: seedCellId, asset_type: assetType, asset_reference: asset.id, description: `Commissioned ${assetType}`, metadata: metadata || {} } });

    await prisma.auditLog.create({ data: { action: 'record_infrastructure', entity_type: 'infrastructure_asset', entity_id: asset.id, new_state: 'OPERATIONAL' } });

    return asset;
  }
}
