/// <reference types="nodemailer" />
import type {Transport} from 'nodemailer';

// TypeScript issues remain below in transportOptions. Codeium unable to help.

// https://www.nodemailer.com/smtp/
export const transportOptions: Transport = {
  // I don't think the nodemailer types are working so we need...
  // @ts-ignore
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secureConnection: true,
  auth: {
    // type: 'login', // defaults to 'login'
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  }
}

// Creating the mailSender below causes stream errors when it runs on the client.
// I tried 'use server' and, as you can see below, checking for the window var
// Neither helped.
// So, until, I can work out a way to prevent it from running on the client
// it will have to run on a case-by-case basis, usually inside createServerFn.
// At least we can reuse the transportOptions, above.

// export const mailSender = typeof window === 'undefined' ?
// nodemailer.createTransport(transportOptions as Transport) :
// undefined

