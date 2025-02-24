import {createFileRoute} from "@tanstack/react-router";
import {SyntheticEvent, useState} from "react";
import * as v from "valibot";
import {sharedFormSubmission} from "~/lib/form";
import {changeEmail} from "~/lib/auth-client";
import {FormFieldError} from "~/components/FormFieldError";

type NewEmailData = {
  email: string
}

// Valibot
const NewEmailSchema = v.object({
  email: v.pipe(
    v.string('email must be a string'),
    v.nonEmpty('email address required'),
    v.email('invalid email'),
  ),
})

export const Profile = () => {
  const [validationIssues, setValidationIssues] = useState<any>({})
  const validateFormFields = (fields: NewEmailData) => {
    let isValid = true

    try {
      const valibotResult = v.parse(
        NewEmailSchema,
        fields,
        // ensure each key, e.g. password, has only one error message
        { abortPipeEarly: true },
      )
      console.log('validating email\n', { valibotResult })
    } catch (error: any) {
      const flattenedIssues = v.flatten<typeof NewEmailSchema>(
        error.issues,
      )
      setValidationIssues(flattenedIssues?.nested ?? {})
      isValid = false
    }

    return isValid
  }

  const handleNewEmailRequest = async (
    event: SyntheticEvent<HTMLFormElement>,
  ) => {
    const fields = sharedFormSubmission(event)
    const newEmail = fields.email as string
    console.log('handleNewEmailRequest', { newEmail })

    const isValid = validateFormFields(fields as NewEmailData)
    console.log('handleNewEmailRequest', { isValid })

    if (isValid) {
      await changeEmail({
        newEmail,
        callbackURL: '/',
      })
    }
  }

  return (
    <>
      <div>
        <h1>Profile</h1>
      </div>
      <section>
        <form onSubmit={handleNewEmailRequest}>
          <label>
            Change Email Address
            <input name="email" type="email" defaultValue={''} />
            <FormFieldError message={validationIssues?.email} />
          </label>
          <button type="submit">Set New Email Address</button>
        </form>
      </section>
      <button type={'submit'}>Index - for troubleshooting, remove</button>
    </>
  )
}

export const Route = createFileRoute('/profile')({
  component: Profile,
  // loader: async () => await getCount(),
})

