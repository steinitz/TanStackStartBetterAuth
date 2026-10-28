import '@testing-library/jest-dom'

// jsdom has no showModal or close on <dialog>, and stzUtils' Dialog is a native one. Configurable,
// so a test file may define or assign its own. Guarded for test files that run without a DOM.
if (typeof HTMLDialogElement !== 'undefined') {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    writable: true,
    value: function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    writable: true,
    value: function close(this: HTMLDialogElement) {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    },
  })
}

declare module 'vitest' {
  interface ProvidedContext {
    dbLocked: boolean
  }
}
