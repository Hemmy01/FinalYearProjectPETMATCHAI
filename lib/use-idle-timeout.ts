import { useEffect, useRef, useCallback } from "react"

const IDLE_MS = 28 * 60 * 1000  // 28 min before warning
const WARN_MS = 2 * 60 * 1000   // 2 min warning window

export function useIdleTimeout(onWarn: () => void, onLogout: () => void) {
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = useCallback(() => {
    if (idleRef.current) clearTimeout(idleRef.current)
    if (warnRef.current) clearTimeout(warnRef.current)
    idleRef.current = setTimeout(() => {
      onWarn()
      warnRef.current = setTimeout(onLogout, WARN_MS)
    }, IDLE_MS)
  }, [onWarn, onLogout])

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"]
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset))
      if (idleRef.current) clearTimeout(idleRef.current)
      if (warnRef.current) clearTimeout(warnRef.current)
    }
  }, [reset])

  return { reset }
}
