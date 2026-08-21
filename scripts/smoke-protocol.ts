import { ProtocolStateService } from '../src/protocol-state/protocol-state.service';

(async () => {
  const svc = new ProtocolStateService();
  console.log('ProtocolStateService loaded');
  // simple smoke test
  const r = await svc.canContribute('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');
  console.log('canContribute result', r);
})();
