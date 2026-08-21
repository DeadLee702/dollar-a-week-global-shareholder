import { ProtocolStateService } from '../protocol-state/protocol-state.service';
import { prisma } from '../db/prisma.service';

export async function ensureGenesisSeedCell() {
  const existing = await prisma.seedCell.findFirst({ where: { name: 'Genesis Seed Cell (DEMO)' } });
  if (existing) return existing;
  const seed = await prisma.seedCell.create({ data: {
    name: 'Genesis Seed Cell (DEMO)', region: 'Global Demo', country_code: 'XX', local_currency: 'USD', status: 'FORMING', protocol_state: 'STATE_1_ACCUMULATION', target_members: 10000
  }});
  return seed;
}
