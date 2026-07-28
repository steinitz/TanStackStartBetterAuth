import '@testing-library/jest-dom'

declare module 'vitest' {
  interface ProvidedContext {
    dbLocked: boolean
  }
}
