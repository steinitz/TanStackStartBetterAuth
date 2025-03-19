import nodemailer, {type Transport} from "nodemailer";
// import {transportOptions} from "./mailSender";
import {createServerFn} from "@tanstack/react-start";
import {redirect} from '@tanstack/react-router'
import {serverEnv, clientEnv, isServer} from '../config/env'

// https://www.nodemailer.com/smtp/
export const transportOptions: Transport = {
  // I don't think the nodemailer types are working so we need...
  // @ts-ignore
  host: serverEnv.smtp.host,
  port: serverEnv.smtp.port,
  secure: true, // true for port 465, false for other ports
  auth: {
    // type: 'login', // defaults to 'login'
    user: serverEnv.smtp.username,
    pass: serverEnv.smtp.password,
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
    if (!isServer()) {
      throw new Error('sendEmail must be called from the server')
    }
    console.log('sending email', {/*mailSender, */ data})
    const mailSender = nodemailer.createTransport(transportOptions as Transport)
    const result = await mailSender?.sendMail(
      data,
    )
    const success = result.accepted[0] // return the first accepted email address
    return success
  }
)

// Get email vars that are safe to expose to the client
export const getEmailEnvironmentVars = createServerFn({method: 'POST'})
  .validator((d: any) => d)
  .handler(() => {
    return {
      from: clientEnv.smtp.fromAddress,
      companyName: clientEnv.company.name,
    }
  }
)

// must be called from the server
export const testMessage = () => {
  if (!isServer()) {
    throw new Error('testMessage must be called from the server')
  }
  return {
    from: clientEnv.smtp.fromAddress,
    to: clientEnv.smtp.fromAddress,
    subject: "Nodemailer Test",
    text: "Plaintext version of the test message",
    html: "<p>HTML version of the test message</p>",
  }
}

export const verifyMailServer = createServerFn({method: 'POST'})
  .validator((d: string) => d)
  .handler(async ({data}) => {
    let result = {error: null, success: null}
    // console.log('running verifyMailServer server function', /*{mailSender, data}*/)
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

export const sendTestEmail = createServerFn({method: 'POST'})
  .validator((d: any) => d)
  .handler(async () => {
    // console.log('sending testMessage', {/*mailSender, */ data})
    const mailSender = nodemailer.createTransport(transportOptions as Transport)
    const result = await mailSender?.sendMail(
      testMessage(),
    )
    const success = result.accepted[0] // return the first accepted email address
    return success
  }
)

// part of a hack to avoid Better Auth's two emails when
// the user changes their email address.
// doesn't work
/*
export const pretendToSendEmail = createServerFn(
  {method: 'GET' }
)
  .validator((d: any) => d)
  .handler(async ({data: url}) => {
    console.log('pretendToSendEmail', {url})
    throw redirect({
      href: url,
      headers: {
        'location': url,
      }
    })
})
*/

// graveyard

  // sendMailInnerFunction = (data: any) => {
  //   console.log('sending testMessage', {/*mailSender, */ data})
  //   const mailSender =
//   nodemailer.createTransport(transportOptions as Transport)
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
