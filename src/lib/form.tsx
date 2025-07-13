import { SyntheticEvent } from "react"
import * as v from "valibot"

// Extract fields from FormData
export const fieldsFromFormData = (formData: FormData) => {
  return (
    // this version puts each values in an array to support, say, multiple "name" fields
    // const fields = Object.fromEntries([...formData.keys()].map(
    // key => [key, formData.getAll(key)]))

    // this simpler version apparently won't work with checkboxes or, of course, multiples
    Object.fromEntries(formData.entries())
  )
}

// Prevent default form submission behavior
export const preventDefaultFormSubmission = (
  event: SyntheticEvent
): any => {
  event.preventDefault()
  event.stopPropagation()
}

// Shared form submission handler
export const sharedFormSubmission = (
  event: SyntheticEvent<HTMLFormElement>
): any => {
  preventDefaultFormSubmission(event)
  // extract field values from form
  const formData = new FormData(event.currentTarget)
  const fields = fieldsFromFormData(formData)
  
  return fields
}

// Convert Valibot validation issues to a nice format
export const niceValidationIssues = (valibotResult: { issues: [v.BaseIssue<unknown>, ...v.BaseIssue<unknown>[]]; }) => {
  const flattenedIssues = v.flatten(valibotResult.issues)
  return flattenedIssues?.nested ?? {}
}

// Common validation schemas
export const emailValidation = v.pipe(
  v.string('email must be a string'),
  v.nonEmpty('email address required'),
  v.email('invalid email'),
)

export const passwordValidation = v.pipe(
  v.string('password must be a string'),
  v.nonEmpty('password is required'),
  v.minLength(8, 'password must be at least 8 characters'),
)

export const nameValidation = v.pipe(
  v.string('name must be a string'),
  v.nonEmpty('name is required'),
  v.minLength(2, 'name must be at least 2 characters'),
)

// Form validation helper
export const validateForm = <T,>(schema: any, data: unknown) => {
  try {
    const result = v.parse(schema, data)
    return { success: true, data: result, errors: {} }
  } catch (error) {
    if (error instanceof v.ValiError) {
      return {
        success: false,
        data: null,
        errors: niceValidationIssues(error)
      }
    }
    throw error
  }
}