import {createFileRoute} from "@tanstack/react-router";
import {MouseEvent, SyntheticEvent, useRef, useState} from "react";
import * as v from "valibot";
import {niceValidationIssues, preventDefaultFormSubmission, sharedFormSubmission} from "~/lib/form";
import {changeEmail, deleteUser, useSession} from "~/lib/auth-client";
import {Spacer} from "~/components/Spacer";
import {EmailInput, PasswordInput} from "~/components/InputFields";
import {
  DeleteAccountConfirmationDialog,
} from "~/components/Profile/deleteAccountConfirmationDialog";
import {
  CheckForEmailChangeLinkDialog,
} from "~/components/Profile/checkForEmailChangeLinkDialog";
import {} from "~/components/Profile/checkForEmailChangeLinkDialog";
import {SignIn} from "~/components/SignIn";
import {dialogRefType} from "~/components/Dialog";

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

  // confirmation dialog refs for access to setIsOpen
  const checkForEmailChangeLinkDialogRef = useRef<dialogRefType>(null)
  const deleteAccountConfirmationDialogRef = useRef<dialogRefType>(null)

  const email = session?.user?.email

  const [emailChangeError, setEmailChangeError] = useState<any>()
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
          // callbackURL: routeStrings.signin,
        })
        console.log('handleSaveChanges', {data, error})
        if (error) {
          console.log('handleSaveChanges', {error})
          alert('Error changing email address')
          setEmailChangeError(error.message as string)
        } else {
          checkForEmailChangeLinkDialogRef.current?.setIsOpen(true)
        }
      }
    }
  }

  // const intents = {save: 'save', delete: 'delete'}

  function handleDeleteAccountRequest(
    event: MouseEvent
  ): void {
    preventDefaultFormSubmission (event)
    deleteAccountConfirmationDialogRef.current?.setIsOpen(true)
  }

  function handleDeleteConfirmation(event: SyntheticEvent<HTMLFormElement>): void {
    preventDefaultFormSubmission (event)
    deleteUser()
  }

  return (
    <>
      <DeleteAccountConfirmationDialog
        ref={deleteAccountConfirmationDialogRef}
      />
      <CheckForEmailChangeLinkDialog
        ref={checkForEmailChangeLinkDialogRef}
      />
      <section>
        {session?.user ?
          <form
            onSubmit={handleSaveChanges}
            // style={{maxWidth: '350px'}}
          >
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
              <Spacer orientation="horizontal" space={1}/>
              <button
                type="submit"
                // name="intent" value={intents.save}
                // onClick={handleSaveChanges}
              >
                Save Changes
              </button>
            </div>
          </form>
          :
          <>
            <h4
              style={{margin: '-1rem', fontWeight: 'normal'}}
            >
              Sign In to access your Profile
            </h4>
            <Spacer/>
            <SignIn/>
          </>
        }
      </section>
    </>
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
