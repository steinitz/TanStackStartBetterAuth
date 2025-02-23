import {createFileRoute, useRouter} from '@tanstack/react-router'
import {PasswordInput} from "~/components/InputFields";
import {SyntheticEvent, useState} from "react";
import {sharedFormSubmission} from "~/lib/form";
import * as v from "valibot";
import {resetPassword} from '~/lib/auth-client';

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

export const SetNewPassword = () => {
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
    } catch (error: any) {/*: ValiError<typeof SignupSchema>*/
      const flattenedIssues = v.flatten<typeof PasswordResetSchema>(error.issues)
      setValidationIssues(flattenedIssues?.nested ?? {})
      isValid = false
    }

    return isValid
  }

  const handleSetNewPassword = async (
    event: SyntheticEvent<HTMLFormElement>
  ) =>{
    // prevent default form submission behavior
    const fields = sharedFormSubmission(event);
    const newPassword = fields.password as string
    console.log( 'handleSetNewPassword', {newPassword})

    const isValid = validateFormFields(fields as PasswordResetData)
    console.log( 'handleSetNewPassword', {isValid})

    if (isValid) {
      const token = new URLSearchParams(window.location.search).get('token') || undefined
      console.log('handleSetNewPassword', {token})
      await resetPassword({
        newPassword,
        token
      })

      await router.invalidate({sync: true})
      router.navigate({to: '/auth/signin'})
    }
  }

  return (
    <>
      <div>
        <h1>Set New Password</h1>
      </div>
      <section>
        <form onSubmit={handleSetNewPassword}>
          <PasswordInput
            validationIssue={validationIssues?.password}
          />
          <button type="submit">Set New Password</button>
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

export const Route = createFileRoute('/auth/setNewPassword')({
  component: SetNewPassword,
  // loader: async () => await getCount(),
})
