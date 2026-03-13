import { CryptoManager } from './crypto';
test('crypto encryption', () => {
  const c = new CryptoManager({enabled: true, maxRetries: 1, timeoutMs: 50});
  expect(c).toBeDefined();
});
