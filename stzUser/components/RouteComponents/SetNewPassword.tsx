import {createFileRoute, useRouter} from '@tanstack/react-router'
import {PasswordInput} from "~stzUtils/components/InputFields";
import {SyntheticEvent, useState} from "react";
import {sharedFormSubmission} from "~stzUser/lib/form";
import * as v from "valibot";
import {resetPassword} from '~stzUser/lib/auth-client';
import { routeStrings } from '~/constants';
import { Spacer } from '~stzUtils/components/Spacer';
import { passwordValidation } from '~stzUser/lib/password-validation';

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

// TypeScript - simple password data type
type PasswordResetData = {
  password: string;
};

export const SetNewPassword = () => {
  const router = useRouter()

  const [validationIssues, setValidationIssues] = useState<any>({})
  const validateFormFields = (fields: PasswordResetData) => {
    try {
      v.parse(passwordValidation, fields.password);
      setValidationIssues({}); // Clear any previous validation issues
      return true;
    } catch (error: any) {
      setValidationIssues({ password: error.message });
      return false;
    }
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
