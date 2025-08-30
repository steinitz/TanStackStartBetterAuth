import {createFileRoute, useRouter} from '@tanstack/react-router'
import {PasswordInput} from "~stzUtils/components/InputFields";
import {SyntheticEvent, useState} from "react";
import {sharedFormSubmission} from "~stzUser/lib/form";
import * as v from "valibot";
import {resetPassword} from '~stzUser/lib/auth-client';
import { routeStrings } from '~/constants';
import { Spacer } from '~stzUtils/components/Spacer';
import { requiredPasswordSchema, RequiredPasswordData } from '~stzUser/lib/password-validation';

// UI strings for component and testing
export const setNewPasswordStrings = {
  pageTitle: 'Set New Password',
  passwordLabel: 'Password',
  confirmPasswordLabel: 'Confirm Password',
  setPasswordButton: 'Set Password',
  passwordUpdatedTitle: 'Password Updated',
  passwordUpdatedMessage: 'Your password has been successfully updated.',
  continueButton: 'Continue',
};

// Test selectors for E2E testing
export const setNewPasswordSelectors = {
  setNewPasswordForm: 'form',
  passwordInput: 'input[name="password"]',
  confirmPasswordInput: 'input[name="confirmPassword"]',
  setPasswordButton: 'button[type="submit"]',
  spinnerContainer: '.spinner',
  passwordUpdatedH1Text: setNewPasswordStrings.passwordUpdatedTitle,
};

// TypeScript - using shared password validation
type PasswordResetData = RequiredPasswordData;

// Valibot - using shared password validation schema
const PasswordResetSchema = requiredPasswordSchema;

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
    const fields = sharedFormSubmission(event);
    const newPassword = fields.password as string

    const isValid = validateFormFields(fields as PasswordResetData)

    if (isValid) {
      const token = new URLSearchParams(window.location.search).get('token') || undefined
      await resetPassword({
        newPassword,
        token
      })
      router.navigate({to: routeStrings.signin})
    }
  }

  return (
    <>
      <div>
      </div>
      <section>
        <form onSubmit={handleSetNewPassword}>
        <h1>{setNewPasswordStrings.pageTitle}</h1>
          <PasswordInput
            validationIssue={validationIssues?.password}
          />
          <Spacer />
          <div style={{textAlign: "right"}}>
            <button type="submit">{setNewPasswordStrings.setPasswordButton}</button>
          </div>
        </form>
      </section>
    </>
  )
}
