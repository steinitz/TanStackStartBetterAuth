import {useNavigate} from "@tanstack/react-router";
import {MouseEvent, SyntheticEvent, useEffect, useState} from "react";
import * as v from "valibot";
import {niceValidationIssues, preventDefaultFormSubmission, sharedFormSubmission} from "~stzUser/lib/form";
import {changeEmail, deleteUser, useSession} from "~stzUser/lib/auth-client";
import {Spacer} from "~stzUtils/components/Spacer";
import {EmailInput, PasswordInput} from "~stzUtils/components/InputFields";
import {
  DeleteAccountConfirmationDialog,
} from "./deleteAccountConfirmationDialog";
import {
  CheckForEmailChangeConfirmationLinkDialog,
} from "./checkForEmailChangeConfirmationLinkDialog";
import {SignIn} from "~stzUser/components/RouteComponents/SignIn";
import {makeDialogRef} from "~stzUtils/components/Dialog";
import Spinner from "~stzUser/components/Other/Spinner";
import {CheckForNewEmailVerificationLinkDialog} from "./checkForNewEmailVerificationLinkDialog";
import {routeStrings} from "~/constants";

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

  const handleSaveChanges = async (
    event: SyntheticEvent<HTMLFormElement>,
  ) => {
    const fields = sharedFormSubmission(event)
    const newEmail = fields.email as string
    const isValid = validateFormFields(fields as ProfileData)

    if (isValid) {
      if (fields.email !== email) {
        // note: BetterAuth supports email confirmation for changing email.
        setShouldShowEmailChangeSpinner(true)
        setNewEmailAddress((newEmail))
        
        let data, error;
        try {
          const result = await changeEmail({
            newEmail,
            // notes:

            // 1. logic in stzUser/lib/auth.ts currently uses this callbackURL 
            // component of the api URL to prevent sendVerificationEmail 
            // from sending a verification email to the old email address.  
            // Better Auth provides no clean way to disable this behavior.  
            // Github issue raised July 2025
            
            // 2. this redirect occurs after the user clicks the link in the email
            callbackURL: routeStrings.profile
          })
          data = result.data
          error = result.error
        } catch (e) {
          error = {message: `Network error: ${e?.message || 'Unknown error'}`}
          data = null
        }
        
        if (error) {
          alert('Error changing email address')
          setEmailChangeError(error.message as string)
        } else {
          checkForEmailChangeLinkConfirmationDialogRef.current.setIsOpen(true)
        }
        
        setShouldShowEmailChangeSpinner(false)
      }
    }
  }
  // The comment below seems wrong - sendVerificationEmail email sending is disabled for change email...
  // TODO: Clarify and cleanup

  // COMMENTED OUT: No longer needed since sendChangeEmailVerification is disabled
  // The unified sendVerificationEmail handles email change verification directly
  // 
  // useEffect(() => {
  //   const didConfirmChange = new URLSearchParams(
  //     window.location.search
  //   ).get(didConfirmChangeSearchParam) || undefined
  //   // check that we're on the special profile?didConfirmChange=true page
  //   if (didConfirmChange) {
  //     console.log('useEffect1 - opening dialog')
  //     checkForNewEmailVerificationLinkDialogRef.current.setIsOpen(true)
  //   }
  // })

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
        // Show the specific error message from the server
        const errorMessage = error instanceof Error ? error.message : 'Error deleting account'
        alert(errorMessage)
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
        onClick={() => navigate({to: routeStrings.profile})}
      />
      <CheckForNewEmailVerificationLinkDialog
        ref={checkForNewEmailVerificationLinkDialogRef}
        onClick={() => navigate({to: routeStrings.profile})}
      />
      <section>
        {session?.user ?
          <form
            data-testid="profile-form"
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
                data-testid="save-changes-button"
                type="submit"
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