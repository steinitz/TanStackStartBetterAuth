import {FormFieldError} from "~stzUtils/components/FormFieldError";
import * as v from "valibot";
import {emailValidation, niceValidationIssues, sharedFormSubmission} from "~stzUser/lib/form";
import {type SyntheticEvent, useState} from "react";
import {useSession} from "~stzUser/lib/auth-client";
import {sendEmail} from "~stzUser/lib/mail-utilities";
import {ContactSent} from '~stzUser/components/ContactSent';
import {clientEnv} from '~stzUser/lib/env';

// TypeScript - suggested by Valibot docs, and comes in handy later
type ContactData = {
  name?: string;
  email?: string;
  message?: string;
};

export interface ContactFormProps {
  heading?: string;
  subheading?: string;
  submitButtonText?: string;
  successMessage?: string;
  onSuccess?: () => void;
  className?: string;
}

// Valibot
const ContactSchema = v.object({
  name: v.pipe(v.string('please tell us your first name')),
  email: emailValidation,
  message: v.pipe(v.string(), v.nonEmpty('please type a message')),
});

const from = clientEnv.SMTP_FROM_ADDRESS;
const companyName = clientEnv.COMPANY_NAME;

export const ContactForm = ({
  heading = "Contact Us",
  subheading,
  submitButtonText = "Send",
  successMessage,
  onSuccess,
  className
}: ContactFormProps) => {
  // validate the form fields
  const [validationIssues, setValidationIssues] = useState<any>({});

  const validateFormFields = (fields: ContactData) => {
    const valibotResult = v.safeParse(
      ContactSchema,
      fields,
      {abortPipeEarly: true} // max one issue per key
    );
    if (!valibotResult.success) {
      setValidationIssues(niceValidationIssues(valibotResult));
    }
    return valibotResult.success;
  };

  // these three help the user edit the message, if needed, for resending
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  // if the user is logged in, preload the fields with their name and email
  const {data: session} = useSession();

  // chooses whether to show a message form or a "message sent" confirmation
  const [messageSent, setMessageSent] = useState(false);

  // sends the contact message
  const sendMessage = async (event: SyntheticEvent<HTMLFormElement>) => {
    const fields = sharedFormSubmission(event);
    setName(fields.name as string);
    setEmail(fields.email as string);
    setMessage(fields.message as string);

    const isValid = validateFormFields(fields);
    if (isValid) {
      const message = (isHTML: boolean) => {
        let lineBreak = '\n';
        if (isHTML) {
          lineBreak = '<br>';
        }
        return `Contact-form support message from:
          ${lineBreak}
          ${fields.name}
          ${lineBreak}
          ${fields.email}
          ${lineBreak}${lineBreak}
          Message:
          ${lineBreak}
          ${fields.message}`;
      };
      
      const result = await sendEmail({
        data: {
          to: from,
          from,
          subject: `Contact form for ${companyName}`,
          text: `${message(false)}`,
          html: `<p>${message(true)}</p>`,
        }
      });

      if (result) {
        setMessageSent(true);
        onSuccess?.();
      } else {
        alert(`Message failed to send.`);
      }
    }
  };

  const clearValidationIssue = (key: any) => {
    setValidationIssues({...validationIssues, [key]: ''});
  };

  return (
    <section className={className}>
      {!messageSent ? (
        <>
          {heading && <h1 style={{textAlign: 'center'}}>{heading}</h1>}
          {subheading && <p style={{textAlign: 'center'}}>{subheading}</p>}
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
              onChange={() => clearValidationIssue('email')}
            />
            <FormFieldError message={validationIssues?.email}/>
          </label>
          <label>Message
            <textarea
              name="message"
              defaultValue={message ?? ''}
              rows={5}
              onChange={() => clearValidationIssue('message')}
            />
            <FormFieldError message={validationIssues?.message}/>
          </label>
          <button type="submit">{submitButtonText}</button>
        </form>
        </>
      ) : (
        <ContactSent 
          name={name} 
          email={email} 
          setMessageSent={setMessageSent}
          customMessage={successMessage}
        />
      )}
    </section>
  );
};