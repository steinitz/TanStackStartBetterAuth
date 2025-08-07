import nodemailer from "nodemailer"
import { createServerFn } from "@tanstack/react-start"
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

// Export transport options for use in auth.ts
export const transportOptions = isServer() ? getSmtpConfig() : null

// Send email server function
export const sendEmail = createServerFn({ method: 'POST' })
  .validator((d: any) => d)
  .handler(async ({ data }) => {
    console.log('🔥 sendEmail: SERVER FUNCTION CALLED with data:', { data });
    if (!isServer()) {
      console.log('❌ sendEmail: ERROR - not running on server');
      throw new Error('sendEmail must be called from the server')
    }
    console.log('✅ sendEmail: server check passed, creating transport');
    try {
      const mailSender = nodemailer.createTransport(getSmtpConfig())
      console.log('📮 sendEmail: transport created, sending mail...');
      const result = await mailSender?.sendMail(data)
      console.log('📬 sendEmail: mail sent, result:', result);
      console.log('✅ sendEmail: returning true');
      return true
    } catch (error) {
      console.log('❌ sendEmail: ERROR occurred:', error);
      throw error;
    }
  })

// Get email vars that are safe to expose to the client
export const getEmailEnvironmentVars = createServerFn({ method: 'POST' })
  .validator((d: any) => d)
  .handler(() => {
    return {
      from: getEnvVar('SMTP_FROM_ADDRESS'),
      companyName: getEnvVar('COMPANY_NAME'),
    }
  })

// Test message helper (server-side only)
export const testMessage = () => {
  if (!isServer()) {
    throw new Error('testMessage must be called from the server')
  }
  const fromAddress = getEnvVar('SMTP_FROM_ADDRESS')
  return {
    from: fromAddress,
    to: fromAddress,
    subject: "Nodemailer Test",
    text: "Plaintext version of the test message",
    html: "<p>HTML version of the test message</p>",
  }
}

// Verify mail server connection
export const verifyMailServer = createServerFn({ method: 'POST' })
  .validator((d: string) => d)
  .handler(async ({ data }) => {
    let result = { error: null, success: null }
    const mailSender = nodemailer.createTransport(getSmtpConfig())
    mailSender.verify(function (error: any, success: any) {
      if (error) {
        console.log(error)
        result.error = error
      } else {
        result.success = success
      }
    })
    return result
  })

// Send test email
export const sendTestEmail = createServerFn({ method: 'POST' })
  .validator((d: any) => d)
  .handler(async () => {
    const mailSender = nodemailer.createTransport(getSmtpConfig())
    const result = await mailSender?.sendMail(testMessage())
    const success = result.accepted[0] // return the first accepted email address
    return success
  })