/**
 * Reading her ledger on the Credits page.
 *
 * A row's description is its price's label alone, and what it took sits in its own Amount cell,
 * so a spec asks for the rows of one kind, and optionally for the amount they carry.
 */
import type { Locator, Page } from '@playwright/test'

/**
 * Her ledger rows whose description is exactly `label`, and, given an amount, only those showing
 * it — a charge as a negative number, as the page shows it.
 */
export function ledgerRows(page: Page, label: string, amount?: number): Locator {
  const rows = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: label, exact: true }) })
  if (amount === undefined) return rows
  return rows.filter({ has: page.getByRole('cell', { name: String(amount), exact: true }) })
}
