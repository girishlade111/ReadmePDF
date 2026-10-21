/**
 * Shared error helpers.
 *
 * Network and parsing failures carry a stable `.code` so the UI can show an
 * actionable message instead of a raw exception. Extra fields such as
 * `status`, `path`, and `retryable` are safe to expose to the interface.
 */

export function githubError(code, message, extra = {}) {
  const err = new Error(message);
  err.name = 'GithubError';
  err.code = code;
  Object.assign(err, extra);
  return err;
}

export function isAbortError(err) {
  return (
    err?.name === 'AbortError' ||
    err?.code === 'ABORT_ERR' ||
    err?.code === 'CANCELLED'
  );
}

export function cancelledError(message = 'Request cancelled.') {
  return githubError('CANCELLED', message);
}

export function toError(value) {
  if (value instanceof Error) return value;
  return new Error(String(value ?? 'Unknown error'));
}
