import { noValue } from "~/constants";
import { FormFieldError } from "~stzUtils/components/FormFieldError";

// Type for validation errors - can be either object with field keys or array format
type ValidationErrors = Record<string, string> | undefined

// export const errorMessageFor = (fieldName: string, validationErrors: any[] | undefined) => {
//   const {message} = validationErrors?.find(vError => vError.field === fieldName) ?? {};
//   return message || noValue;
// };

export const errorMessageFor = (fieldName: string, validationErrors: ValidationErrors) => {
  const message = validationErrors?.[fieldName] ?? noValue;
  return message;
}

export function ValidatedInput(props: {
  fieldName: string,
  validationErrors: ValidationErrors,
  defaultValue?: string,
  type?: string
}) {
  return <>
    <input
      type={props.type || "text"}
      name={props.fieldName}
      defaultValue={props.defaultValue}
    />
    <FormFieldError message={errorMessageFor(props.fieldName, props.validationErrors)} />
  </>
}

