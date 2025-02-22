import * as v from 'valibot'
import {type SyntheticEvent, useState} from 'react'
import {useNavigate} from '@tanstack/react-router'
import {signIn, forgetPassword} from '~/lib/auth-client'
import {Spacer} from '~/components/Spacer'
import {PasswordInput} from "~/components/InputFields";
import {FormFieldError} from "~/components/FormFieldError";
import {fieldsFromFormData} from "~/lib/form";

// TypeScript - sugggested by Valibot docs, and comes in handy later
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
    let isValid = true;

    try {
      const valibotResult = v.parse(
        SignupSchema,
        fields,
        {abortPipeEarly: true} // ensures each key, e.g. email, has only one error message
      )
      console.log('signup call to signUp.email()\n', {valibotResult})
    } catch (error: any) { /*: ValiError<typeof SignupSchema>*/
      const flattenedIssues = v.flatten<typeof SignupSchema>(error.issues)
      setValidationIssues(flattenedIssues?.nested ?? {})
      isValid = false
    }

    return isValid
  }

  const doSignIn = async ({email, password}: SignInData) => {
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

  const handleSignIn = (event: SyntheticEvent<HTMLFormElement>) => {
    // prevent default form submission behavior
    event.preventDefault();
    event.stopPropagation();
    const formData = new FormData(event.currentTarget);
    const fields = fieldsFromFormData(formData) as SignInData

    console.log( 'handleSignIn', {fields})
    const isValid = validateFormFields(fields)
    // console.log( 'handleSignUp', {isValid})

    if (isValid) doSignIn(fields)
  }

  return (
     <>
      <section>
        <form onSubmit={handleSignIn}>
          <h1>Sign In</h1>
          <label>Email
            <input
              name="email"
              type="email"
              defaultValue={""}
            />
            <FormFieldError message={validationIssues?.email}/>
          </label>
          <PasswordInput
            validationIssue={validationIssues?.password}
          />
          <button type="submit">Sign In</button>
        </form>
      </section>
      <Spacer />
      <section>
        <h3>No Account?</h3>
        <Spacer orientation='horizontal' />
        <button
          type={"submit"}
          onClick={() => {
            navigate({to: '/auth/signup'})
          }}
        >
          Sign Up
        </button>
      </section>
      <Spacer />
      <section>
        <h3>Forgot Password?</h3>
        <Spacer orientation='horizontal' />
        <button
          type={"submit"}
          onClick={async () => {
            const { data, error } = await forgetPassword({
              email: "f@stzdev.com",
              redirectTo: "/auth/passwordReset",
            });
          }}
        >
          Reset Password
        </button>
      </section>
    </>
  )
}

