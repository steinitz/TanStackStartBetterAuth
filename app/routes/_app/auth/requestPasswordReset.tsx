import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { FormFieldError } from '~/components/FormFieldError'
import { SyntheticEvent, useState } from 'react'
import {niceValidationIssues, sharedFormSubmission} from '~/lib/form'
import * as v from 'valibot'
import { forgetPassword } from '~/lib/auth-client'
import {Spacer} from "~/components/Spacer";

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

export const SetNewPassword = () => {
  const navigate = useNavigate()

  const [validationIssues, setValidationIssues] = useState<any>({})
  const validateFormFields = (fields: PasswordResetData) => {
    // let isValid = true
    // try {
    //   const valibotResult = v.parse(
    //     PasswordResetSchema,
    //     fields,
    //     // ensure each key, e.g. password, has only one error message
    //     { abortPipeEarly: true },
    //   )
    //   console.log('validating email\n', { valibotResult })
    // } catch (error: any) {
    //   const flattenedIssues = v.flatten<typeof PasswordResetSchema>(
    //     error.issues,
    //   )
    //   setValidationIssues(flattenedIssues?.nested ?? {})
    //   isValid = false
    // }
    //
    // return isValid
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
    console.log('handlePasswordReset', { email })

    const isValid = validateFormFields(fields as PasswordResetData)
    console.log('handlePasswordReset', { isValid })

    if (isValid) {
      /*const {data, error} = */ await forgetPassword({
        email,
        redirectTo: '/auth/setNewPassword',
      })
    }
  }

  return (
    <>
      <div>
        <h1>Reset Password</h1>
      </div>
      <section>
        <form onSubmit={handlePasswordReset}>
          <label>
            Email
            <input
              name="email"
              type="email"
              defaultValue={''}
              autoComplete="on"
            />
            <FormFieldError message={validationIssues?.email} />
          </label>
          <button type="submit">Reset Password</button>
        </form>
         <form>
          <h1>Account Created</h1>
          <p>We've sent an password-reset link to</p>
          <p style={{marginLeft: '4rem'}}>{email}</p>
          <p>Please check your email inbox and follow the instructions</p>
          <Spacer space={2} />
          <div style={{textAlign: "right"}}>
            <button
              type="submit"
              onClick={() => navigate({to: "/"})}
            >
              Ok
            </button>
          </div>
        </form>
      </section>
     <button type={'submit'}>Index - for troubleshooting, remove</button>
    </>
  )
}

export const Route = createFileRoute('/_app/auth/requestPasswordReset')({
  component: SetNewPassword,
  // loader: async () => await getCount(),
})
