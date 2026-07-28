import type { ReactNode } from 'react'

// mvp-css-override restores native table layout so narrow tables can fill their
// available width. This immediate parent owns the other half of that policy:
// when a table's intrinsic width is larger, scroll it here instead of allowing
// horizontal overflow to escape into the page.
export function TableViewport({ children }: { children: ReactNode }) {
  return (
    <div style={{
      margin: '0 auto',
      maxWidth: '100%',
      overflowX: 'auto',
      width: '100%',
    }}>
      {children}
    </div>
  )
}
