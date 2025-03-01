import {createFileRoute, useLoaderData, useNavigate} from '@tanstack/react-router'
import {FormFieldError} from "~/components/FormFieldError";
import * as v from "valibot";
import {emailValidation, niceValidationIssues, sharedFormSubmission} from "~/lib/form";
import {type SyntheticEvent, useState} from "react";

// import {transportOptions} from "~/lib/mailSender";

const thisPath = '/contact'

import {useSession} from "~/lib/auth-client";
import {getEmailEnvironmentVars, sendEmail} from "~/lib/mailUtilities";

// TypeScript - sugggested by Valibot docs, and comes in handy later
type ContactData = {
  name? : string;
  email: string;
  message: string;
};

// Valibot
const ContactSchema = v.object({
  name: v.pipe(v.string('please tell us your first name')),
  email: emailValidation,
  message: v.pipe(v.string(), v.nonEmpty('please type a message')),
});

const contact = () => {
  const navigation = useNavigate();
    const {from, companyName} = useLoaderData({from: thisPath})

  const {data: session} = useSession()
  // const {from, companyName} = await getEmailEnvironmentVars()

  // contact-sent can set the email param if the user selects Rewrite your message
  const {name, email}: {
    name?: string,
    email?: string,
  } = Route.useSearch()

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

  const sendMessage = async (event: SyntheticEvent<HTMLFormElement>) => {
    // console.log('contact sendMessage', {from, companyName})
    const fields = sharedFormSubmission(event);
    const isValid = validateFormFields(fields)
    if (isValid) {
      const message = (isHTML: boolean) => {
        let lineBreak = '\n'
        if  (isHTML) {
          lineBreak = '<br>'
        }
        return `Contact-form support message from:
        ${lineBreak}
        ${fields.name}
        ${lineBreak}
        ${fields.email}
        ${lineBreak}${lineBreak}
        Message:
        ${lineBreak}
        ${fields.message}`
    }
      const result = await sendEmail({
          data: {
            to: from,
            from,
            subject: `Contact form for ${companyName}`,
            text: `${message(false)}`,
            html: `<p>${message(true)}</p>`,
          }
        })
      // console.log('contact sendMessage', {result})
      if (result) {
        navigation({
          to: '/contact-sent',
          search: {
            email: fields.email,
            name: fields.name,
          }
        })
      }
      else {
        alert(`Message failed to send.`)
      }
    }
    else {
      // alert(`validation error`)
    }
  }

  return (
    <section>
      <form onSubmit={sendMessage}>
        <label>Name
          <input
            name="name"
            type="name"
            defaultValue={session?.user?.name ?? name ?? ''}
            autoComplete="on"
          />
          <FormFieldError message={validationIssues?.name}/>
        </label>
        <label>Email
          <input
            name="email"
            type="email"
            defaultValue={session?.user?.email ?? email ?? ''}
            autoComplete="on"
          />
          <FormFieldError message={validationIssues?.email}/>
        </label>
        <label>Message
          <textarea
            name="message"
            // type="email"
            defaultValue={''}
            rows={5}
          />
          <FormFieldError message={validationIssues?.message}/>
        </label>
        <button type="submit">Send</button>
      </form>
    </section>
  )
}

export const Route = createFileRoute(thisPath)({
  component: contact,
  loader: () => {
    // this seems to simple.  Why no async and await?
    // Note they throw an error anyway.
    return getEmailEnvironmentVars()
  }
})

