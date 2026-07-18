import type { MusicProviderId, ProviderErrorPayload } from '../../src/shared/music/providers';

export class ProviderError extends Error {
  constructor(
    readonly providerId: MusicProviderId,
    readonly code: ProviderErrorPayload['code'],
    message: string,
    readonly retryable = false,
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = 'ProviderError';
  }

  toPayload(): ProviderErrorPayload {
    return {
      providerId: this.providerId,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      retryAfterMs: this.retryAfterMs,
    };
  }
}
