// src/lib/auth.ts
import { betterAuth } from "better-auth"
import { reactStartCookies } from "better-auth/react-start"
import Database from "better-sqlite3"
import nodemailer, { type Transport } from "nodemailer"
import { transportOptions } from "./mail-utilities"
import { getEnvVar } from "./env"

// Create database instance
const database = new Database("sqlite.db")

const from = process.env.SMTP_FROM_ADDRESS

const verificationLinkText = 'Click the link to verify email address' // signup
const verificationLinkChangeText = 'Click the link to verify your new email address' // email change
const passwordResetLinkText = 'Click the link to reset your password: '
const changeEmailText = 'Click the link to change your email address to'

const mailSender = transportOptions ? nodemailer.createTransport(transportOptions as unknown as Transport) : null

export const auth = betterAuth({
  database,
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async (
        { user, newEmail, url }
      ) => {
        if (!mailSender) return
        await mailSender.sendMail({
          to: user.email,
          from,
          subject: 'Approve email address change',
          text: `${changeEmailText} ${newEmail} ${url}`,
          html: `<p>${changeEmailText} ${newEmail} ${url}</p>`,
        })
      }
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
    sendVerificationEmail: async (
      {
        user,
        url,
      },
      request
    ) => {
      if (!mailSender) return
      console.log('sendVerificationEmail', { request })
      let subject: string = 'Verify your email address'
      let text: string = `${verificationLinkText} ${user.email} ${url}`
      let html: string = `<p>${verificationLinkText} ${user.email} ${url}</p>`
      // tweak the wording if it's an email address change
      if (request?.url.includes('verify-email')) {
        subject = 'Verify your new email address'
        text = `${verificationLinkChangeText} ${user.email} ${url}`
        html = `<p>${verificationLinkChangeText} ${user.email} ${url}</p>`
      }
      await mailSender.sendMail({
        to: user.email,
        from,
        subject,
        text,
        html,
      })
    }
  },
  plugins: [
    reactStartCookies() // This plugin handles cookie setting for TanStack Start
  ],
})