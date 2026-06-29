/**
 * Extract human-readable message from any thrown value.
 * Handles Error instances, Supabase PostgrestError (plain object with .message),
 * and unknown shapes. Falls back to the provided default.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message: unknown }).message
    if (typeof m === 'string' && m.trim()) return m
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}
