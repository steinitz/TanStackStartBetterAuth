import {FormFieldError} from "~stzUtils/components/FormFieldError";
import * as v from "valibot";
import {emailValidation, niceValidationIssues, sharedFormSubmission} from "~stzUser/lib/form";
import {type SyntheticEvent, useState} from "react";
import {useSession} from "~stzUser/lib/auth-client";
import {sendContactMessage} from "~stzUser/lib/mail-utilities";
import {logToServer} from "~stzUser/lib/logToServer";
import {ContactSent} from '~stzUser/components/Other/ContactSent';
import {clientEnv} from '~stzUser/lib/env';
import {Spacer} from "~stzUtils/components/Spacer";

// Test IDs - raw identifiers used in component data-testid attributes
export const contactFormTestIds = {
  contactForm: 'contact-form',
  submitButton: 'contact-submit-button'
} as const;

// Structural selectors - DOM-based selectors that can't be test IDs
export const contactFormSelectors = {
  nameInput: 'input[name="name"]',
  emailInput: 'input[name="email"]',
  messageTextarea: 'textarea[name="message"]',
  form: 'form'
} as const;

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

const supportAddress = clientEnv.SUPPORT_EMAIL_ADDRESS || clientEnv.SMTP_FROM_ADDRESS;

export const ContactForm = ({
  heading,
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
      try {
        // The envelope — recipient, sender, subject — is composed on the server, so this form can
        // only ever reach the site owner's mailbox. It used to be built here and handed to a
        // generic send endpoint, which let any caller choose where our mail server sent mail.
        await sendContactMessage({
          data: {
            name: fields.name as string,
            email: fields.email as string,
            message: fields.message as string,
          }
        });
        setMessageSent(true);
        onSuccess?.();
      } catch (error) {
        // sendContactMessage throws on failure — it never returns a falsy result — so the catch
        // is the only place a failed send surfaces. Record it as server-side telemetry,
        // carrying the sender's email and message so the note survives in a log the owner
        // can still read. We deliberately do NOT notify: the alert email would travel the
        // same SMTP path that just failed. Instead the alert hands the user the support
        // address, so they can reach us from their own mail client, which does not.
        void logToServer({
          data: {
            level: 'error',
            message: 'Contact form failed to send',
            context: {
              name: fields.name,
              email: fields.email,
              message: fields.message,
              error: error instanceof Error ? error.message : String(error),
            },
          },
        });
        alert(`Message failed to send. Please email us directly at ${supportAddress}.`);
      }
    }
  };

  const clearValidationIssue = (key: string) => {
    if (validationIssues[key]) {
      setValidationIssues({...validationIssues, [key]: ''});
    }
  };

  return (
    <section className={className}>
      {!messageSent ? (
        <>
          {heading && 
            <>
              <h1 style={{textAlign: 'center'}}>{heading}</h1>
              <Spacer />
            </>
          }
          {subheading && <p style={{textAlign: 'center'}}>{subheading}</p>}
          <form data-testid={contactFormTestIds.contactForm} onSubmit={sendMessage}>
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
          <button data-testid={contactFormTestIds.submitButton} type="submit">{submitButtonText}</button>
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