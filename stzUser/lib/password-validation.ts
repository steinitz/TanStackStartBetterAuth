import * as v from "valibot";

// Shared password validation schema
export const passwordValidation = v.pipe(
  v.string(),
  v.nonEmpty('password required')
);

// For required password fields (like SetNewPassword)
export const requiredPasswordSchema = v.object({
  password: passwordValidation,
});

// For optional password fields (like Profile)
export const optionalPasswordSchema = v.object({
  password: v.optional(passwordValidation),
});

// Type definitions
export type RequiredPasswordData = {
  password: string;
};

export type OptionalPasswordData = {
  password?: string;
};