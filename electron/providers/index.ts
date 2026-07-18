import { MockMusicProvider } from './mock';
import { ProviderRegistry } from './registry';

export function createProviderRegistry() {
  const registry = new ProviderRegistry();
  registry.register(new MockMusicProvider());
  return registry;
}

export { ProviderRegistry } from './registry';
