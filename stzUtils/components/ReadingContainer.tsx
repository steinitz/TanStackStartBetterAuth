import type { ReactNode } from 'react'

/**
 * The widest a page that is read, rather than used, may grow: terms, privacy, help. A line of
 * text past this is hard to follow back to its start. 610px, a Fibonacci number, Steve,
 * 2026-10-01, after 800px read too wide; tune it here and every such page follows.
 */
export const READING_WIDTH = '610px' // Fibonacci width

/**
 * A centred column for reading pages. Below READING_WIDTH it is the full width it is given, so a
 * phone sees no change. Wrap a whole page, at its route or its layout route, so the pages
 * themselves never need to know.
 */
export const ReadingContainer = ({ children }: { children: ReactNode }) => (
  <div style={{ width: '100%', maxWidth: READING_WIDTH, marginInline: 'auto' }}>{children}</div>
)
