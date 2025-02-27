import {createFileRoute, useLoaderData} from '@tanstack/react-router'
import {FormFieldError} from "~/components/FormFieldError";
import * as v from "valibot";
import {emailValidation, niceValidationIssues, sharedFormSubmission} from "~/lib/form";
import {type SyntheticEvent, useState} from "react";

// import {transportOptions} from "~/lib/mailSender";

import {useSession} from "~/lib/auth-client";
import {sendEmail} from "~/lib/mailUtilities";

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

const contact = ()=> {
  const {data: session} = useSession()
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

  const {from, companyName} = useLoaderData({from: '/contact'})
  const sendMessage = async (event: SyntheticEvent<HTMLFormElement>) => {
    const fields = sharedFormSubmission(event);
    const isValid = validateFormFields(fields)
    if (isValid) {
      const message = (isHTML: boolean) => {
        let lineBreak = '\n'
        if  (isHTML) {
          lineBreak = '<br>'
        }
        return `contact form message from${lineBreak}${fields.name}${lineBreak}${fields.email}:${lineBreak}${fields.message}`
    }
      await sendEmail({
          data: {
            to: from,
            from,
            subject: `Contact form for ${companyName}`,
            text: `${message(false)}`,
            html: `<p>${message(true)}</p>`,
          }
        })
      alert(`Message sent`)
    } else {
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
            defaultValue={''}
          />
          <FormFieldError message={validationIssues?.name}/>
        </label>
        <label>Email
          <input
            name="email"
            type="email"
            defaultValue={session?.user?.email ?? ''}
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

export const Route = createFileRoute('/contact')({
  component: contact,
  loader: async () => {
    return {
      from: process.env.SMTP_FROM_ADDRESS,
      companyName: process.env.COMPANY_NAME,
    }
  }
})

