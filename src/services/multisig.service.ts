import { Injectable } from '@nestjs/common';
import { prisma } from '../db/prisma.service';

@Injectable()
export class MultisigService {
  // Assign custodians to a seed cell
  async assignCustodians(seedCellId: string, custodians: Array<{ user_id?: string; display_name?: string }>) {
    const created: any[] = [];
    for (const c of custodians) {
      const rec = await prisma.custodian.create({ data: { seed_cell_id: seedCellId, user_id: c.user_id || null, display_name: c.display_name || c.user_id } });
      created.push(rec);
      await prisma.auditLog.create({ data: { actor_id: c.user_id || null, action: 'assign_custodian', entity_type: 'custodian', entity_id: rec.id, new_state: 'ACTIVE' } });
    }
    return created;
  }

  // Submit a custodian signature for a transaction
  async submitSignature(transactionId: string, custodianId: string, signatureReference: string, submittedByUserId?: string) {
    // Verify transaction exists
    const tx = await prisma.treasuryTransaction.findUnique({ where: { id: transactionId } });
    if (!tx) throw new Error('Transaction not found');

    // Verify custodian belongs to the same seed cell and is active
    const cust = await prisma.custodian.findUnique({ where: { id: custodianId } });
    if (!cust) throw new Error('Custodian not found');
    if (cust.seed_cell_id !== tx.seed_cell_id) throw new Error('Custodian not assigned to this Seed Cell');
    if (cust.status !== 'ACTIVE') throw new Error('Custodian not active');

    // Prevent duplicate signatures (DB unique constraint exists). Check first
    const exists = await prisma.treasurySignature.findFirst({ where: { transaction_id: transactionId, custodian_id: custodianId } });
    if (exists) throw new Error('Signature already submitted by this custodian');

    // Server-side signature validation placeholder: in production you'd verify cryptographic signature
    const signatureStatus = 'VALID';

    const sig = await prisma.treasurySignature.create({ data: { transaction_id: transactionId, custodian_id: custodianId, signature_reference: signatureReference, signature_timestamp: new Date(), signature_status: signatureStatus } });

    // increment collected_signatures atomically
    await prisma.treasuryTransaction.update({ where: { id: transactionId }, data: { collected_signatures: { increment: 1 } } as any });

    await prisma.auditLog.create({ data: { actor_id: submittedByUserId || cust.user_id, action: 'submit_signature', entity_type: 'treasury_transaction', entity_id: transactionId, new_state: 'SIGNED' } });

    return sig;
  }

  // Execute treasury transaction with all server-side guards
  async executeTransaction(transactionId: string, executedByUserId: string) {
    // Call DB function fn_execute_treasury_transaction which enforces governance approval, signatures, deployable capital, due diligence, protocol state, and records ledger and state transition
    try {
      await prisma.$executeRaw`SELECT fn_execute_treasury_transaction(${transactionId}::uuid, ${executedByUserId}::uuid)`;
      return { ok: true };
    } catch (err: any) {
      throw new Error(`Execution failed: ${err.message}`);
    }
  }
}
