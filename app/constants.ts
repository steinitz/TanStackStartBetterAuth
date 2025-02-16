export const companyName:string = 'Blockchain Portfolio'

// note .env has steve@stzdev.com
export const supportEmail:string = 'support@stzdev.com'

// uses:
// reset-password.$token route to identify no default email
// FormFieldError as a no-error-message value
export const noValue = '_'

// Used for user-not-found-for-token in email-address-confirmed
// and reset-password routes. I remain unclear about what to suggest
// next for the user when confirming email during registering.
// For password reset, it's simpler: just send the email link again.
// For confirming email, the registration process might have failed.
// So we might have to ask the user to register again but need to
// avoidd the annoying case where the user's email is already in the
// database so the unique-ing fails...
export const errorStringUserNotDefined = "User is not defined";
export const errorRowNotFound = "Row not found";

// route strings
export const routeStrings = {
  login: '/login',
}
