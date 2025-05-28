import {createFileRoute, useLoaderData} from '@tanstack/react-router'
import {FormFieldError} from "~/components/FormFieldError";
import * as v from "valibot";
import {emailValidation, niceValidationIssues, sharedFormSubmission} from "~/lib/form";
import {type SyntheticEvent, useState} from "react";

const thisPath = '/_app/contact'

import {useSession} from "~/lib/auth-client";
import {getEmailEnvironmentVars, sendEmail} from "~/lib/mailUtilities";
import {ContactSent} from '~/components/ContactSent';
import {
  clientEnv,
  getEnvVar } from '~/config/env';

// TypeScript - sugggested by Valibot docs, and comes in handy later
type ContactData = {
  name? : string;
  email?: string;
  message?: string;
};

// Valibot
const ContactSchema = v.object({
  name: v.pipe(v.string('please tell us your first name')),
  email: emailValidation,
  message: v.pipe(v.string(), v.nonEmpty('please type a message')),
});

const from = clientEnv.SMTP_FROM_ADDRESS
const companyName = clientEnv.COMPANY_NAME

console.log('contact', {from, companyName})

const contact = () => {
  // validate the form fields
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

  //
  // big block of code: message state and acutal emailing
  //

  // const {from, companyName} = useLoaderData({from: thisPath})
  // these three help the user edit the message, if needed, for resending
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  // if the user is logged in, preload the fields with their name and email
  const {data: session} = useSession()

  // chooses whether to show a message form or a "message sent" confirmation
  const [messageSent, setMessageSent] = useState(false)

  // sends the contact message
  const sendMessage = async (event: SyntheticEvent<HTMLFormElement>) => {
    const fields = sharedFormSubmission(event);
    setName(fields.name as string)
    setEmail(fields.email as string)
    setMessage(fields.message as string)

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

      if (result) {
        setMessageSent(true)
      }
      else {
        alert(`Message failed to send.`)
      }
    }
    else {
      // alert(`validation error`)
    }
  }

  const clearValidationIssue = (key: any) => {
    setValidationIssues({...validationIssues, [key]: ''})
  }

  return (
    <section>
      {!messageSent ?
        <form onSubmit={sendMessage}>
          <label>Name
            <input
              name="name"
              type="name"
              defaultValue={session?.user?.name ?? name ??''}
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
              onChange={()=> clearValidationIssue('email')}
            />
            <FormFieldError message={validationIssues?.email}/>
          </label>
          <label>Message
            <textarea
              name="message"
              defaultValue={message ?? ''}
              rows={5}
              onChange={()=> clearValidationIssue('message')}
            />
            <FormFieldError message={validationIssues?.message}/>
          </label>
          <button type="submit">Send</button>
        </form>
        :
        <ContactSent name={name} email={email} setMessageSent={setMessageSent}/>
      }
    </section>
  )
}

export const Route = createFileRoute(thisPath)({
  component: contact,
  // loader: () => {
  //   // this seems too simple.  Why no async and await?
  //   // Note async and await throw an error anyway.
  //   return getEmailEnvironmentVars()
  // }
})

