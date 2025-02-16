// /// <reference types="nodemailer" />
// const nodemailer = require("nodemailer");
import nodemailer from 'nodemailer';
// import type {Transporter, Transport} from 'nodemailer';

// TypeScript issues remain in transport options.  Codeium unable to help.

// https://www.nodemailer.com/smtp/
export const emailFromAddress = process.env.SMTP_FROM_ADDRESS
console.log({emailFromAddress})
console.log('mailSender', {smtpHost: process.env.SMTP_HOST})
// const transportOptions: Transport = {
//   // I don't think the nodemailer types are working so we need...
//   // @ts-ignore
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT,
//   secureConnection: true,
//   auth: {
//     // type: 'login', // defaults to 'login'
//     user: process.env.SMTP_USERNAME,
//     pass: process.env.SMTP_PASSWORD,
//   }
// }

export const mailSender = () => {} // nodemailer.createTransport(transportOptions as Transport)

// export const testMail = createServerFn({method: 'POST'})
//   .validator((d: string) => d)
//   .handler(async ({data}) => {
//     let result = {error: null, success: null}
//     // console.log('running testMail server function', /*{mailSender, data}*/)
//     mailSender.verify(function (error: any, success: any) {
//       if (error) {
//         console.log(error);
//         result.error = error
//       } else {
//         // console.log("mailSender.verify - ready to send messages");
//         result.success = success
//       }
//     });
//     return result
// })

