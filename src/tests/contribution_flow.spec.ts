import { ProtocolStateService } from '../protocol-state/protocol-state.service';
import { prisma } from '../db/prisma.service';

describe('Contributions flow', () => {
  it('should reject contribution when protocol disallows', async () => {
    const svc = new ProtocolStateService();
    const r = await svc.canContribute('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');
    expect(r.allowed).toBe(false);
  });
});
