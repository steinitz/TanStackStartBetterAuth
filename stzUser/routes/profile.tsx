import {createFileRoute, useNavigate} from "@tanstack/react-router";
import {MouseEvent, RefObject, SyntheticEvent, useEffect, useRef, useState} from "react";
import * as v from "valibot";
import {niceValidationIssues, preventDefaultFormSubmission, sharedFormSubmission} from "~stzUser/lib/form";
import {changeEmail, deleteUser, useSession} from "~stzUser/lib/auth-client";
import {Spacer} from "~stzUtils/components/Spacer";
import {EmailInput, PasswordInput} from "~stzUtils/components/InputFields";
import {
  DeleteAccountConfirmationDialog,
} from "~stzUser/components/Profile/deleteAccountConfirmationDialog";
import {
  CheckForEmailChangeConfirmationLinkDialog,
} from "~stzUser/components/Profile/checkForEmailChangeConfirmationLinkDialog";
import {SignIn} from "~stzUser/components/SignIn";
import {DialogRefType, DialogMethodsType, makeDialogRef} from "~stzUtils/components/Dialog";
import Spinner from "~stzUser/components/Spinner";
import {CheckForNewEmailVerificationLinkDialog} from "~stzUser/components/Profile/checkForNewEmailVerificationLinkDialog";

const thisNakedPath = '/profile'
const thisPath = `/_app${thisNakedPath}`
const didConfirmChangeSearchParam = 'didConfirmChange'

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
  const navigate = useNavigate()

  const checkForEmailChangeLinkConfirmationDialogRef = makeDialogRef();
  const checkForNewEmailVerificationLinkDialogRef = makeDialogRef();
  const deleteAccountConfirmationDialogRef = makeDialogRef();

  const email = session?.user?.email

  const [, setEmailChangeError] = useState<any>()
  const [, setNewEmailAddress] = useState('')
  const [shouldShowEmailChangeSpinner, setShouldShowEmailChangeSpinner] = useState(false)

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
        setShouldShowEmailChangeSpinner(true)
        setNewEmailAddress((newEmail))
        const {data, error} = await changeEmail({
          newEmail,
          callbackURL: `thisPath?${didConfirmChangeSearchParam}=true`
        })
        console.log('handleSaveChanges', {data, error})
        if (error) {
          console.log('handleSaveChanges', {error})
          alert('Error changing email address')
          setEmailChangeError(error.message as string)
        } else {
          checkForEmailChangeLinkConfirmationDialogRef.current.setIsOpen(true)
        }
        setShouldShowEmailChangeSpinner(false)
      }
    }
  }

  // Show the check for email verification dialog after the user has clicked
  // the confirm-email-change link.  Slightly awkward but hopefully temporary
  // awaiting Better Auth to remove the confirm-email-change step

  // Note this only occurs on /profile?didConfirmChange=true to which the email
  // change confirmation redirects.  After showing the dialog we return to the
  // vanilla /profile page

  useEffect(() => {
    const didConfirmChange = new URLSearchParams(
      window.location.search
    ).get(didConfirmChangeSearchParam) || undefined
    // check that we're on the special profile?didConfirmChange=true page
    if (didConfirmChange) {
      console.log('useEffect1 - opening dialog')
      checkForNewEmailVerificationLinkDialogRef.current.setIsOpen(true)
    }
  })

  function handleDeleteAccountRequest(event: MouseEvent<HTMLButtonElement>): void {
    console.log('handleDeleteAccountRequest', {deleteAccountConfirmationDialogRef})
    preventDefaultFormSubmission(event)
    deleteAccountConfirmationDialogRef.current.setIsOpen(true)
  }

  function handleDelete(): void {
    console.log('handleDelete - Account deletion successful')
    deleteAccountConfirmationDialogRef.current.setIsOpen(false)
    deleteUser()
      .then(() => {
        console.log('handleDelete - Account deletion successful')
      })
      .catch((error) => {
        console.error('handleDelete - Account deletion failed:', error)
        alert('Error deleting account')
      })
  }

  return (
    <>
      <DeleteAccountConfirmationDialog
        ref={deleteAccountConfirmationDialogRef}
        onDelete={handleDelete}
      />
      <CheckForEmailChangeConfirmationLinkDialog
        ref={checkForEmailChangeLinkConfirmationDialogRef}
        onClick={() => navigate({to: thisNakedPath})}
      />
      <CheckForNewEmailVerificationLinkDialog
        ref={checkForNewEmailVerificationLinkDialogRef}
        onClick={() => navigate({to: thisNakedPath})}
      />
      <section>
        {session?.user ?
          <form
            onSubmit={handleSaveChanges}
            // style={{maxWidth: '350px'}}
          >
            <div style={{display: "flex", flexDirection: "row", justifyContent: "flex-start"}}>
              <h1>Profile</h1>
              {shouldShowEmailChangeSpinner && <div style={{margin: '1rem 5rem'}}><Spinner/></div>}
            </div>


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

export const Route = createFileRoute(thisPath)({
  component: Profile,
})
