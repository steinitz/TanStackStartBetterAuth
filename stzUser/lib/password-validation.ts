import * as v from "valibot";

export const minPasswordLength = 8;

// Base password validation - string that is not empty
const basePasswordValidation = v.pipe(
  v.string(),
  v.nonEmpty('password required')
);

// For new passwords - includes minimum length requirement
export const passwordValidation = v.pipe(
  basePasswordValidation,
  v.minLength(minPasswordLength, `must be at least ${minPasswordLength} characters`)
);

// For current passwords - only requires non-empty string
// Current passwords may not meet new minimum length standards
export const currentPasswordValidation = v.pipe(
  v.string(),
  v.nonEmpty('current password required')
);