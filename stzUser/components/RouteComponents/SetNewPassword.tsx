import {createFileRoute, useRouter} from '@tanstack/react-router'
import {PasswordInput} from "~stzUtils/components/InputFields";
import {SyntheticEvent, useRef, useState} from "react";
import {sharedFormSubmission} from "~stzUser/lib/form";
import * as v from "valibot";
import {resetPassword} from '~stzUser/lib/auth-client';
import { routeStrings } from '~/constants';
import { Spacer } from '~stzUtils/components/Spacer';
import { BusyButton } from '~stzUtils/components/BusyButton';
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
  // The busy state now lives on the submit button itself; BusySpinner marks it with this
  // attribute rather than a class, so a spec asserts on the app instead of the stylesheet.
  busySpinner: '[data-busy-spinner]',
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

  // The guard is the ref; `isSettingPassword` only draws. A `disabled` set from state takes
  // a render to arrive and a second submit lands before it does, which for this control
  // would mean two password writes against one token.
  const settingPasswordRef = useRef(false)
  const [isSettingPassword, setIsSettingPassword] = useState(false)

  const handleSetNewPassword = async (
    event: SyntheticEvent<HTMLFormElement>
  ) =>{
    const fields = sharedFormSubmission(event);
    const newPassword = fields.password as string

    const isValid = validateFormFields(fields as PasswordResetData)

    // Validation failure is not a wait, so the spinner stays out for it.
    if (!isValid) return
    if (settingPasswordRef.current) return
    settingPasswordRef.current = true
    setIsSettingPassword(true)

    try {
      const token = new URLSearchParams(window.location.search).get('token') || undefined
      await resetPassword({
        newPassword,
        token
      })
      router.navigate({to: routeStrings.signin})
    } finally {
      // Released on both paths. The success path navigates away, so it is invisible there;
      // a rejected resetPassword leaves the user on this form needing the button back.
      settingPasswordRef.current = false
      setIsSettingPassword(false)
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
            <BusyButton
              type="submit"
              busy={isSettingPassword}
              busyLabel="Setting your password"
            >
              {setNewPasswordStrings.setPasswordButton}
            </BusyButton>
          </div>
        </form>
      </section>
    </>
  )
}
