
import {mailSender} from "~/lib/mailSender.ts";

console.log('mailUtilities',{sender_client: import.meta.env.VITE_EMAIL_FROM_ADDRESS})
console.log('mailUtilities',{sender_server: process.env.VITE_EMAIL_FROM_ADDRESS})

let testMessage: any
let sendMailInnerFunction: any

// if (typeof window === 'undefined') {
//   const stream = (await import('stream')).default;

  testMessage = () => {
    return {
      // from: import.meta.env.VITE_EMAIL_FROM_ADDRESS,
      // to: import.meta.env.VITE_EMAIL_TEST_MESSAGE_RECIPIENT,
      // from: process.env.VITE_EMAIL_FROM_ADDRESS,
      // to: process.env.VITE_EMAIL_TEST_MESSAGE_RECIPIENT,
      from: 'steve@stzdev.com',
      to: 'steve@stzdev.com',
      subject: "Nodemailer Test",
      text: "Plaintext version of the test message",
      html: "<p>HTML version of the test message</p>",
    }
  }

  sendMailInnerFunction = (data: any) => {
    console.log('sending testMessage', {/*mailSender, */ data})
    // mailSender.sendMail(data, function (error: any, info: any) {
    //   if (error) {
    //     console.log(error);
    //   } else {
    //     // console.log("mailSender.sendEmail - sent message", {info});
    //   }
    // })
  }
// }

export {testMessage, sendMailInnerFunction}
