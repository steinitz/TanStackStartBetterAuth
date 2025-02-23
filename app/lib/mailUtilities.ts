import nodemailer, {type Transport} from "nodemailer";
import {transportOptions} from "./mailSender";
import {createServerFn} from "@tanstack/start";

// must be called from the server or process.env... will be undefined
export const testMessage = () => {
  return {
    from: process.env.SMTP_FROM_ADDRESS,
    to: process.env.VITE_EMAIL_TEST_MESSAGE_RECIPIENT,
    subject: "Nodemailer Test",
    text: "Plaintext version of the test message",
    html: "<p>HTML version of the test message</p>",
  }
}

// if you try to refactor the handler out into, say, another file
// you might encounter the following error:
// Module "stream" has been externalized for browser compatibility
// followed by 100 other errors
// This may be due to nodemailer.createTransport being called on the
// client.  I tried a number of things, unsuccessfully, to prevent
// that from happening.

export const sendEmail = createServerFn({method: 'POST'})
  .validator((d: any) => d)
  .handler(async ({data}) => {
    console.log('sending testMessage', {/*mailSender, */ data})
    const mailSender = nodemailer.createTransport(transportOptions as Transport)
    mailSender?.sendMail(data, function (error: any, info: any) {
      if (error) {
        console.log(error);
      } else {
        console.log("mailSender.sendEmail - sent message", {info});
      }
    })
  }
)

export const testMail = createServerFn({method: 'POST'})
  .validator((d: string) => d)
  .handler(async ({data}) => {
    let result = {error: null, success: null}
    // console.log('running testMail server function', /*{mailSender, data}*/)
    const mailSender = nodemailer.createTransport(transportOptions as Transport)
    mailSender.verify(function (error: any, success: any) {
      if (error) {
        console.log(error);
        result.error = error
      } else {
        // console.log("mailSender.verify - ready to send messages");
        result.success = success
      }
    });
    return result
  }
)

// graveyard

  // sendMailInnerFunction = (data: any) => {
  //   console.log('sending testMessage', {/*mailSender, */ data})
  //   const mailSender = nodemailer.createTransport(transportOptions as Transport)
  //   mailSender?.sendMail(data, function (error: any, info: any) {
  //     if (error) {
  //       console.log(error);
  //     } else {
  //       // console.log("mailSender.sendEmail - sent message", {info});
  //     }
  //   })
  //}

      // from: import.meta.env.VITE_EMAIL_FROM_ADDRESS,
      // to: import.meta.env.VITE_EMAIL_TEST_MESSAGE_RECIPIENT,
      // from: process.env.VITE_EMAIL_FROM_ADDRESS,
      // to: process.env.VITE_EMAIL_TEST_MESSAGE_RECIPIENT,
