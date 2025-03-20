import nodemailer from "nodemailer";
// import {transportOptions} from "./mailSender";
import {createServerFn} from "@tanstack/react-start";
import {redirect} from '@tanstack/react-router'
import {isServer, getEnvVar} from '../config/env'

// Validate SMTP configuration
function getSmtpConfig() {
  return {
    host: getEnvVar('SMTP_HOST', true),
    port: Number(getEnvVar('SMTP_PORT', true)),
    secure: true, // true for port 465, false for other ports
    auth: {
      user: getEnvVar('SMTP_USERNAME', true),
      pass: getEnvVar('SMTP_PASSWORD', true),
    }
  } as const
}

// https://www.nodemailer.com/smtp/
export const transportOptions = isServer() ? getSmtpConfig() : null

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
    console.log('sending email', {data})
    const mailSender = nodemailer.createTransport(getSmtpConfig())
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
      from: getEnvVar('SMTP_FROM_ADDRESS', true),
      companyName: getEnvVar('COMPANY_NAME', true),
    }
  }
)

// must be called from the server
export const testMessage = () => {
  if (!isServer()) {
    throw new Error('testMessage must be called from the server')
  }
  const fromAddress = getEnvVar('SMTP_FROM_ADDRESS', true)
  return {
    from: fromAddress,
    to: fromAddress,
    subject: "Nodemailer Test",
    text: "Plaintext version of the test message",
    html: "<p>HTML version of the test message</p>",
  }
}

export const verifyMailServer = createServerFn({method: 'POST'})
  .validator((d: string) => d)
  .handler(async ({data}) => {
    let result = {error: null, success: null}
    const mailSender = nodemailer.createTransport(getSmtpConfig())
    mailSender.verify(function (error: any, success: any) {
      if (error) {
        console.log(error);
        result.error = error
      } else {
        result.success = success
      }
    });
    return result
  }
)

export const sendTestEmail = createServerFn({method: 'POST'})
  .validator((d: any) => d)
  .handler(async () => {
    const mailSender = nodemailer.createTransport(getSmtpConfig())
    const result = await mailSender?.sendMail(
      testMessage(),
    )
    const success = result.accepted[0] // return the first accepted email address
    return success
  }
)
