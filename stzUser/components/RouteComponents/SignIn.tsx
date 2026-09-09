import * as v from 'valibot'
import { type SyntheticEvent, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { signIn, sendVerificationEmail } from '~stzUser/lib/auth-client'
import { PasswordInput } from "~stzUtils/components/InputFields";
import { FormFieldError } from "~stzUtils/components/FormFieldError";
import { BusyButton } from "~stzUtils/components/BusyButton";
import { niceValidationIssues, sharedFormSubmission } from "~stzUser/lib/form";
import { requiredPasswordValidation } from '~stzUser/lib/password-validation';

// TypeScript - sugggested by Valibot docs and comes in handy later
type SignInData = {
  email: string;
  password: string;
};

// Valibot
const SignupSchema = v.object({
  email: v.pipe(
    v.string('email must be a string'),
    v.nonEmpty('email address required'),
    v.email('invalid email'),
  ),
  password: requiredPasswordValidation,
});

export const SignIn = () => {
  const navigate = useNavigate()

  const [validationIssues, setValidationIssues] = useState<any>({})
  const validateFormFields = (fields: SignInData) => {
    const valibotResult = v.safeParse(
      SignupSchema,
      fields,
      { abortPipeEarly: true } // max one issue per key
    )
    if (!valibotResult.success) {
      setValidationIssues(niceValidationIssues(valibotResult))
    }
    return valibotResult.success
  }

  const doSignIn = async (
    { email, password }: SignInData
  ) => {
    // console.log('doSignin call to signIn.email()\n', {email, password})

    const {
      data,
      error
    } = await signIn.email(
      {
        email,
        password,
        // callbackURL: '/', // doesn't seem to work anyway
      },
      {
        onRequest: async (ctx) => {
          // console.log('signin.email - onRequest', {ctx})
        },
        onSuccess: async (ctx) => {
          // console.log('signin.email - onSuccess', {ctx})
          window.location.href = '/' // TanStack navigation doesn't work here
        },
        onError: async (ctx) => {
          // Footgun: better-auth returns 403 for *several* reasons — an unverified
          // email, but also an untrusted Origin (CSRF guard) and other forbidden
          // states. Key off the error CODE, never the bare 403 status, or those
          // other failures masquerade as "needs verification" and we tell the user
          // we sent an email we never sent. (An untrusted-origin 403 cost a full
          // debugging session before this discriminator existed.)
          if (ctx.error.code === 'EMAIL_NOT_VERIFIED') {
            try {
              const { error: resendError } = await sendVerificationEmail({
                email: email,
                callbackURL: '/'
              })
              // The better-auth client resolves with { error } rather than throwing,
              // so a failed resend lands here — don't claim success on it.
              if (resendError) throw resendError
              alert(`Your account needs email verification. We've sent a new verification email to ${email}. Please check your inbox (and spam folder) and click the verification link to complete sign-in.`)
            } catch (error) {
              console.error('Error sending verification email:', error)
              alert(`Your account needs email verification, but we couldn't send a new verification email right now. Please try again shortly.`)
            }
          }
          else {
            alert(ctx.error.message)
          }
          console.log({ ctxError: ctx.error })
        },
      }
    )
    console.log({ data, error })
    // Whether she got in. The caller cannot find this out any other way: signIn.email
    // resolves rather than throwing on a bad password, so an awaited call looks identical
    // on both paths. What the caller does with it is the caller's business — this function
    // signs in and knows nothing about any button.
    return !error
  }

  // The guard is the ref; `isSigningIn` only draws. A `disabled` set from state takes a
  // render to arrive, and a second submit lands before it does — same hole found three
  // times already in this codebase, most recently in the sign-out this control copies.
  const signInInFlight = useRef(false)
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleSignIn = async (event: SyntheticEvent<HTMLFormElement>) => {
    const formFields = sharedFormSubmission(event);
    const fields: SignInData = {
      email: formFields.email as string,
      password: formFields.password as string
    };
    const isValid = validateFormFields(fields)

    // Validation failure is not a wait. Claiming before it would light the spinner for the
    // synchronous round trip through valibot and drop it again in the same frame.
    if (!isValid) return
    if (signInInFlight.current) return
    signInInFlight.current = true
    setIsSigningIn(true)

    let signedIn = false
    try {
      signedIn = await doSignIn(fields)
    } catch (error) {
      // signIn.email resolves rather than throwing, so this is the unexpected case only.
      // Left as a failure so the button comes back instead of spinning for good.
      console.error('Sign-in threw:', error)
    }

    // Kept lit on success, deliberately. doSignIn has set window.location.href, which starts
    // a navigation and then returns, so the home page is still a round trip away. Releasing
    // here would put the label back over exactly the wait this button exists to show. The
    // new document takes the spinner with the rest of the old page.
    if (signedIn) return

    // Every failure leaves her here, looking at the form, needing to press it again.
    signInInFlight.current = false
    setIsSigningIn(false)
  }

  return (
    <section>
      <form onSubmit={handleSignIn} method="POST">
        <h1>Sign In</h1>
        <label>Email
          <input
            name="email"
            type="email"
            defaultValue={""}
            autoComplete="on"
          />
          <FormFieldError message={validationIssues?.email} />
        </label>
        <PasswordInput
          validationIssue={validationIssues?.password}
        />
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
          <p style={{ maxWidth: '180px', lineHeight: 1.2, color: 'var(--color-error)' }}>
            {/*loginError ?? */' '}
          </p>
          <BusyButton type="submit" busy={isSigningIn} busyLabel="Signing in">
            Sign In
          </BusyButton>
        </div>
        <details>
          <summary>Can't sign in?</summary>
          <p>Create an account <Link to="/auth/signup">Sign Up</Link></p>
          <p>Forgot password?&nbsp;
            <Link to="/auth/requestPasswordReset">
              Reset Password
            </Link>
          </p>
        </details>
      </form>
    </section>
  )
}

