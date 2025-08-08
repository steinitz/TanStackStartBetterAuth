import {useNavigate} from '@tanstack/react-router';
import { Spacer } from '~stzUtils/components/Spacer';

export const contactSentConfirmationH1Default = "We've sent your message to our support team";

export interface ContactSentProps {
  name: string;
  email: string;
  setMessageSent: (sent: boolean) => void;
  customMessage?: string;
  wrongEmailText?: string;
  doneButtonText?: string;
  onDone?: () => void;
}

export const ContactSent = ({
  name, 
  email, 
  setMessageSent, 
  customMessage = contactSentConfirmationH1Default,
  wrongEmailText = "Wrong Email Address?",
  doneButtonText = "Done",
  onDone
}: ContactSentProps) => {
  const navigate = useNavigate();
  
  const handleDone = () => {
    if (onDone) {
      onDone();
    } else {
      navigate({to: "/"});
    }
  };
  
  return (
    <form>
      <h1>{customMessage}</h1>
      <p>Our support team will reply to the email you provided:</p>
      <p style={{marginLeft: '4rem'}}>{email}</p>
      <Spacer space={1} />
      <button
        type="reset"
        onClick={() => setMessageSent(false)}
      >
        {wrongEmailText}
      </button>
      <Spacer />
      <div style={{textAlign: "right"}}>
        <button
          type="submit"
          onClick={handleDone}
        >
          {doneButtonText}
        </button>
      </div>
    </form>
  );
};