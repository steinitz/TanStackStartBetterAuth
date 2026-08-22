import nodemailer from "nodemailer"
import type { SendMailOptions } from "nodemailer"
import { createServerFn } from "@tanstack/react-start"
import * as v from "valibot"
import { isServer, getEnvVar } from './env'

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
 * The SMTP primitive. Deliberately NOT a createServerFn.
 *
 * It used to be one, which made it an HTTP endpoint any browser could POST to — and because it
 * passes its whole argument to nodemailer, the caller chose the recipient, sender, subject and
 * body. That is an open mail relay on our own credentials, and the `isServer()` check below did
 * not prevent it: that check says where the handler RUNS, never who called it.
 *
 * The rule this file now keeps: the caller may choose the envelope only if the caller is our own
 * server code. Anything a browser can reach goes through a purpose-built server function, such as
 * sendContactMessage below, which builds the envelope itself.
 *
 * So: import this only from server modules. The guard is a tripwire for an accidental client
 * import, not a security boundary — the boundary is that there is no longer a URL.
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

// Contact form
// ============
// The one mail endpoint a browser can reach, and the only one that needs to be: a visitor sending
// a contact message is signed out more often than not, so this is deliberately unauthenticated.
//
// What makes it safe is not who calls it but what it cannot do. The recipient and the sender come
// from env, and the subject is composed here, so every message this endpoint can produce lands in
// the site owner's mailbox. A caller supplies words, never an envelope.
//
// The length caps are the other half. They are generous for a real message and they stop the body
// being used as a payload; without them "words only" still ships a megabyte of anything.

const contactNameMax = 200
const contactEmailMax = 320  // the practical maximum length of an address, per RFC 5321
const contactMessageMax = 5000

const ContactMessageSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.nonEmpty('please tell us your name'), v.maxLength(contactNameMax)),
  email: v.pipe(v.string(), v.trim(), v.email('please check the email address'), v.maxLength(contactEmailMax)),
  message: v.pipe(v.string(), v.trim(), v.nonEmpty('please type a message'), v.maxLength(contactMessageMax)),
})

/** The visitor's own words reach us as HTML, so anything that could be markup is neutralised first. */
function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const sendContactMessage = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => v.parse(ContactMessageSchema, data))
  .handler(async ({ data }) => {
    const env = getEmailEnvironmentVars()
    const to = env.supportEmailAddress || env.from

    // Stamp the signed-in user's account id at the foot, so a site owner can discover their own id
    // (for ADMIN_USER_IDS) by sending themselves a contact message. Read from the session rather
    // than the typed email field, so it always names the authenticated account, and omitted when
    // signed out — which is the ordinary case here.
    const { getOptionalSessionUser } = await import('./server-auth')
    const sender = await getOptionalSessionUser()
    const senderIdLine = sender ? `\n\n—\nSender account ID: ${sender.id}` : ''

    const lines = [
      'Contact-form support message from:',
      data.name,
      data.email,
      '',
      'Message:',
      data.message,
    ].join('\n')

    await sendEmail({
      to,
      from: env.from,
      replyTo: data.email,
      subject: `Contact form for ${env.companyName}`,
      text: `${lines}${senderIdLine}`,
      html: `<p>${escapeHtml(`${lines}${senderIdLine}`).replace(/\n/g, '<br>')}</p>`,
    })

    return { sent: true }
  })
