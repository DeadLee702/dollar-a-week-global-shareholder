import { ProtocolStateService } from '../protocol-state/protocol-state.service';
import { prisma } from '../db/prisma.service';

(async function test(){
  const p = new ProtocolStateService();
  console.log('Loaded');
})();
