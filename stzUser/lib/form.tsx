import { SyntheticEvent } from "react";
import * as v from "valibot";

export const fieldsFromFormData = (formData: FormData) => {
  return (
    // this version puts each values in an array to support, say, multiple "name" fields
    // const fields = Object.fromEntries([...formData.keys()].map(
    // key => [key, formData.getAll(key)]))

    // this simpler version apparently won't work with checkboxes or, of course, mutiples
    Object.fromEntries(formData.entries())
  )
}

export const preventDefaultFormSubmission  = (
  event: SyntheticEvent
): void => {
  // prevent default form submission behavior
  event.preventDefault();
  event.stopPropagation();
}

export const sharedFormSubmission = (
  event: SyntheticEvent<HTMLFormElement>
): Record<string, FormDataEntryValue> => {
  preventDefaultFormSubmission(event)
  // extract field values from form
  // maybe should return FormData too
  const formData = new FormData(event.currentTarget);
  const fields = fieldsFromFormData(formData)
  // console.log('sharedFormSubmission', {fields})

  return fields;
}

export const niceValidationIssues = (valibotResult: { issues: [v.BaseIssue<unknown>, ...v.BaseIssue<unknown>[]]; }) => {
  const flattenedIssues = v.flatten (valibotResult.issues)
  return flattenedIssues?.nested ?? {}
}

export const emailValidation = v.pipe(
    v.string('email must be a string'),
    v.nonEmpty('email address required'),
    v.email('invalid email'),
  )
