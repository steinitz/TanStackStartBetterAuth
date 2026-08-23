import nodemailer from "nodemailer"
import type { SendMailOptions } from "nodemailer"
import { isServer, getEnvVar } from './env'

/**
 * The SMTP primitive, and everything that reaches nodemailer.
 *
 * It lives in its own module for a bundling reason, learned the hard way. A `createServerFn`
 * handler is stripped from the client build and replaced by an RPC stub, so nodemailer used to be
 * shaken out of any module a browser loaded. A plain exported function is not stripped — so when
 * this was an ordinary export of `mail-utilities`, and `logToServer` imported it, nodemailer
 * followed `logToServer` into the client bundle and broke the app shell with "Class extends value
 * undefined". Every E2E spec that needed a working page failed.
 *
 * The rule: nothing a browser can load may import this module at the top level. Client-reachable
 * modules reach it with `await import('./mail.server')` inside a server-function handler, where
 * the stripping applies.
 */

// Validate SMTP configuration
function getSmtpConfig() {
  return {
    host: getEnvVar('SMTP_HOST'),
    port: Number(getEnvVar('SMTP_PORT')),
    secure: Number(getEnvVar('SMTP_PORT')) === 465, // true for port 465, false for other ports
    auth: {
      user: getEnvVar('SMTP_USERNAME'),
      pass: getEnvVar('SMTP_PASSWORD'),
    }
  } as const
}

const debugLog = false && process.env.NODE_ENV !== 'prod'

// Export transport options for use in auth.ts
export const transportOptions = isServer() ? getSmtpConfig() : null

/**
 * Send a message. The caller chooses the whole envelope, which is safe only because this is not an
 * endpoint: it used to be a `createServerFn` with an `(d: any) => d` validator, which let any
 * browser choose our recipient — an open relay on our own credentials. The `isServer()` guard
 * below did not prevent that and could not: it says where the handler runs, never who called it.
 *
 * Anything a browser can reach goes through a purpose-built server function instead, such as
 * sendContactMessage in `mail-utilities`, which builds the envelope itself.
 */
export async function sendEmail(message: SendMailOptions) {
  if (!isServer()) {
    throw new Error('sendEmail must be called from the server')
  }

  debugLog && console.log('SMTP Server:', getEnvVar('SMTP_HOST'))
  debugLog && console.log('SMTP Port:', getEnvVar('SMTP_PORT'))

  const mailSender = nodemailer.createTransport(getSmtpConfig())
  const result = await mailSender.sendMail(message)
  debugLog && console.log('sendEmail: result', result)
  return { result }
}

/** Mail-related env values, for server code that composes a message. Server-only, same as above. */
export function getEmailEnvironmentVars() {
  return {
    from: getEnvVar('SMTP_FROM_ADDRESS'),
    companyName: getEnvVar('COMPANY_NAME'),
    supportEmailAddress: getEnvVar('SUPPORT_EMAIL_ADDRESS'),
  }
}
