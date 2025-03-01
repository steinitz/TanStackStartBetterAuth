import nodemailer, {type Transport} from "nodemailer";
// import {transportOptions} from "./mailSender";
import {createServerFn} from "@tanstack/start";

// TypeScript issues remain below in transportOptions. Codeium unable to help.

// https://www.nodemailer.com/smtp/
export const transportOptions: Transport = {
  // I don't think the nodemailer types are working so we need...
  // @ts-ignore
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secureConnection: true,
  auth: {
    // type: 'login', // defaults to 'login'
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
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
    const result = await mailSender?.sendMail(
     data,
    )
    const success = result.accepted[0] // return the first accepted email address
    return success
  }
)

// hack to reliably get email vars because the route loaders sometimes run on the client.  Sigh.
export const getEmailEnvironmentVars = createServerFn({method: 'POST'})
  .validator((d: any) => d)
  // How can this work without an async?
  .handler(() => {
    const result = {
      from: process.env.SMTP_FROM_ADDRESS,
      companyName: process.env.COMPANY_NAME,
    }
    return result
  }
)

// must be called from the server or process.env... will be undefined
// or, could use the getEmailEnvironmentVars hack above on the client
export const testMessage = () => {
  return {
    from: process.env.SMTP_FROM_ADDRESS,
    to: process.env.SMTP_FROM_ADDRESS,
    subject: "Nodemailer Test",
    text: "Plaintext version of the test message",
    html: "<p>HTML version of the test message</p>",
  }
}

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
