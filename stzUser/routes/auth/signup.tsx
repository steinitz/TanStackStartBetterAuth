import * as v from 'valibot'
import {type SyntheticEvent, useState} from 'react'
import {createFileRoute, useNavigate} from '@tanstack/react-router'
import {signUp} from '~stzUser/lib/auth-client'
import {FormFieldError} from '~stzUtils/components/FormFieldError';
import {PasswordInput} from '~stzUtils/components/InputFields';
import {fieldsFromFormData} from "~stzUser/lib/form";
import {routeStrings} from '~/constants';
import {Spacer} from "~stzUtils/components/Spacer";

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

// Route export removed - this component is now imported by src/routes/_app/auth/signup.tsx
// const thisPath = '/_app/auth/signup'
// export const Route = createFileRoute(thisPath)({
//   component: SignUp,
// })

export default function SignUp() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)

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
    } catch (error: any) {/*: ValiError<typeof SignupSchema>*/
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
          setSuccess(true)
          // window.location.href = routeStrings.signin
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
    setEmail(fields.email as string)

    console.log( 'handleSignUp', {fields})
    const isValid = validateFormFields(fields as SignupData)
    console.log( 'handleSignUp', {isValid})

    if (isValid) doSignUp(fields as SignupData)
  }

  return (
    <section>
      {!success ?
      <form onSubmit={handleSignUp}>
        <label>Email
          <input
            name="email"
            type="email"
            defaultValue={''}
            autoComplete="on"
          />
          <FormFieldError message={validationIssues?.email}/>
        </label>
        <label>Name
          <input
            name="name"
            type="name"
            defaultValue={''}
            autoComplete="on"
          />
        </label>
        <PasswordInput
          validationIssue={validationIssues?.password}
        />
        <button type="submit">Sign Up</button>
      </form>
      :
        <form>
          <h1>Account Created</h1>
          <p>We've sent an email-confirmation link to</p>
          <p style={{marginLeft: '4rem'}}>{email}</p>
          <p>Please check your email inbox and follow the instructions</p>
          <Spacer space={1} />
          <Spacer />
          <div style={{textAlign: "right"}}>
            <button
              type="submit"
              onClick={() => navigate({to: "/"})}
            >
              Ok
            </button>
          </div>
        </form>

      }
    </section>
  )
}
