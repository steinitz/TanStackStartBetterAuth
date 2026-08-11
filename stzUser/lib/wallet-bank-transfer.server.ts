import * as v from 'valibot'
import { assertValidPurchaseConfiguration, clientEnv } from './env'
import { sendEmail } from './mail-utilities'
import { BankTransferRequestSchema } from './wallet'

export async function requestBankTransferForUser(
  user: { id: string; email: string },
  input: unknown,
) {
  // Before the email, and before the arithmetic that feeds it: this path prices the request
  // itself, so an unset CREDIT_PRICE_AUD would otherwise send support a request for AUD$NaN.
  assertValidPurchaseConfiguration()

  // Repeat validation next to the email side effect so no future internal caller can bypass it.
  const data = v.parse(BankTransferRequestSchema, input)
  const cost = (data.amount * clientEnv.CREDIT_PRICE_AUD).toFixed(2)

  await sendEmail({
    data: {
      to: clientEnv.SUPPORT_EMAIL_ADDRESS,
      from: clientEnv.SUPPORT_EMAIL_ADDRESS,
      subject: `💰 Credit Purchase Request: ${user.email}`,
      text: `User ${user.email} (ID: ${user.id}) has requested to purchase ${data.amount} credits for AUD$${cost} via bank transfer.`,
      html: `
          <h3>Credit Purchase Request</h3>
          <p><strong>User:</strong> ${user.email}</p>
          <p><strong>User ID:</strong> ${user.id}</p>
          <p><strong>Requested Credits:</strong> ${data.amount}</p>
          <p><strong>Total Cost:</strong> AUD$${cost}</p>
          <p>Please wait for payment verification before manually granting credits via the Admin panel.</p>
        `,
    },
  })

  return { success: true }
}
