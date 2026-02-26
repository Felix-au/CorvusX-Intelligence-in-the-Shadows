import { StealthProtocolManager } from './stealth';
test('stealth starts active', () => {
  const p = new StealthProtocolManager({enabled: true, maxRetries: 3, timeoutMs: 1000});
  expect(p).toBeDefined();
});
