import * as v from "valibot";

export const minPasswordLength = 8;

// Base password validation function with customizable error message
const createBasePasswordValidation = (errorMessage: string = 'password required') => v.pipe(
  v.string(),
  v.nonEmpty(errorMessage)
);

// Required password validations (for SignUp/SignIn)
export const requiredPasswordValidation = createBasePasswordValidation();

export const requiredPasswordWithLengthValidation = v.pipe(
  createBasePasswordValidation(),
  v.minLength(minPasswordLength, `must be at least ${minPasswordLength} characters`)
);

// Optional password validations (for Profile.tsx)
// For new passwords - allow empty OR valid password with length requirement
export const optionalPasswordValidation = v.union([
  v.literal(''), // Allow empty string
  v.pipe(
    createBasePasswordValidation(),
    v.minLength(minPasswordLength, `must be at least ${minPasswordLength} characters`)
  )
]);

// For current passwords - allow empty OR valid password
// Current passwords may not meet new minimum length standards
export const optionalCurrentPasswordValidation = v.union([
  v.literal(''), // Allow empty string
  createBasePasswordValidation('current password required')
]);

// Legacy exports for backward compatibility
export const passwordValidation = optionalPasswordValidation;
export const currentPasswordValidation = optionalCurrentPasswordValidation;