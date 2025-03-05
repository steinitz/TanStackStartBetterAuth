import {createFileRoute} from "@tanstack/react-router";
import {SyntheticEvent, useState} from "react";
import * as v from "valibot";
import {niceValidationIssues, sharedFormSubmission} from "~/lib/form";
import {changeEmail} from "~/lib/auth-client";
import {FormFieldError} from "~/components/FormFieldError";
import {Spacer} from "~/components/Spacer";

type ProfileData = {
  email: string
}

// Valibot
const ProfileSchema = v.object({
  email: v.pipe(
    v.string('email must be a string'),
    v.nonEmpty('email address required'),
    v.email('invalid email'),
  ),
})

export const Profile = () => {
  const [emailChangeError, setEmailChangeError] = useState<any>()
  const [emailChangeDidSucceed, setEmailChangeDidSucceed] = useState(false)
  const [newEmailAddress, setNewEmailAddress] = useState('')
  const [validationIssues, setValidationIssues] = useState<any>({})

  const validateFormFields = (fields: ProfileData) => {
    const valibotResult = v.safeParse(
    ProfileSchema,
    fields,
    {abortPipeEarly: true} // max one issue per key
    )
    if (!valibotResult.success) {
      setValidationIssues(niceValidationIssues(valibotResult))
    }
    return valibotResult.success
  }

  const handleNewEmailRequest = async (
    event: SyntheticEvent<HTMLFormElement>,
  ) => {
    const fields = sharedFormSubmission(event)
    const newEmail = fields.email as string
    console.log('handleNewEmailRequest', { newEmail })

    const isValid = validateFormFields(fields as ProfileData)
    console.log('handleNewEmailRequest', { isValid })

    if (isValid) {
      setNewEmailAddress((newEmail))
      const { data, error } = await changeEmail({
        newEmail,
        // callbackURL: '/',
      })
      console.log('handleNewEmailRequest', { data, error })
      if (error) {
        console.log('handleNewEmailRequest', { error })
        setEmailChangeError(error.message as string)
      }
      else {
        setEmailChangeDidSucceed(true)
      }
    }
  }

  return (
    <>
      <section>
        <h1>Profile</h1>
        <Spacer />
        <form
          onSubmit={handleNewEmailRequest}
          style={{maxWidth: '350px'}}
        >
          {
            emailChangeDidSucceed ?
            <>
              <h4
                style={{textAlign: 'center'}}
              >
                {`Check your email inbox for a link to verify your new email address`}
              </h4>
              <p
                style={{textAlign: 'center'}}
              >
                {`${newEmailAddress}`}
              </p>
            </>
              :
            <>
            <label>
              Change Email Address
              <input
                name="email"
                type="email"
                defaultValue={''}
                autoComplete="on"
              />
              <FormFieldError message={validationIssues?.email || emailChangeError}/>
            </label>
            <button type="submit">Set New Email Address</button>
            </>
          }
        </form>
      </section>
    </>
  )
}

export const Route = createFileRoute('/_app/profile')({
  component: Profile,
})

