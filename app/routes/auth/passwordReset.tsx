import { createFileRoute, useRouter } from '@tanstack/react-router'
import {FormFieldError} from "~/components/FormFieldError";
import {PasswordInput} from "~/components/InputFields";
import {SyntheticEvent, useState} from "react";
import {fieldsFromFormData} from "~/lib/form";
import * as v from "valibot";
import { resetPassword } from '~/lib/auth-client';

// TypeScript - sugggested by Valibot docs, and comes in handy later
type PasswordResetData = {
  // email: string;
  password: string;
};

// Valibot
const PasswordResetSchema = v.object({
  // email: v.pipe(
  //   v.string('email must be a string'),
  //   v.nonEmpty('email address required'),
  //   v.email('invalid email'),
  // ),
  password: v.pipe(v.string(), v.nonEmpty('password required')),
});

export const PasswordReset = () => {
  const router = useRouter()

  const [validationIssues, setValidationIssues] = useState<any>({})
  const validateFormFields = (fields: PasswordResetData) => {
    let isValid = true;

    try {
      const valibotResult = v.parse(
        PasswordResetSchema,
        fields,
        {abortPipeEarly: true} // ensures each key, e.g. email, has only one error message
      )
      console.log('validating password\n', {valibotResult})
    } catch (error: any) { /*: ValiError<typeof SignupSchema>*/
      const flattenedIssues = v.flatten<typeof PasswordResetSchema>(error.issues)
      setValidationIssues(flattenedIssues?.nested ?? {})
      isValid = false
    }

    return isValid
  }

  // const doResetPassword = async (
  //   fields: PasswordResetData
  // ) => {
  //   await resetPassword{
  //     password,
  //     token
  //   }
  //
  // }

  const handlePasswordReset = async (
    event: SyntheticEvent<HTMLFormElement>
  ) =>{
    // prevent default form submission behavior
    event.preventDefault();
    event.stopPropagation();
    const formData = new FormData(event.currentTarget);
    const fields = fieldsFromFormData(formData)
    console.log( 'handlePasswordReset', {fields})
    const newPassword = fields.password as string
    console.log( 'handlePasswordReset', {newPassword})

    const isValid = validateFormFields(fields as PasswordResetData)
    console.log( 'handlePasswordReset', {isValid})

    if (isValid) {
      const token = new URLSearchParams(window.location.search).get('token') || undefined
      console.log('handlePasswordReset', {token})
      resetPassword({
        newPassword,
        token
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
           <PasswordInput
            validationIssue={validationIssues?.password}
          />
          <button type="submit">Reset Password</button>
        </form>
      </section>
      <button
        type={'submit'}
        onClick={async () => {
          await router.invalidate({ sync: true })
          router.navigate({ to: '/auth/signin' })
        }}
      >
        Index - for troubleshooting, remove
      </button>
    </>
  )
}

export const Route = createFileRoute('/auth/passwordReset')({
  component: PasswordReset,
  // loader: async () => await getCount(),
})
