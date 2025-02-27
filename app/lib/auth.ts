import {betterAuth} from "better-auth";
import {appDatabase} from "~/lib/database";
import nodemailer, {type Transport} from "nodemailer";
import {transportOptions} from "~/lib/mailSender";

const from = process.env.SMTP_FROM_ADDRESS
//console.log('auth', {from})

const verificationLinkText = 'Click the link to verify email address'
const passwordResetLinkText = 'Click the link to reset your password: '
const changeEmailText = 'Click the link to change your email address to'

const mailSender = nodemailer.createTransport(transportOptions as Transport)

export const auth = betterAuth({
  database: appDatabase,
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async (
        { user, newEmail, url/*, token */}/*, request*/
      ) => {
        await mailSender.sendMail({
          to: user.email,
          from,
          subject: 'Approve email address change',
          text: `${changeEmailText} ${newEmail} ${url}`,
          html: `<p>${changeEmailText} ${newEmail} ${url}</p>`,
        })
      }
    }
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async (
      {user, url/*, token*/}/*, request*/
    ) => {
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
      {user, url/*, token*/}, /*request*/
    ) => {
      await mailSender.sendMail({
        to: user.email,
        from,
        subject: 'Verify your email address',
        text: `${verificationLinkText} ${user.email} ${url}`,
        html: `<p>${verificationLinkText} ${user.email} ${url}</p>`,
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
})

