import { useEffect } from 'react'

/**
 * Approved escape hatch for syncing with external systems on mount
 * (timers, DOM APIs, third-party widgets). Equivalent to useEffect(fn, [])
 * but signals intent clearly and avoids the raw useEffect dependency-array footgun.
 * The rule is Rule 4 of ChessHurdles' architecture/BanningUseEffect.md, whose
 * src/lib copy this is.
 */
export function useMountEffect(effect: () => void | (() => void)) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, [])
}
