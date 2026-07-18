"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRegistry = void 0;
const errors_1 = require("./errors");
class ProviderRegistry {
    providers = new Map();
    register(provider) {
        this.providers.set(provider.id, provider);
    }
    resolveProvider(providerId) {
        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new errors_1.ProviderError(providerId, 'NOT_IMPLEMENTED', `Provider ${providerId} is not configured.`);
        }
        return provider;
    }
    search(query) {
        try {
            const provider = this.resolveProvider(query.providerId);
            if (!provider.capabilities.search) {
                return Promise.resolve({
                    providerId: provider.id,
                    query: query.text,
                    tracks: [],
                    nextCursor: null,
                    source: provider.source,
                    error: new errors_1.ProviderError(provider.id, 'NOT_IMPLEMENTED', `Provider ${provider.id} does not support search.`, false, null).toPayload(),
                });
            }
            return provider.search(query).catch((error) => {
                const providerError = error instanceof errors_1.ProviderError
                    ? error
                    : new errors_1.ProviderError(provider.id, 'UNAVAILABLE', 'Provider request failed.', true, 5_000);
                return {
                    providerId: provider.id,
                    query: query.text,
                    tracks: [],
                    nextCursor: null,
                    source: provider.source,
                    error: providerError.toPayload(),
                };
            });
        }
        catch (error) {
            const providerError = error instanceof errors_1.ProviderError
                ? error
                : new errors_1.ProviderError(query.providerId, 'UNAVAILABLE', 'Provider registry unavailable.', true, 5_000);
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
    getTrack(reference) {
        try {
            const provider = this.resolveProvider(reference.providerId);
            if (!provider.capabilities.trackDetails) {
                return Promise.resolve({
                    providerId: reference.providerId,
                    reference,
                    track: null,
                    error: new errors_1.ProviderError(provider.id, 'NOT_IMPLEMENTED', `Provider ${provider.id} does not support track details.`, false, null).toPayload(),
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
                .catch((error) => {
                const providerError = error instanceof errors_1.ProviderError
                    ? error
                    : new errors_1.ProviderError(provider.id, 'UNAVAILABLE', 'Provider track detail request failed.', true, 5_000);
                return {
                    providerId: reference.providerId,
                    reference,
                    track: null,
                    error: providerError.toPayload(),
                };
            });
        }
        catch (error) {
            const providerError = error instanceof errors_1.ProviderError
                ? error
                : new errors_1.ProviderError(reference.providerId, 'UNAVAILABLE', 'Provider registry unavailable.', true, 5_000);
            return Promise.resolve({
                providerId: reference.providerId,
                reference,
                track: null,
                error: providerError.toPayload(),
            });
        }
    }
    getPlayableSource(reference) {
        try {
            const provider = this.resolveProvider(reference.providerId);
            if (!provider.capabilities.playableSource) {
                return Promise.resolve({
                    providerId: reference.providerId,
                    reference,
                    playableSource: null,
                    error: new errors_1.ProviderError(provider.id, 'NOT_IMPLEMENTED', `Provider ${provider.id} does not support playable-source lookup.`, false, null).toPayload(),
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
                .catch((error) => {
                const providerError = error instanceof errors_1.ProviderError
                    ? error
                    : new errors_1.ProviderError(provider.id, 'UNAVAILABLE', 'Provider playable-source request failed.', true, 5_000);
                return {
                    providerId: reference.providerId,
                    reference,
                    playableSource: null,
                    error: providerError.toPayload(),
                };
            });
        }
        catch (error) {
            const providerError = error instanceof errors_1.ProviderError
                ? error
                : new errors_1.ProviderError(reference.providerId, 'UNAVAILABLE', 'Provider registry unavailable.', true, 5_000);
            return Promise.resolve({
                providerId: reference.providerId,
                reference,
                playableSource: null,
                error: providerError.toPayload(),
            });
        }
    }
}
exports.ProviderRegistry = ProviderRegistry;
