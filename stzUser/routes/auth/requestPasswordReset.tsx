import {createFileRoute, useNavigate} from '@tanstack/react-router'
import {FormFieldError} from '~stzUtils/components/FormFieldError'
import {SyntheticEvent, useState} from 'react'
import {niceValidationIssues, sharedFormSubmission} from '~stzUser/lib/form'
import * as v from 'valibot'
import {forgetPassword} from '~stzUser/lib/auth-client'
import {Spacer} from "~stzUtils/components/Spacer";
import {isEmptyString} from "~stzUser/lib/utils";

// TypeScript - sugggested by Valibot docs, and comes in handy later
type PasswordResetData = {
  email: string
}

// Valibot
const PasswordResetSchema = v.object({
  email: v.pipe(
    v.string('email must be a string'),
    v.nonEmpty('email address required'),
    v.email('invalid email'),
  ),
})

export const RequestPasswordReset = () => {
  const navigate = useNavigate()

  const [validationIssues, setValidationIssues] = useState<any>({})
  const validateFormFields = (fields: PasswordResetData) => {
    const valibotResult = v.safeParse(
    PasswordResetSchema,
    fields,
    {abortPipeEarly: true} // max one issue per key
    )
    if (!valibotResult.success) {
      setValidationIssues(niceValidationIssues(valibotResult))
    }
    return valibotResult.success
  }

  const [email, setEmail] = useState('')
  const handlePasswordReset = async (
    event: SyntheticEvent<HTMLFormElement>,
  ) => {
    const fields = sharedFormSubmission(event)
    const email = fields.email as string
    setEmail(email)
    console.log('handlePasswordReset', {email})

    const isValid = validateFormFields(fields as PasswordResetData)
    console.log('handlePasswordReset', {isValid})

    if (isValid) {
      /*const {data, error} = */ await forgetPassword({
        email,
        redirectTo: '/auth/setNewPassword',
      })
    }
  }

  return (
    <>
      <section>
        {isEmptyString(email) ?
          <form onSubmit={handlePasswordReset}>
            <h1>Password Reset</h1>
            <label>
              Email
              <input
                name="email"
                type="email"
                defaultValue={''}
                autoComplete="on"
              />
              <FormFieldError message={validationIssues?.email}/>
            </label>
            <button type="submit">Reset Password</button>
          </form>
          :
          <form onSubmit={() => navigate({to: "/"})}>
            <h1>Password Reset Link Sent</h1>
            <p>We've sent a password-reset link to</p>
            <p style={{marginLeft: '4rem'}}>{email}</p>
            <p>Please check your email inbox and follow the instructions</p>
            <Spacer space={2}/>
            <div style={{textAlign: "right"}}>
              <button
                type="submit"
              >
                Ok
              </button>
            </div>
          </form>
        }
      </section>
    </>
  )
}

// Route export removed - this component is now imported by src/routes/_app/auth/requestPasswordReset.tsx
// export const Route = createFileRoute('/_app/auth/requestPasswordReset')({
//   component: RequestPasswordReset,
//   // loader: async () => await getCount(),
// })
