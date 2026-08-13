import React, {useState} from "react";
import {FormFieldError} from "~stzUtils/components/FormFieldError";
import { ValidatedInput } from "~stzUtils/components/ValidatedInput";
import { fieldLabelSubtext } from "~stzUtils/components/styles";

// Type for validation errors - consistent across the application
type ValidationErrors = Record<string, string> | undefined

// Re-export ValidatedInput for use in other components
export { ValidatedInput };

export function PasswordInput({
  validationIssue,
  fieldName = "password",
  label = "Password",
  placeholder,
  autoComplete = "on",
  style
}: {
  validationIssue?: string,
  fieldName?: string,
  label?: string,
  placeholder?: string,
  autoComplete?: string,
  style?: React.CSSProperties
}) {
  const [shouldShowPassword, setShouldShowPassword] = useState(false)
  return (
    <label>
      <div>
        {label}
          <div
            style={{float: 'right', marginTop: '3px'}}
            className={shouldShowPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}
            onClick={
              () => {
                console.log('click')
                setShouldShowPassword(!shouldShowPassword);
              }
            }
          />
      </div>
      <input
        style={{
          // width: 'calc(100% - 1.6rem)', // why do I need to repeat this from mvp.css?
          fontWeight: shouldShowPassword ? 'normal' : 'bold',
          letterSpacing: shouldShowPassword ? 'normal' : '.25rem',
          ...style
        }}
        type={shouldShowPassword ? 'text' : 'password'}
        name={fieldName}
        {...(placeholder && { placeholder })}
        autoComplete={autoComplete}
      />
      <FormFieldError message={validationIssue || ''} />
    </label>
  )
}

const InputField = ({
  fieldLabel,
  subtext,
  fieldName,
  defaultValue,
  validationErrors,
  tooltip,
  type,
  autoComplete,
}: {
  fieldLabel: string,
  subtext?: string,
  fieldName: string,
  defaultValue?: string
  validationErrors: ValidationErrors
  tooltip?: string
  type?: string
  autoComplete?: string
}) => {
  const hasTooltip = !!tooltip && tooltip.length > 0;
  return <div className={hasTooltip ? 'tooltip' : ''}>
    <label>
      {fieldLabel} <span style={fieldLabelSubtext}>{subtext}</span>
      <ValidatedInput
        fieldName={fieldName}
        validationErrors={validationErrors}
        defaultValue={defaultValue}
        type={type}
        autoComplete={autoComplete}
      />
    </label>
    <span className={hasTooltip ? 'tooltiptext' : ''}>
      {tooltip}
    </span>
  </div>;
}

export const EmailInput = ({validationErrors, defaultValue}: {
  validationErrors: ValidationErrors, defaultValue?: string
}) => {
  return <InputField
    fieldLabel="Email Address"
    fieldName="email"
    defaultValue={defaultValue}
    validationErrors={validationErrors}
    type="email"
  />
}

// The two inputs below are aspirational: nothing writes them and no column backs them.
// Kept deliberately — they describe three genuinely different things, and losing the
// distinction would be losing the design rather than tidying it.
//
// UsernameInput is the one with a concrete route to existing. Better Auth ships a
// `username` plugin (better-auth/plugins/username, present in node_modules, not
// enabled here) that adds a unique, lowercase-normalised `username` alongside a
// `displayUsername` holding what the user actually typed, validated against
// /^[a-zA-Z0-9_.]+$/, and its own /sign-in/username endpoint. Enabling it is a
// project — plugin both ends, two columns and a unique index, signup, the SignIn
// form, and a decision about existing users who have none — not a field.
//
// PreferredName has no Better Auth home at all; it would be an additionalField.
//
// Neither is the core `name` column, which FullNameInput below now writes. `name`
// carries no unique index (in production only id and email do), so it cannot be a
// login identifier — Better Auth means it as a display name, and this app means it
// as the user's full name.
export const UsernameInput = ({validationErrors, defaultValue}: {
  validationErrors: ValidationErrors, defaultValue?: string
}) => {
  return <InputField
    fieldLabel="Login Name"
    subtext="(recommended)"
    fieldName="username"
    defaultValue={defaultValue}
    validationErrors={validationErrors}
    tooltip="Useful if you lose access to your email."
  />
}

export const PreferredNameInput = ({validationErrors, defaultValue}: {
  validationErrors: ValidationErrors, defaultValue?: string
}) => {
  return <InputField
    fieldLabel="Preferred Name"
    subtext="(optional)"
    fieldName="preferredName"
    defaultValue={defaultValue}
    validationErrors={validationErrors}
    tooltip="examples: Bob, Grace, Dr. Smith"
   />
}

/**
 * The one name the app actually stores: Better Auth's core `name` column, which both
 * sign-up and the profile write through this component. It was aspirational too, under
 * fieldName "fullName", until it turned out the real column had been sitting there all
 * along with a hand-rolled input of its own on the sign-up form.
 *
 * Recommended rather than required. ChessHurdles wants a full name badly — it is what an
 * imported PGN's player headers are matched against — but other consumers of this repo
 * have no such need, and a required field upstream would be ChessHurdles' appetite
 * charged to everyone. "(recommended)" is the honest middle: it nudges without refusing
 * the form, and it is what UsernameInput above already says for the same reason.
 */
export const FullNameInput = ({validationErrors, defaultValue}: {
  validationErrors: ValidationErrors, defaultValue?: string
}) => {
  return <InputField
    fieldLabel="Full Name"
    subtext="(recommended)"
    fieldName="name"
    defaultValue={defaultValue}
    validationErrors={validationErrors}
    autoComplete="name"
   />
}