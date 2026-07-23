import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HelpDisclosure } from './HelpDisclosure'

describe('HelpDisclosure', () => {
  it('opens without activating its host, then closes and restores summary focus', () => {
    const hostClick = vi.fn()
    const view = render(
      <div onClick={hostClick}>
        <HelpDisclosure label="Explain configured access">
          <p>Deployment-owned help.</p>
        </HelpDisclosure>
      </div>,
    )
    const summary = view.getByLabelText('Explain configured access')
    const details = summary.closest('details')

    expect(details).toHaveStyle({ margin: '0 0 0 0.4rem' })
    expect(view.container.querySelector('style')).toHaveTextContent(
      'summary::-webkit-details-marker',
    )

    fireEvent.click(summary)
    expect(details).toHaveAttribute('open')
    expect(hostClick).not.toHaveBeenCalled()
    expect(view.getByRole('note')).toHaveTextContent('Deployment-owned help.')

    const closeButton = view.getByRole('button', { name: 'Close' })
    expect(closeButton.parentElement).toHaveStyle({
      display: 'flex',
      justifyContent: 'flex-end',
    })
    fireEvent.click(closeButton)
    expect(details).not.toHaveAttribute('open')
    expect(summary).toHaveFocus()
    expect(hostClick).not.toHaveBeenCalled()
  })
})
