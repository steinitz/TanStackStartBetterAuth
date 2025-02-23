import {createFileRoute} from '@tanstack/react-router'
import {FormFieldError} from '~/components/FormFieldError'
import {SyntheticEvent, useState} from 'react'
import {sharedFormSubmission} from '~/lib/form'
import * as v from 'valibot'
import {forgetPassword} from '~/lib/auth-client'

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
  // password: v.pipe(v.string(), v.nonEmpty('password required')),
})

export const SetNewPassword = () => {
  const [validationIssues, setValidationIssues] = useState<any>({})
  const validateFormFields = (fields: PasswordResetData) => {
    let isValid = true

    try {
      const valibotResult = v.parse(
        PasswordResetSchema,
        fields,
        {abortPipeEarly: true}, // ensures each key, e.g. email, has only one error message
      )
      console.log('validating email\n', {valibotResult})
    } catch (error: any) {
      /*: ValiError<typeof SignupSchema>*/
      const flattenedIssues = v.flatten<typeof PasswordResetSchema>(
        error.issues,
      )
      setValidationIssues(flattenedIssues?.nested ?? {})
      isValid = false
    }

    return isValid
  }

  const handlePasswordReset = async (
    event: SyntheticEvent<HTMLFormElement>,
  ) => {
    // prevent default form submission behavior
    const fields = sharedFormSubmission(event);
    const email = fields.email as string
    console.log('handlePasswordReset', {email})

    const isValid = validateFormFields(fields as PasswordResetData)
    console.log('handlePasswordReset', {isValid})

    if (isValid) {
      /*const {data, error} = */await forgetPassword({
        email,
        redirectTo: "/auth/setNewPassword",
      });
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
            <input name="email" type="email" defaultValue={''} />
            <FormFieldError message={validationIssues?.email} />
          </label>
          <button type="submit">Reset Password</button>
        </form>
      </section>
      <button
        type={'submit'}
        // onClick={async () => {
        //   await router.invalidate({sync: true})
        //   router.navigate({to: '/auth/signin'})
        //}}
      >
        Index - for troubleshooting, remove
      </button>
    </>
  )
}

export const Route = createFileRoute('/auth/requestPasswordReset')({
  component: SetNewPassword,
  // loader: async () => await getCount(),
})
