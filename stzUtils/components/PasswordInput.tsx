import { useState } from "react"
import { FormFieldError } from "~stzUtils/components/FormFieldError"

export function PasswordInput({ validationIssue }: { validationIssue?: string }) {
  const [shouldShowPassword, setShouldShowPassword] = useState(false)
  
  return (
    <label>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Password
        <button
          type="button"
          onClick={() => setShouldShowPassword(!shouldShowPassword)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "0.9rem",
            padding: "2px 4px",
          }}
          aria-label={shouldShowPassword ? "Hide password" : "Show password"}
        >
          {shouldShowPassword ? "🙈" : "👁️"}
        </button>
      </div>
      <input
        type={shouldShowPassword ? "text" : "password"}
        name="password"
        autoComplete="current-password"
        style={{
          width: "100%",
          boxSizing: "border-box",
        }}
      />
      <FormFieldError message={validationIssue || ""} />
    </label>
  )
}