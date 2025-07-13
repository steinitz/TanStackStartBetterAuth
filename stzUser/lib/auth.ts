import {betterAuth} from "better-auth";
import {appDatabase} from "~stzUser/lib/database";
import nodemailer, {type Transport} from "nodemailer";
import {transportOptions} from "~/lib/mail-utilities";

const from = process.env.SMTP_FROM_ADDRESS
//console.log('auth', {from})

const verificationLinkText = 'Click the link to verify email address' // signup
const verificationLinkChangeText = 'Click the link to verify your new email address' // email change
const passwordResetLinkText = 'Click the link to reset your password: '
const changeEmailText = 'Click the link to change your email address to'

const mailSender = nodemailer.createTransport(transportOptions as unknown as Transport)

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

        // hack to avoid sending two emails when the user changes
        // their email address.  Also avoids the nasty situation
        // when the user no longer has access to the previous
        // email address
        // await pretendToSendEmail({data: url})
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
      {
        user,
        url,
        //token
      },
      request
    ) => {
      console.log('sendVerificationEmail', {request})
      let subject: string = 'Verify your email address'
      let text: string = `${verificationLinkText} ${user.email} ${url}`
      let html: string = `<p>${verificationLinkText} ${user.email} ${url}</p>`
      // tweak the wording if it's an email address change
      if(request?.url.includes('verify-email')) {
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
  // socialProviders: {
  //    github: {
  //     // '!' tells the compiler this will be defined, so don't worry
  //     clientId: process.env.GITHUB_CLIENT_ID!,
  //     clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  //    }
  //},
})

