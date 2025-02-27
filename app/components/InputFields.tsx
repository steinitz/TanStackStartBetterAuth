import {useState} from "react";
import {FormFieldError} from "./FormFieldError";

export function PasswordInput({validationIssue}) {
  const [shouldShowPassword, setShouldShowPassword] = useState(false)
  return (
    <label>
      <div>
        Password
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
          width: 'calc(100% - 1.6rem)', // why do I need to repeat this from mvp.css?
        }}
        type={shouldShowPassword ? 'text' : 'password'}
        name="password"
        autoComplete="on"
      />
      <FormFieldError message={validationIssue} />
    </label>
  )
}
