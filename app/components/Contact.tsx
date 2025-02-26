import {createFileRoute, useRouter} from '@tanstack/react-router'
import {PasswordInput} from "~/components/InputFields";
import {SyntheticEvent, useState} from "react";
import {sharedFormSubmission} from "~/lib/form";
import * as v from "valibot";
import {resetPassword} from '~/lib/auth-client';

// TypeScript - sugggested by Valibot docs, and comes in handy later
type ContactData = {
  password: string;
};

// Valibot
const ContactSchema = v.object({
  password: v.pipe(v.string(), v.nonEmpty('password required')),
});

export const Contact = () => {
  const router = useRouter()

  const [validationIssues, setValidationIssues] = useState<any>({})
  const validateFormFields = (fields: ContactData) => {
    let isValid = true;

    try {
      const valibotResult = v.parse(
        ContactSchema,
        fields,
        {abortPipeEarly: true} // ensures each key, e.g. email, has only one error message
      )
      console.log('validating password\n', {valibotResult})
    } catch (error: any) {/*: ValiError<typeof SignupSchema>*/
      const flattenedIssues = v.flatten<typeof ContactSchema>(error.issues)
      setValidationIssues(flattenedIssues?.nested ?? {})
      isValid = false
    }

    return isValid
  }

  const handleSendMessage = async (
    event: SyntheticEvent<HTMLFormElement>
  ) =>{
    const fields = sharedFormSubmission(event);
    const newPassword = fields.password as string

    const isValid = validateFormFields(fields as ContactData)

    if (isValid) {
      alert('contact form not yet implemented')
    }
  }

  return (
    <>
      <div>
        <h1>Send Message</h1>
      </div>
      <section>
        <form onSubmit={handleSendMessage}>
          <PasswordInput
            validationIssue={validationIssues?.password}
          />
          <button type="submit">Send Message</button>
        </form>
      </section>
    </>
  )
}
