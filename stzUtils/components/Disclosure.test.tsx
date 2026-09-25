import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Disclosure } from './Disclosure'

// The panel is the element holding the children. The summary is a sibling, so this finds
// the panel whatever the component wraps around it.
const panelOf = (view: ReturnType<typeof render>) =>
  view.getByText('The whole comment.').parentElement!

describe('Disclosure', () => {
  it('hangs its panel under the summary unless asked otherwise', () => {
    const view = render(
      <Disclosure summary="A comment…">
        <p>The whole comment.</p>
      </Disclosure>,
    )

    fireEvent.click(view.getByText('A comment…'))

    expect(panelOf(view)).toHaveStyle({ position: 'absolute', top: '100%' })
  })

  it('fixes its panel in the middle of the screen when centred', () => {
    const view = render(
      <Disclosure summary="A comment…" placement="center">
        <p>The whole comment.</p>
      </Disclosure>,
    )

    fireEvent.click(view.getByText('A comment…'))

    expect(panelOf(view)).toHaveStyle({
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    })
  })
})
