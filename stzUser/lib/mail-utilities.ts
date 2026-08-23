import { createServerFn } from "@tanstack/react-start"
import * as v from "valibot"

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
//
// Note what this module does NOT import at the top level: nodemailer, or anything that reaches it.
// See the comment in `mail.server.ts` for why that matters — a browser loads this file.

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
    const { sendEmail, getEmailEnvironmentVars } = await import('./mail.server')
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
