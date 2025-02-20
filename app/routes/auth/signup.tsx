import * as v from 'valibot'
import {type SyntheticEvent, useState} from 'react'
import {createFileRoute} from '@tanstack/react-router'
import {signUp} from '~/lib/auth-client'
import {FormFieldError} from '~/components/FormFieldError';
import {PasswordInput} from '~/components/InputFields';
import {fieldsFromFormData} from "~/lib/form";

// TypeScript - sugggested by Valibot docs, and comes in handy later
type SignupData = {
  email: string;
  password: string;
  name?: string;
};

// Valibot
const SignupSchema = v.object({
  email: v.pipe(
    v.string('email must be a string'),
    v.nonEmpty('email address required'),
    v.email('invalid email'),
  ),
  password: v.pipe(v.string(), v.nonEmpty('password required')),
  name: v.string(),
});

const thisPath = '/auth/signup'
export const Route = createFileRoute(thisPath)({
  component: SignUp,
})

export default function SignUp() {
  const [validationIssues, setValidationIssues] = useState<any>({})

  const validateFormFields = (fields: SignupData) => {
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

  const doSignUp = async (fields: SignupData) => {
    // console.log('doSignup - call to signUp.email()\n', {fields})
    const {
      // data,
      error
    } = await signUp.email(
      {
        email: fields.email,
        password: fields.password,
        name: fields.name || '',
        callbackURL: '',
        // SJS image: image ? convertImageToBase64(image) : undefined,
        // image: undefined,
      },
      {
        onRequest: (ctx) => {
          console.log('signup.email - onRequest', {ctx})
        },
        onSuccess: (ctx) => {
          console.log('signup.email - onSuccess', {ctx})

          window.location.href = '/auth/signin'
        },
        onError: (ctx) => {
          console.log('signup.email - onError', {ctxError: ctx.error.message})
        },
      },
    )
    if (error) {
      // I've seen this happen if a user already exists
      alert(error.message)
      console.log({error})
    }
  }

  const handleSignUp = (event: SyntheticEvent<HTMLFormElement>) => {
    // prevent default form submission behavior
    event.preventDefault();
    event.stopPropagation();
    const formData = new FormData(event.currentTarget);
    const fields = fieldsFromFormData(formData)

    console.log( 'handleSignUp', {fields})
    const isValid = validateFormFields(fields as SignupData)
    console.log( 'handleSignUp', {isValid})

    if (isValid) doSignUp(fields as SignupData)
  }

  return (
    <main>
      <section>
        <form onSubmit={handleSignUp}>
          <label>Email
            <input
              name="email"
              type="email"
              defaultValue={''}
            />
            <FormFieldError message={validationIssues?.email}/>
          </label>
          <label>Name
            <input
              name="name"
              type="name"
              defaultValue={''}
            />
          </label>
          <PasswordInput
            validationIssue={validationIssues?.password}
          />
          <button type="submit">Sign Up</button>
        </form>
      </section>
    </main>
  )
}
