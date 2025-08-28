import {useNavigate} from '@tanstack/react-router'
import {FormFieldError} from '~stzUtils/components/FormFieldError'
import {SyntheticEvent, useState} from 'react'
import {niceValidationIssues, sharedFormSubmission} from '~stzUser/lib/form'
import * as v from 'valibot'
import {forgetPassword} from '~stzUser/lib/auth-client'
import {Spacer} from "~stzUtils/components/Spacer";
import {isEmptyString} from "~stzUser/lib/utils";
import Spinner from "~stzUser/components/Other/Spinner";

// UI strings for component and testing
export const requestPasswordResetStrings = {
  pageTitle: 'Password Reset',
  emailLabel: 'Email',
  resetPasswordButton: 'Reset Password',
  linkSentTitle: 'Password Reset Link Sent',
  linkSentMessage: 'We\'ve sent a password-reset link to',
  linkSentInstructions: 'Please check your email inbox and follow the instructions',
  okButton: 'Ok',
};

// Test selectors for E2E testing
export const requestPasswordResetSelectors = {
  passwordResetForm: 'form',
  emailInput: 'input[name="email"]',
  resetPasswordButton: 'button[type="submit"]',
  spinnerContainer: '.spinner',
  linkSentH1Text: requestPasswordResetStrings.linkSentTitle,
};

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

export const RequestPasswordReset = () => {
  console.log('RequestPasswordReset component rendered')
  const navigate = useNavigate()

  const [validationIssues, setValidationIssues] = useState<any>({})
  const validateFormFields = (fields: PasswordResetData) => {
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
  const [shouldShowSpinner, setShouldShowSpinner] = useState(false)
  const handlePasswordReset = async (
    event: SyntheticEvent<HTMLFormElement>,
  ) => {
    console.log('handlePasswordReset function called!')
    const fields = sharedFormSubmission(event)
    console.log('Form fields extracted:', fields)
    const email = fields.email as string
    console.log('Email field value:', email, 'Type:', typeof email)
    setEmail(email)
    console.log('handlePasswordReset', {email})

    const isValid = validateFormFields(fields as PasswordResetData)
    console.log('handlePasswordReset', {isValid})

    if (isValid) {
      console.log('Inside if (isValid) block - form validation passed')
      setShouldShowSpinner(true)
      try {
        /*const {data, error} = */ await forgetPassword({
          email,
          redirectTo: '/auth/setNewPassword',
        })
      } finally {
        setShouldShowSpinner(false)
      }
    }
  }

  return (
    <>
      <section>
        {isEmptyString(email) ?
          <form onSubmit={handlePasswordReset}>
            <div style={{display: "flex", flexDirection: "row", justifyContent: "flex-start"}}>
              <h1>{requestPasswordResetStrings.pageTitle}</h1>
              {shouldShowSpinner && <div style={{margin: '1rem 5rem'}}><Spinner/></div>}
            </div>
            <label>
              {requestPasswordResetStrings.emailLabel}
              <input
                name="email"
                type="email"
                defaultValue={''}
                autoComplete="on"
              />
              <FormFieldError message={validationIssues?.email}/>
            </label>
            <button type="submit">{requestPasswordResetStrings.resetPasswordButton}</button>
          </form>
          :
          <form onSubmit={() => navigate({to: "/"})}>
            <h1>{requestPasswordResetStrings.linkSentTitle}</h1>
            <p>{requestPasswordResetStrings.linkSentMessage}</p>
            <p style={{marginLeft: '4rem'}}>{email}</p>
            <p>{requestPasswordResetStrings.linkSentInstructions}</p>
            <Spacer space={2}/>
            <div style={{textAlign: "right"}}>
              <button
                type="submit"
              >
                {requestPasswordResetStrings.okButton}
              </button>
            </div>
          </form>
        }
      </section>
    </>
  )
}
