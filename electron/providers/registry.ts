import type {
  MusicProvider,
  MusicProviderId,
  ProviderTrackReference,
  ProviderTrackResult,
  ProviderSearchQuery,
  ProviderSearchResult,
  ProviderPlayableSourceResult,
} from '../../src/shared/music/providers';
import { ProviderError } from './errors';

export class ProviderRegistry {
  private readonly providers = new Map<MusicProviderId, MusicProvider>();

  register(provider: MusicProvider) {
    this.providers.set(provider.id, provider);
  }

  private resolveProvider(providerId: MusicProviderId): MusicProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new ProviderError(providerId, 'NOT_IMPLEMENTED', `Provider ${providerId} is not configured.`);
    }
    return provider;
  }

  search(query: ProviderSearchQuery): Promise<ProviderSearchResult> {
    try {
      const provider = this.resolveProvider(query.providerId);

      if (!provider.capabilities.search) {
        return Promise.resolve({
          providerId: provider.id,
          query: query.text,
          tracks: [],
          nextCursor: null,
          source: provider.source,
          error: new ProviderError(
            provider.id,
            'NOT_IMPLEMENTED',
            `Provider ${provider.id} does not support search.`,
            false,
            null,
          ).toPayload(),
        });
      }

      return provider.search(query).catch((error: unknown) => {
        const providerError =
          error instanceof ProviderError
            ? error
            : new ProviderError(provider.id, 'UNAVAILABLE', 'Provider request failed.', true, 5_000);
        return {
          providerId: provider.id,
          query: query.text,
          tracks: [],
          nextCursor: null,
          source: provider.source,
          error: providerError.toPayload(),
        };
      });
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError(query.providerId, 'UNAVAILABLE', 'Provider registry unavailable.', true, 5_000);
      return Promise.resolve({
        providerId: query.providerId,
        query: query.text,
        tracks: [],
        nextCursor: null,
        source: 'remote',
        error: providerError.toPayload(),
      });
    }
  }

  getTrack(reference: ProviderTrackReference): Promise<ProviderTrackResult> {
    try {
      const provider = this.resolveProvider(reference.providerId);
      if (!provider.capabilities.trackDetails) {
        return Promise.resolve({
          providerId: reference.providerId,
          reference,
          track: null,
          error: new ProviderError(
            provider.id,
            'NOT_IMPLEMENTED',
            `Provider ${provider.id} does not support track details.`,
            false,
            null,
          ).toPayload(),
        });
      }

      return provider
        .getTrack(reference)
        .then((track) => ({
          providerId: reference.providerId,
          reference,
          track,
          error: null,
        }))
        .catch((error: unknown) => {
          const providerError =
            error instanceof ProviderError
              ? error
              : new ProviderError(provider.id, 'UNAVAILABLE', 'Provider track detail request failed.', true, 5_000);
          return {
            providerId: reference.providerId,
            reference,
            track: null,
            error: providerError.toPayload(),
          };
        });
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError(reference.providerId, 'UNAVAILABLE', 'Provider registry unavailable.', true, 5_000);
      return Promise.resolve({
        providerId: reference.providerId,
        reference,
        track: null,
        error: providerError.toPayload(),
      });
    }
  }

  getPlayableSource(reference: ProviderTrackReference): Promise<ProviderPlayableSourceResult> {
    try {
      const provider = this.resolveProvider(reference.providerId);
      if (!provider.capabilities.playableSource) {
        return Promise.resolve({
          providerId: reference.providerId,
          reference,
          playableSource: null,
          error: new ProviderError(
            provider.id,
            'NOT_IMPLEMENTED',
            `Provider ${provider.id} does not support playable-source lookup.`,
            false,
            null,
          ).toPayload(),
        });
      }

      return provider
        .getPlayableSource(reference)
        .then((playableSource) => ({
          providerId: reference.providerId,
          reference,
          playableSource,
          error: null,
        }))
        .catch((error: unknown) => {
          const providerError =
            error instanceof ProviderError
              ? error
              : new ProviderError(
                  provider.id,
                  'UNAVAILABLE',
                  'Provider playable-source request failed.',
                  true,
                  5_000,
                );
          return {
            providerId: reference.providerId,
            reference,
            playableSource: null,
            error: providerError.toPayload(),
          };
        });
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError(reference.providerId, 'UNAVAILABLE', 'Provider registry unavailable.', true, 5_000);
      return Promise.resolve({
        providerId: reference.providerId,
        reference,
        playableSource: null,
        error: providerError.toPayload(),
      });
    }
  }
}
