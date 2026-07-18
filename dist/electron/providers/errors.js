"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderError = void 0;
class ProviderError extends Error {
    providerId;
    code;
    retryable;
    retryAfterMs;
    constructor(providerId, code, message, retryable = false, retryAfterMs = null) {
        super(message);
        this.providerId = providerId;
        this.code = code;
        this.retryable = retryable;
        this.retryAfterMs = retryAfterMs;
        this.name = 'ProviderError';
    }
    toPayload() {
        return {
            providerId: this.providerId,
            code: this.code,
            message: this.message,
            retryable: this.retryable,
            retryAfterMs: this.retryAfterMs,
        };
    }
}
exports.ProviderError = ProviderError;
