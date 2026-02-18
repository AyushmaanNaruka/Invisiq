import type { ProviderID } from './types';

// ══════════════════════════════════════
//  ERROR CODE REGISTRY
// ══════════════════════════════════════

export enum GhostAIError {
  // Provider Errors (1xxx)
  PROVIDER_AUTH_FAILED = 'E1001',
  PROVIDER_RATE_LIMITED = 'E1002',
  PROVIDER_QUOTA_EXCEEDED = 'E1003',
  PROVIDER_MODEL_NOT_FOUND = 'E1004',
  PROVIDER_CONTEXT_TOO_LONG = 'E1005',
  PROVIDER_SERVER_ERROR = 'E1006',
  PROVIDER_TIMEOUT = 'E1007',
  PROVIDER_STREAM_ERROR = 'E1008',
  PROVIDER_CONTENT_FILTERED = 'E1009',

  // Screenshot Errors (2xxx)
  SCREENSHOT_CAPTURE_FAILED = 'E2001',
  SCREENSHOT_REGION_CANCEL = 'E2002',
  SCREENSHOT_NO_DISPLAY = 'E2003',
  SCREENSHOT_PERMISSION = 'E2004',

  // Storage Errors (3xxx)
  STORE_READ_FAILED = 'E3001',
  STORE_WRITE_FAILED = 'E3002',
  STORE_ENCRYPTION_FAILED = 'E3003',
  STORE_CORRUPTED = 'E3004',

  // Hotkey Errors (4xxx)
  HOTKEY_REGISTER_FAILED = 'E4001',
  HOTKEY_CONFLICT = 'E4002',
  HOTKEY_INVALID_FORMAT = 'E4003',

  // System Errors (5xxx)
  SYSTEM_NO_INTERNET = 'E5001',
  SYSTEM_PROTECTION_FAILED = 'E5002',
  SYSTEM_UNSUPPORTED_OS = 'E5003',
}

// ══════════════════════════════════════
//  ERROR RESPONSE FORMAT
// ══════════════════════════════════════

export interface GhostAIErrorResponse {
  code: GhostAIError;
  message: string;
  details?: string;
  retryable: boolean;
  retryAfterMs?: number;
  action?: 'switch-model' | 'add-key' | 'check-settings' | 'retry';
}

// ══════════════════════════════════════
//  PROVIDER ERROR MAPPER
// ══════════════════════════════════════

export function mapProviderError(
  _provider: ProviderID,
  status: number,
  body?: Record<string, unknown>
): GhostAIErrorResponse {
  // HTTP 401 — Invalid API key
  if (status === 401) {
    return {
      code: GhostAIError.PROVIDER_AUTH_FAILED,
      message: 'Invalid API key. Please check your key in Settings.',
      retryable: false,
      action: 'add-key',
    };
  }

  // HTTP 429 — Rate limited
  if (status === 429) {
    const retryAfter = 60000; // Default 60s
    return {
      code: GhostAIError.PROVIDER_RATE_LIMITED,
      message: 'Rate limit exceeded. Please wait before trying again.',
      retryable: true,
      retryAfterMs: retryAfter,
      action: 'retry',
    };
  }

  // HTTP 400 — Context too long or invalid request
  if (status === 400) {
    const errorType = (body?.error as Record<string, unknown>)?.type;
    if (errorType === 'invalid_request_error') {
      return {
        code: GhostAIError.PROVIDER_CONTEXT_TOO_LONG,
        message: 'Input too long for this model. Try a model with a larger context window.',
        retryable: false,
        action: 'switch-model',
      };
    }
    return {
      code: GhostAIError.PROVIDER_SERVER_ERROR,
      message: 'Bad request. Please try again.',
      details: JSON.stringify(body),
      retryable: false,
    };
  }

  // HTTP 403 — Quota exceeded or permission denied
  if (status === 403) {
    return {
      code: GhostAIError.PROVIDER_QUOTA_EXCEEDED,
      message: 'API quota exceeded or access denied.',
      retryable: false,
      action: 'check-settings',
    };
  }

  // HTTP 404 — Model not found
  if (status === 404) {
    return {
      code: GhostAIError.PROVIDER_MODEL_NOT_FOUND,
      message: 'Model not found. It may have been deprecated.',
      retryable: false,
      action: 'switch-model',
    };
  }

  // HTTP 5xx — Server error
  if (status >= 500) {
    return {
      code: GhostAIError.PROVIDER_SERVER_ERROR,
      message: 'AI provider server error. Please try again in a moment.',
      retryable: true,
      retryAfterMs: 5000,
      action: 'retry',
    };
  }

  // Default
  return {
    code: GhostAIError.PROVIDER_SERVER_ERROR,
    message: `Unexpected error (HTTP ${status}).`,
    details: JSON.stringify(body),
    retryable: true,
    action: 'retry',
  };
}
