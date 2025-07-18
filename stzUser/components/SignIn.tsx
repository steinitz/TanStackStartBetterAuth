import * as v from 'valibot'
import {type SyntheticEvent, useState} from 'react'
import {Link, useNavigate} from '@tanstack/react-router'
import {signIn} from '~stzUser/lib/auth-client'
import {PasswordInput} from "~stzUtils/components/InputFields";
import {FormFieldError} from "~stzUtils/components/FormFieldError";
import {niceValidationIssues, sharedFormSubmission} from "~stzUser/lib/form";

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
  password: v.pipe(v.string(), v.nonEmpty('password required')),
});

export const SignIn = () => {
  const navigate = useNavigate()

  const [validationIssues, setValidationIssues] = useState<any>({})
  const validateFormFields = (fields: SignInData) => {
    const valibotResult = v.safeParse(
    SignupSchema,
    fields,
    {abortPipeEarly: true} // max one issue per key
    )
    if (!valibotResult.success) {
      setValidationIssues(niceValidationIssues(valibotResult))
    }
    return valibotResult.success
  }

  const doSignIn = async (
    {email, password}: SignInData
  ) => {
    console.log('doSignin call to signIn.email()\n', {email, password})

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
          console.log('signin.email - onRequest', {ctx})
        },
        onSuccess: async (ctx) => {
          console.log('signin.email - onSuccess', {ctx})
          window.location.href = '/' // TanStack navigation doesn't work here
        },
        onError: (ctx) => {
          if(ctx.error.status === 403) {
            alert("Please check your email inbox for a link to verify your email address")
          }
          else {
            alert(ctx.error.message)
          }
          console.log({ctxError: ctx.error.message})
       },
      }
    )
    console.log({data, error})
  }

  const handleSignIn = async (event: SyntheticEvent<HTMLFormElement>) => {
    const fields = sharedFormSubmission(event);
    const isValid = validateFormFields(fields)

    if (isValid) {
      await doSignIn(fields)
      navigate({to: '/'})
    }
  }

  return (
    <section>
      <form onSubmit={handleSignIn}>
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
          <button type="submit">Sign In</button>
        </div>
        <details>
          <summary>Can't sign in?</summary>
          <p>Create an account <Link to="/auth/signup">Sign Up</Link></p>
          <p>Forgot password?&nbsp;
            <Link to={`/auth/requestPasswordReset`}>
              Reset Password
            </Link>
          </p>
        </details>
      </form>
    </section>
  )
}

