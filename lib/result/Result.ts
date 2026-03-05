/**
 * Result<T> — Railway-Oriented Success/Failure Monad
 *
 * Every service boundary returns Result<T> instead of throwing.
 * Failure modes become explicit and composable.
 */

// ─── Error catalogue ─────────────────────────────────────────────────────────

export const ErrorCode = {
  NOT_FOUND: "NOT_FOUND",
  UPSTREAM_ERROR: "UPSTREAM_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  CIRCUIT_OPEN: "CIRCUIT_OPEN",
  RATE_LIMITED: "RATE_LIMITED",
  TIMEOUT: "TIMEOUT",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ─── Error shape ─────────────────────────────────────────────────────────────

export interface ServiceError {
  code: ErrorCode;
  message: string;
  cause?: unknown;
}

// ─── Discriminated union ─────────────────────────────────────────────────────

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: ServiceError };

// ─── Factory helpers ─────────────────────────────────────────────────────────

function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

function fail<T = never>(error: ServiceError): Result<T> {
  return { ok: false, error };
}

async function fromAsync<T>(
  fn: () => Promise<T>,
  onError: (e: unknown) => ServiceError
): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    return fail(onError(e));
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const Result = {
  ok,
  fail,
  fromAsync,
} as const;