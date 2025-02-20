import {betterAuth} from "better-auth";
import {appDatabase} from "~/lib/database";
import nodemailer, {type Transport} from "nodemailer";
import {transportOptions} from "~/lib/mailSender";

const verificationLinkText = 'Click the link to verify your email:'

export const auth = betterAuth({
  database: appDatabase,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url, token }, request) => {
      console.log('sendVerificationEmail', {user, url, token, request})
      const mailSender = nodemailer.createTransport(transportOptions as Transport)
      const html = `<p>Click the link to verify your email: ${url}</p>`
      await mailSender.sendMail({
        to: user.email,
        from: 'steve@stzdev.com',
        subject: 'Verify your email address',
        text: `${verificationLinkText} ${url}`,
        html: `<p>${verificationLinkText} ${url}<p>`,
      })
    }
  }
  // socialProviders: {
  //    github: {
  //     // '!' tells the compiler this will be defined, so don't worry
  //     clientId: process.env.GITHUB_CLIENT_ID!,
  //     clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  //    }
  // },
})

