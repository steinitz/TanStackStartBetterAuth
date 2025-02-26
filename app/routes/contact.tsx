import {createFileRoute} from '@tanstack/react-router'
import {FormFieldError} from "~/components/FormFieldError";
import * as v from "valibot";
import {emailValidation, niceValidationIssues, sharedFormSubmission} from "~/lib/form";
import {useState} from "react";

// TypeScript - sugggested by Valibot docs, and comes in handy later
type ContactData = {
  name: string;
  email: string;
  message: string;
};

// Valibot
const ContactSchema = v.object({
  name: v.pipe(v.string('please tell us your first name')),
  email: emailValidation,
  message: v.pipe(v.string(), v.nonEmpty('please type a message')),
});

const contact = ()=> {


  const [validationIssues, setValidationIssues] = useState<any>({})
  const validateFormFields = (fields: ContactData) => {
    const valibotResult = v.safeParse(
    ContactSchema,
    fields,
    {abortPipeEarly: true} // max one issue per key
    )
    if (!valibotResult.success) {
      setValidationIssues(niceValidationIssues(valibotResult))
    }
    return valibotResult.success
  }

  const sendMessage = (event) => {
    const fields = sharedFormSubmission(event);
    const isValid = validateFormFields(fields)
    if (isValid)
      alert(`pretending to send message: ${fields.message}`)
    else
      alert(`validation error`)
  }

  return (
    <section>
      <form onSubmit={sendMessage}>
        <label>Name
          <input
            name="name"
            type="name"
            defaultValue={''}
          />
          <FormFieldError message={validationIssues?.name}/>
        </label>
        <label>Email
          <input
            name="email"
            type="email"
            defaultValue={''}
          />
          <FormFieldError message={validationIssues?.email}/>
        </label>
        <label>Message
          <textarea
            name="message"
            // type="email"
            defaultValue={''}
          />
          <FormFieldError message={validationIssues?.message}/>
        </label>
        <button type="submit">Send</button>
      </form>
    </section>
  )
}

export const Route = createFileRoute('/contact')({
  component: contact,
})

