// src/lib/auth.ts
import { betterAuth } from "better-auth"
import { reactStartCookies } from "better-auth/react-start"
import { admin } from "better-auth/plugins"
import { createAccessControl } from "better-auth/plugins/access"
import { adminAc } from "better-auth/plugins/admin/access"
import nodemailer, { type Transport } from "nodemailer"
import { transportOptions } from "../../stzUser/lib/mail-utilities"
import { routeStrings } from "~/constants"
import { appDatabase } from "./database"

import {isPlaywrightRunning} from "~stzUser/test/e2e/utils/isPlaywrightRunning";
import { EmailTester } from "~stzUser/test/e2e/utils/EmailTester";
// import { getEnvVar } from "./env"

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

// Article about setting up User Roles - https://www.answeroverflow.com/m/1360090099764826232


export const auth = betterAuth({
  database: appDatabase,
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async (
        { user, newEmail, url }
      ) => {
        // Check if we're in a Playwright test environment
        if (isPlaywrightRunning()) {
          console.log('🎭 Playwright test detected - using EmailTester for change email verification');
          
          let subject: string = verifyChangeEmailSubject
          let text: string = `${verifyChangeEmailInstructions} ${newEmail} 
          
          ${verifyChangeEmailLinkText}
          ${url}`

          let html: string = `<p>${verifyChangeEmailInstructions} ${newEmail}</p>
                              <br />
                              <a href=${url}>${verifyChangeEmailLinkText}</a>`

          await EmailTester.sendTestEmail({
            to: newEmail, // Send to the new email address, not the old one
            from: from || 'test@example.com',
            subject,
            text,
            html,
          });
          
          return; // Skip production email sending during tests
        }

        // Send verification email to the NEW email address for email changes
        if (!mailSender) return
        await mailSender.sendMail({
          to: newEmail, // Send to the new email address, not the old one
          from,
          subject: verifyChangeEmailSubject /* + ' - sendChangeEmailVerification' */,
          text: `${verifyChangeEmailInstructions} ${newEmail} 

          ${verifyChangeEmailLinkText}
          ${url}`,
          html: `<p>${verifyChangeEmailInstructions} ${newEmail}</p>
          <br />
          <a href=${url}>${verifyChangeEmailLinkText}</a>`,
        })
      }
    },
    deleteUser: {
      enabled: true
    }
  },
  emailAndPassword: {
    enabled: true,
    // WORKAROUND: Set to false due to Better Auth bug where sendOnSignUp affects email change verification
    // See: https://github.com/better-auth/better-auth/issues/2538
    // This should be true for proper security, but causes email change verification to fail
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
    // WORKAROUND: Set to false due to Better Auth bug where this setting suppresses ALL email verification
    // including email change verification. Should be true for signup verification.
    // See: https://github.com/better-auth/better-auth/issues/2538
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({
      user,
      url,
    },
      request
    ) => {
      // Email verification data is available here:
      // - user: contains email and id
      // - url: the verification URL
      // - text/html: the email content

      if (!mailSender) {
        console.error('Better Auth email verification: no mail sender');
        return
      }

      // only send the email if it's not a change email request
      // this is fragile but works for now because the url includes 'callbackURL=/auth/profile'
      const isEmailChange = request?.url.includes(routeStrings.profile)
      if (!isEmailChange || isPlaywrightRunning()) {
        // Check if we're in a Playwright test environment
        if (isPlaywrightRunning()) {
          console.log('🎭 Playwright test detected - using EmailTester for verification email');
          
          let subject: string = verifyEmailSubject
          let text: string = `${verifyEmailInstructions} ${user.email} 
          
          ${verifyEmailLinkText}
          ${url}`

          let html: string = `<p>${verifyEmailInstructions} ${user.email}</P>
                              <a href=${url}>${verifyEmailLinkText}</a>`

          await EmailTester.sendTestEmail({
            to: user.email,
            from: from || 'test@example.com',
            subject,
            text,
            html,
          });
          

          return; // Skip production email sending during tests
        }

        if (!isEmailChange) {
          let subject: string = verifyEmailSubject
          let text: string = `${verifyEmailInstructions} ${user.email} 
          
          ${verifyEmailLinkText}
          ${url}`

          let html: string = `<p>${verifyEmailInstructions} ${user.email}</P>
                              <a href=${url}>${verifyEmailLinkText}</a>`

          await mailSender.sendMail({
            to: user.email,
            from,
            subject,
            text,
            html,
          })
        }
      }
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
    admin({
      ac: createAccessControl({
        ...adminAc.statements
      })
    }), // Admin plugin for user management
    reactStartCookies() // This plugin handles cookie setting for TanStack Start.  Leave it as the last plugin.
  ],
})
