import * as v from "valibot";

export const minPasswordLength = 8;

// Base password validation - string that is not empty
const basePasswordValidation = v.pipe(
  v.string(),
  v.nonEmpty('password required')
);

// For new passwords - allow empty OR valid password with length requirement
export const passwordValidation = v.union([
  v.literal(''), // Allow empty string
  v.pipe(
    basePasswordValidation,
    v.minLength(minPasswordLength, `must be at least ${minPasswordLength} characters`)
  )
]);

// For current passwords - allow empty OR valid password
// Current passwords may not meet new minimum length standards
export const currentPasswordValidation = v.union([
  v.literal(''), // Allow empty string
  v.pipe(
    v.string(),
    v.nonEmpty('current password required')
  )
]);