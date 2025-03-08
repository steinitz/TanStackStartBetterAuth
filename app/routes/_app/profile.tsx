import {createFileRoute} from "@tanstack/react-router";
import {SyntheticEvent, useState} from "react";
import * as v from "valibot";
import {niceValidationIssues, sharedFormSubmission} from "~/lib/form";
import {changeEmail, deleteUser, useSession} from "~/lib/auth-client";
import {FormFieldError} from "~/components/FormFieldError";
import {Spacer} from "~/components/Spacer";
import Dialog from "~/components/Dialog";
import {EmailInput, FullNameInput, PasswordInput, PreferredNameInput, UsernameInput} from "~/components/InputFields";

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
  const {data: session} = useSession()

  const [emailChangeError, setEmailChangeError] = useState<any>()
  const [emailChangeDidSucceed, setEmailChangeDidSucceed] = useState(false)
  const [newEmailAddress, setNewEmailAddress] = useState('')
  const [validationIssues, setValidationIssues] = useState<any>({})
  const [shouldShowConfirmation, setShouldShowConfirmation] = useState(false)

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

  const email = session?.user?.email

  // const username = 'fred'
  // const preferredName = 'Fred'
  // const fullName = 'Fred Smith'

  const handleSaveChanges = async (
    event: SyntheticEvent<HTMLFormElement>,
  ) => {
    const fields = sharedFormSubmission(event)
    const newEmail = fields.email as string
    console.log('handleSaveChanges', {newEmail})

    const isValid = validateFormFields(fields as ProfileData)
    console.log('handleSaveChanges', {isValid})

    if (isValid) {
      if (fields.email !== email) {
        // note: BetterAuth supports email confirmation for changing email.
        setNewEmailAddress((newEmail))
        const {data, error} = await changeEmail({
          newEmail,
          // callbackURL: '/',
        })
        console.log('handleSaveChanges', {data, error})
        if (error) {
          console.log('handleSaveChanges', {error})
          setEmailChangeError(error.message as string)
        } else {
          setEmailChangeDidSucceed(true)
        }
      }
    }
  }

  const intents = {save: 'save', delete: 'delete'}

  function handleDeleteAccountRequest(/*event: SyntheticEvent<HTMLFormElement>*/): void {
    // const fields = sharedFormSubmission(event)
    setShouldShowConfirmation(true)
  }

  function handleDeleteConfirmation(): void {
    // const fields = sharedFormSubmission(event)
    deleteUser()
  }

  return (
    <section>
      <Spacer/>
      <form
        onSubmit={handleSaveChanges}
        // style={{maxWidth: '350px'}}
      >
        <Dialog
          isOpen={shouldShowConfirmation}
          onClose={
            () => setShouldShowConfirmation(false)
          }
        >
          <h3>Delete Account? &nbsp;Can't be undone.</h3>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between"
            }}
          >
            <button
              type="submit"
              name="intent" value={intents.delete}
              onClick={handleDeleteConfirmation}
              style={{
                backgroundColor: "var(--color-error)",
                borderColor: "var(--color-error)"
              }}
            >
              Delete
            </button>
            <button onClick={() => setShouldShowConfirmation(false)}>
              Cancel
            </button>
          </div>
        </Dialog>

        <h1>Profile</h1>

        <EmailInput
          validationErrors={validationIssues}
          defaultValue={email}
        />
        <PasswordInput validationIssue={validationIssues.password}/>
        {/*<UsernameInput*/}
        {/*  validationErrors={validationIssues}*/}
        {/*  defaultValue={username}*/}
        {/*/>*/}
        {/*<PreferredNameInput*/}
        {/*  validationErrors={validationIssues}*/}
        {/*  defaultValue={preferredName}*/}
        {/*/>*/}
        {/*<FullNameInput*/}
        {/*  validationErrors={validationIssues}*/}
        {/*  defaultValue={fullName}*/}
        {/*/>*/}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between"
          }}
        >
          <button
            onClick={handleDeleteAccountRequest}
            style={{
              backgroundColor: 'var(--color-error)',
              borderColor: 'var(--color-error)'
            }}
          >
            Delete Account
          </button>
          <Spacer orientation="horizontal" space={1} />
          <button
            type="submit"
            // name="intent" value={intents.save}
            // onClick={handleSaveChanges}
          >
            Save Changes
          </button>
        </div>
      </form>
    </section>
  )
}

export const Route = createFileRoute('/_app/profile')({
  component: Profile,
})

// graveyard

 /*      emailChangeDidSucceed ?
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
*/
