import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import React from 'react'

const { navigate, routerNavigate } = vi.hoisted(() => ({
  navigate: vi.fn(),
  routerNavigate: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: () => navigate,
  useRouter: () => ({ navigate: routerNavigate }),
  createFileRoute: () => () => ({}),
}))

vi.mock('~stzUser/lib/auth-client', () => ({
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  sendVerificationEmail: vi.fn(),
  resetPassword: vi.fn(),
}))

import { signIn, signUp, resetPassword } from '~stzUser/lib/auth-client'
import { SignIn } from '~stzUser/components/RouteComponents/SignIn'
import { SignUp } from '~stzUser/components/SignUp'
import { SetNewPassword } from '~stzUser/components/RouteComponents/SetNewPassword'

/**
 * The three auth controls that showed nothing during their wait. Slice 10 of the page-change
 * latency work; see Planning/2026-09-08-AuthActionIndication.
 *
 * Two properties per control, and they are different properties. The spinner is what the
 * user sees. The single request is what the ref guard is for, and a `disabled` driven by
 * state cannot provide it — disabling takes a render, and the second submit lands first.
 */

/** BusySpinner marks itself with this attribute rather than a class, so these assert on the app. */
const spinnerIn = (c: HTMLElement) => c.querySelector('button [data-busy-spinner]')

/** A promise that stays pending, so the control is caught mid-wait. */
const pending = () => new Promise(() => {})

const fill = (container: HTMLElement, values: Record<string, string>) => {
  for (const [name, value] of Object.entries(values)) {
    const input = container.querySelector<HTMLInputElement>(`input[name="${name}"]`)
    if (!input) throw new Error(`no input named ${name} — the form changed shape`)
    // React tracks its own value, so setting .value alone is not seen by the change handler.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

const submit = (container: HTMLElement) => {
  const form = container.querySelector('form')!
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

describe('auth actions say they are happening', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => vi.restoreAllMocks())

  describe('sign in', () => {
    const validCredentials = { email: 'a@b.com', password: 'Passw0rd!x' }

    it('shows the spinner on the button for the whole wait', async () => {
      vi.mocked(signIn.email).mockReturnValue(pending() as any)
      const { container } = render(<SignIn />)

      expect(spinnerIn(container)).toBeNull()
      fill(container, validCredentials)
      submit(container)

      await waitFor(() => expect(spinnerIn(container)).not.toBeNull())
    })

    it('keeps the label in the DOM while busy, so the button cannot change size', async () => {
      vi.mocked(signIn.email).mockReturnValue(pending() as any)
      const { container } = render(<SignIn />)

      fill(container, validCredentials)
      submit(container)

      await waitFor(() => expect(spinnerIn(container)).not.toBeNull())
      // Faded, not removed. Removing it would collapse the button to the spinner's width,
      // which is the whole reason the spinner is drawn over the label rather than in it.
      // Scoped to the button because the page heading says "Sign In" too.
      const button = container.querySelector('button[type="submit"]')!
      expect(button.textContent).toContain('Sign In')
    })

    it('signs in once however many times the form is submitted', async () => {
      vi.mocked(signIn.email).mockReturnValue(pending() as any)
      const { container } = render(<SignIn />)

      fill(container, validCredentials)
      // Three in one tick, which is the case a useState flag cannot catch: every handler
      // reads the state from its own render, and that render has not happened yet.
      submit(container)
      submit(container)
      submit(container)

      expect(signIn.email).toHaveBeenCalledTimes(1)
    })

    it('does not light the spinner when validation fails', async () => {
      const { container } = render(<SignIn />)

      fill(container, { email: 'not-an-email', password: '' })
      submit(container)

      await waitFor(() => expect(signIn.email).not.toHaveBeenCalled())
      expect(spinnerIn(container)).toBeNull()
    })

    it('gives the button back when sign-in fails', async () => {
      // The error, not a bare resolve. Better Auth reports a bad password by resolving with
      // an error rather than throwing, and an earlier version of this test passed `null`
      // here — which is the success shape, so it asserted the success path by accident.
      vi.mocked(signIn.email).mockResolvedValue({ data: null, error: { message: 'nope' } } as any)
      const { container } = render(<SignIn />)

      fill(container, validCredentials)
      submit(container)

      await waitFor(() => expect(signIn.email).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(spinnerIn(container)).toBeNull())
    })

    it('keeps the spinner lit after a successful sign-in, because the page is still coming', async () => {
      // doSignIn sets window.location.href, which starts a navigation and returns. Putting
      // the label back here covers the longest wait on this form with the exact silence the
      // button exists to remove; the arriving document is what takes the spinner away.
      vi.mocked(signIn.email).mockResolvedValue({ data: { user: {} }, error: null } as any)
      const { container } = render(<SignIn />)

      fill(container, validCredentials)
      submit(container)

      await waitFor(() => expect(spinnerIn(container)).not.toBeNull())
      await waitFor(() => expect(signIn.email).toHaveBeenCalledTimes(1))
      // A macrotask past the resolve, which is long past where the old release ran.
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(spinnerIn(container)).not.toBeNull()
    })
  })

  describe('set new password', () => {
    // One field, not two. `setNewPasswordSelectors` still advertises a confirmPasswordInput
    // that PasswordInput has never rendered — noted, not fixed, since it is outside this slice.
    const validPassword = { password: 'Passw0rd!x' }

    it('shows the spinner and writes the password once', async () => {
      vi.mocked(resetPassword).mockReturnValue(pending() as any)
      const { container } = render(<SetNewPassword />)

      fill(container, validPassword)
      submit(container)
      submit(container)

      await waitFor(() => expect(spinnerIn(container)).not.toBeNull())
      // Two writes against one reset token is the failure this guard exists for.
      expect(resetPassword).toHaveBeenCalledTimes(1)
    })
  })
})
