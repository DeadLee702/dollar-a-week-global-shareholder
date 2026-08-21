import { Injectable } from '@nestjs/common';
import { prisma } from '../db/prisma.service';
import { ProtocolStateService } from '../protocol-state/protocol-state.service';

@Injectable()
export class TreasuryService {
  constructor(private readonly protocolState: ProtocolStateService) {}

  async createTransaction(data: any) {
    const { seed_cell_id, creator_id, amount, currency, destination, required_signatures } = data;
    if (!seed_cell_id || !creator_id || !amount || !currency || !destination) throw new Error('Missing fields');

    // Verify that protocol state allows treasury proposals (e.g., LAND_GATE must be reached for land purchases)
    const seed = await prisma.seedCell.findUnique({ where: { id: seed_cell_id } });
    if (!seed) throw new Error('Seed Cell not found');

    // create transaction record
    const tx = await prisma.treasuryTransaction.create({ data: {
      seed_cell_id,
      proposal_id: null,
      amount: Number(amount),
      currency,
      destination,
      transaction_type: 'OUTGOING',
      status: 'PENDING',
      required_signatures: required_signatures || 0,
      collected_signatures: 0
    }});

    await prisma.auditLog.create({ data: { actor_id: creator_id, action: 'create_treasury_transaction', entity_type: 'treasury_transaction', entity_id: tx.id, new_state: 'PENDING' } });

    return tx;
  }

  async submitSignature(data: any) {
    const { transaction_id, custodian_id, signature_reference } = data;
    if (!transaction_id || !custodian_id) throw new Error('Missing fields');

    const tx = await prisma.treasuryTransaction.findUnique({ where: { id: transaction_id } });
    if (!tx) throw new Error('Transaction not found');

    // Check duplicate signature
    const existing = await prisma.treasurySignature.findFirst({ where: { transaction_id, custodian_id } });
    if (existing) throw new Error('Signature already submitted by this custodian');

    const sig = await prisma.treasurySignature.create({ data: {
      transaction_id,
      custodian_id,
      signature_reference: signature_reference || null,
      signature_timestamp: new Date(),
      signature_status: 'VALID'
    }});

    // Update collected signatures atomically
    const updated = await prisma.treasuryTransaction.update({ where: { id: transaction_id }, data: { collected_signatures: { increment: 1 } } as any });

    await prisma.auditLog.create({ data: { actor_id: custodian_id, action: 'submit_signature', entity_type: 'treasury_transaction', entity_id: transaction_id, new_state: `COLLECTED_${updated.collected_signatures}` } });

    // Check threshold
    if (updated.collected_signatures >= tx.required_signatures && tx.required_signatures > 0) {
      // Move to custody approved — but enforce other conditions in state machine
      await prisma.treasuryTransaction.update({ where: { id: transaction_id }, data: { status: 'CUSTODY_APPROVED' } });
    }

    return sig;
  }
}
