import { Injectable } from '@nestjs/common';
import { prisma } from '../db/prisma.service';
import nacl from 'tweetnacl';
import { decodeBase64, decodeUTF8 } from 'tweetnacl-util';

@Injectable()
export class MultisigService {
  // Assign custodians to a seed cell (requires a public_key in base64 format)
  async assignCustodians(seedCellId: string, custodians: Array<{ user_id?: string; display_name?: string; public_key?: string }>) {
    const created: any[] = [];
    for (const c of custodians) {
      const rec = await prisma.custodian.create({ data: { seed_cell_id: seedCellId, user_id: c.user_id || null, display_name: c.display_name || c.user_id, public_key: c.public_key || null } });
      created.push(rec);
      await prisma.auditLog.create({ data: { actor_id: c.user_id || null, action: 'assign_custodian', entity_type: 'custodian', entity_id: rec.id, new_state: 'ACTIVE' } });
    }
    return created;
  }

  // Submit a custodian signature for a transaction (signature must be base64 of nacl.sign.detached over the transaction id bytes)
  async submitSignature(transactionId: string, custodianId: string, signatureReference: string, submittedByUserId?: string) {
    // Verify transaction exists
    const tx = await prisma.treasuryTransaction.findUnique({ where: { id: transactionId } });
    if (!tx) throw new Error('Transaction not found');

    // Verify custodian belongs to the same seed cell and is active
    const cust = await prisma.custodian.findUnique({ where: { id: custodianId } });
    if (!cust) throw new Error('Custodian not found');
    if (cust.seed_cell_id !== tx.seed_cell_id) throw new Error('Custodian not assigned to this Seed Cell');
    if (cust.status !== 'ACTIVE') throw new Error('Custodian not active');
    if (!cust.public_key) throw new Error('Custodian public_key not set');

    // Prevent duplicate signatures (DB unique constraint exists). Check first
    const exists = await prisma.treasurySignature.findFirst({ where: { transaction_id: transactionId, custodian_id: custodianId } });
    if (exists) throw new Error('Signature already submitted by this custodian');

    // Verify signature: custodian must sign the transaction id bytes using nacl.sign.detached (ed25519)
    let signatureValid = false;
    try {
      const messageBytes = decodeUTF8(transactionId);
      const publicKeyBytes = decodeBase64(cust.public_key);
      const signatureBytes = decodeBase64(signatureReference);
      signatureValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes as Uint8Array);
    } catch (err) {
      signatureValid = false;
    }

    const signatureStatus = signatureValid ? 'VALID' : 'INVALID';

    if (!signatureValid) {
      // Record invalid signature attempt
      const sigRec = await prisma.treasurySignature.create({ data: { transaction_id: transactionId, custodian_id: custodianId, signature_reference: signatureReference, signature_timestamp: new Date(), signature_status: 'INVALID', verification_reference: null } });
      await prisma.auditLog.create({ data: { actor_id: submittedByUserId || cust.user_id, action: 'submit_signature_invalid', entity_type: 'treasury_transaction', entity_id: transactionId, new_state: 'INVALID_SIGNATURE' } });
      throw new Error('Signature verification failed');
    }

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
