import { act, fireEvent, render } from '@testing-library/react'
import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Dialog, makeDialogRef, type DialogRefType } from './Dialog'

// What Escape does to a modal <dialog>: the browser closes it, then fires close.
const closeAsTheBrowserDoes = (dialog: HTMLDialogElement) => {
  dialog.removeAttribute('open')
  dialog.dispatchEvent(new Event('close'))
}

describe('Dialog', () => {
  it('opens a native modal while isOpen is true', () => {
    const view = render(<Dialog isOpen onCancel={() => {}}><p>Hello</p></Dialog>)

    const dialog = view.container.querySelector('dialog')!
    expect(dialog.open).toBe(true)
    expect(dialog).toContainElement(view.getByText('Hello'))
  })

  it('tells the caller when the browser closes it', () => {
    const onCancel = vi.fn()
    const view = render(<Dialog isOpen onCancel={onCancel}><p>Hello</p></Dialog>)

    closeAsTheBrowserDoes(view.container.querySelector('dialog')!)

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('reports nothing for its own close, StrictMode included', () => {
    const onCancel = vi.fn()
    const view = render(
      <StrictMode>
        <Dialog isOpen onCancel={onCancel}><p>Hello</p></Dialog>
      </StrictMode>,
    )
    expect(view.container.querySelector('dialog')!.open).toBe(true)

    view.rerender(
      <StrictMode>
        <Dialog isOpen={false} onCancel={onCancel}><p>Hello</p></Dialog>
      </StrictMode>,
    )

    expect(view.container.querySelector('dialog')).toBeNull()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('in ref mode, closes itself when the browser closes it', () => {
    let dialogRef: DialogRefType | undefined
    function Harness() {
      dialogRef = makeDialogRef()
      return <Dialog ref={dialogRef}><p>Hello</p></Dialog>
    }
    const view = render(<Harness />)
    act(() => dialogRef!.current!.setIsOpen(true))

    act(() => closeAsTheBrowserDoes(view.container.querySelector('dialog')!))

    expect(view.container.querySelector('dialog')).toBeNull()
  })

  it('focuses the button its caller marked as the default', () => {
    const view = render(
      <Dialog isOpen onCancel={() => {}}>
        <input type="checkbox" />
        <button>Cancel</button>
        <button data-autofocus>Ask</button>
      </Dialog>,
    )

    expect(view.getByText('Ask')).toHaveFocus()
  })

  it('keeps key presses from reaching the page behind', () => {
    const onWindowKey = vi.fn()
    window.addEventListener('keydown', onWindowKey)
    const view = render(<Dialog isOpen onCancel={() => {}}><button>Inside</button></Dialog>)

    fireEvent.keyDown(view.getByText('Inside'), { key: 'Enter' })

    window.removeEventListener('keydown', onWindowKey)
    expect(onWindowKey).not.toHaveBeenCalled()
  })
})
