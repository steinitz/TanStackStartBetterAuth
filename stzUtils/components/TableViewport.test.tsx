import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TableViewport } from './TableViewport'

describe('TableViewport', () => {
  it('contains a semantic table in a full-width horizontal viewport', () => {
    const view = render(
      <TableViewport>
        <table aria-label="Example records">
          <tbody>
            <tr><td>Example</td></tr>
          </tbody>
        </table>
      </TableViewport>,
    )

    const table = view.getByRole('table', { name: 'Example records' })
    expect(table.parentElement).toHaveStyle({
      margin: '0 auto',
      maxWidth: '100%',
      overflowX: 'auto',
      width: '100%',
    })
  })
})
