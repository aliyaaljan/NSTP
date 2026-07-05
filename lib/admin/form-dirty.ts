export function snapshotForm<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function isFormDirty<T>(initial: T, current: T): boolean {
  return JSON.stringify(initial) !== JSON.stringify(current)
}

/**
 * Load form state once per open session so parent re-renders do not
 * reset dirty tracking while the user is editing.
 */
export function shouldLoadFormSession(
  open: boolean,
  sessionKey: string | null,
  loadedSessionRef: { current: string | null }
): boolean {
  if (!open) {
    loadedSessionRef.current = null
    return false
  }
  if (!sessionKey) return false
  if (loadedSessionRef.current === sessionKey) return false
  loadedSessionRef.current = sessionKey
  return true
}

export function clearFormSession(loadedSessionRef: { current: string | null }) {
  loadedSessionRef.current = null
}
