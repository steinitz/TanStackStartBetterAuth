import {betterAuth} from "better-auth";
import {appDatabase} from "~/lib/database.ts";

export const auth = betterAuth({
  database: appDatabase,
  emailAndPassword: {
    enabled: true
  },
  // emailVerification: {
  //   sendVerificationEmail: async ({ user, url, token }, request) => {
  //     console.log('sendVerificationEmail', {user, url, token, request})
  //     await sendEmail({
  //       data: {
  //         to: user.email,
  //         from: 'steve@stzdev.com',
  //         subject: 'Verify your email address',
  //         text: `Click the link to verify your email: ${url}`,
  //         html: "<p>`Click the link to verify your email: ${url}`</p>",
  //       }
  //     })
  //   }
  // }
  // socialProviders: {
  //    github: {
  //     // '!' tells the compiler this will be defined, so don't worry
  //     clientId: process.env.GITHUB_CLIENT_ID!,
  //     clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  //    }
  // },
})

