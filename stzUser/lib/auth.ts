// src/lib/auth.ts
import { betterAuth } from "better-auth"
import { reactStartCookies } from "better-auth/react-start"
import Database from "better-sqlite3"
import nodemailer, { type Transport } from "nodemailer"
import { transportOptions } from "../../stzUser/lib/mail-utilities"
// import { getEnvVar } from "./env"

// Create database instance
const database = new Database("sqlite.db")

const from = process.env.SMTP_FROM_ADDRESS

// new email address verification text
const verifyEmailSubject = 'Verify your email address'
const verifyEmailInstructions = 'Click the link below to verify your email address' // signup
const verifyEmailLinkText = 'Confirm Email Address' // signup

// change email address verification text
const verifyChangeEmailSubject = 'Verify your new email address'
const verifyChangeEmailInstructions = 'Click the link below to verify your new email address' // email change
const verifyChangeEmailLinkText = 'Confirm New Email Address'

// password Reset text
const passwordResetLinkText = 'Click the link to reset your password: '

const mailSender = transportOptions ? nodemailer.createTransport(transportOptions as unknown as Transport) : null

export const auth = betterAuth({
  database,
  user: {
    changeEmail: {
      enabled: true,
      /*
      sendChangeEmailVerification: async (
        { user, newEmail, url }
      ) => {
        if (!mailSender) return
        await mailSender.sendMail({
          to: user.email,
          from,
          subject: 'Approve email address change',
          text: `${changeEmailText1} ${newEmail} 

${changeEmailText2}
          ${url}`,
          html: `<p>${changeEmailText1} ${newEmail}</p>
          <br />
          <a href=${url}>${changeEmailText2}</a>`,
        })
      }
      */
    },
    deleteUser: {
      enabled: true
    }
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async (
      { user, url }
    ) => {
      if (!mailSender) return
      await mailSender.sendMail({
        to: user.email,
        from,
        subject: 'Reset your password',
        text: `${passwordResetLinkText} ${url}`,
        html: `<p>${passwordResetLinkText} ${url}</p>`,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({
        user,
        url,
      },
      request
    ) => {
      // console.log('sendVerificationEmail', { request })
      if (!mailSender) {
        console.error('Better Auth email verification: no mail sender');
        return
      }
      const isEmailChange = request?.url.includes('verify-email')
      let subject: string = isEmailChange ? verifyChangeEmailSubject : verifyEmailSubject
      let text: string = `${isEmailChange ? verifyChangeEmailInstructions : verifyEmailInstructions} ${user.email} 
      
      ${isEmailChange ? verifyChangeEmailLinkText : verifyEmailLinkText}
      ${url}`

      let html: string = `<p>${isEmailChange ? verifyChangeEmailInstructions : verifyEmailInstructions} ${user.email}</P>
                          <a href=${url}>${isEmailChange ? verifyChangeEmailLinkText : verifyEmailLinkText}</a>`

      await mailSender.sendMail({
        to: user.email,
        from,
        subject,
        text,
        html,
      })
    }
  },

  // socialProviders: {
  //    github: {
  //     // '!' tells the compiler this will be defined, so don't worry
  //     clientId: process.env.GITHUB_CLIENT_ID!,
  //     clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  //    }
  //},

  plugins: [
    reactStartCookies() // This plugin handles cookie setting for TanStack Start.  Leave it as the last plugin.
  ],
})