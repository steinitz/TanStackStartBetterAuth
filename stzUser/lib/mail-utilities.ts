import nodemailer from "nodemailer"
import { createServerFn } from "@tanstack/react-start"
import { isServer, getEnvVar } from './env'

import {isPlaywrightRunning} from "~stzUser/test/e2e/utils/isPlaywrightRunning";
import { EmailTester } from "~stzUser/test/e2e/utils/EmailTester"

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

// Send email server function with automatic test/production routing
export const sendEmail = createServerFn({ method: 'POST' })
  .validator((d: any) => d)
  .handler(async ({ data }) => {
    debugLog && console.log('sendEmail: server function called with data:', { data });

    if (!isServer()) {
      console.warn('❌ sendEmail: ERROR - not running on server');
      throw new Error('sendEmail must be called from the server')
    }
    
    debugLog && console.log('✅ sendEmail: server check passed');
    
    try {
      // Handle email differently based on environment
      if (isPlaywrightRunning()) {
        console.log('✅ sendEmail: test environment, using EmailTester');
        await EmailTester.sendTestEmail(data)
      } 
      else {
        // console.log('✅ sendEmail: production environment, using nodemailer');
        const mailSender = nodemailer.createTransport(getSmtpConfig())
        debugLog && console.log('📮 sendEmail: transport created, sending mail...');
        const result = await mailSender?.sendMail(data)
        debugLog && console.log('📬 sendEmail: mail sent, result:', result);
      }
      
      debugLog && console.log('✅ sendEmail: returning true');
      return true
    }
    catch (error) {
        console.error('❌ sendEmail: ERROR occurred:', error);
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
      supportEmailAddress: getEnvVar('SUPPORT_EMAIL_ADDRESS'),
    }
  })

// Test message helper (server-side only)
export const testMessage = () => {
  if (!isServer()) {
    throw new Error('testMessage must be called from the server')
  }
  const fromAddress = getEnvVar('SUPPORT_EMAIL_ADDRESS')
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
