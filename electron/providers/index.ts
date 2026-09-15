import { MockMusicProvider } from './mock';
import { NeteaseMusicProvider } from './netease';
import { ProviderRegistry } from './registry';

export function createProviderRegistry() {
  const registry = new ProviderRegistry();
  registry.register(new MockMusicProvider());
  registry.register(new NeteaseMusicProvider());
  return registry;
}

export { ProviderRegistry } from './registry';
