import { test, expect } from './utils/console-buffer';
import {contactSentConfirmationH1Default} from '~stzUser/components/Other/ContactSent';
import { testConstants } from '~stzUser/test/constants';
import { contactFormSelectors } from '~stzUser/components/RouteComponents/ContactForm';

test.describe('Contact Form Success Message', () => {
  test('should show success message after form submission', async ({ page }) => {
    const email = `playwright-test@${testConstants.defaultUserDomain}`;
    const message = 'This is a test message from Playwright.';

    await page.goto('/contact');

    // Filling and submitting are retried together, and that IS the fix.
    //
    // This is a real <form onSubmit={sendMessage}> with a type="submit" button, so
    // a click that lands before React has attached the handler submits it
    // NATIVELY: the browser GETs /contact with the fields as a query string, the
    // page reloads, and the inputs come back empty. Nothing errors and nothing is
    // logged — the test simply waits out its timeout for a confirmation that was
    // never coming. It used to sleep a flat 500ms here and hope, which held up
    // alone and failed inside a full suite run, where the machine is busier.
    //
    // Diagnosed 2026-08-30 from the URL after a failed click, which carried
    // ?name=…&email=…&message=… — a query string that can only exist if the
    // browser submitted the form itself. That also rules out the other candidate,
    // React hydrating over values the test typed: the values were plainly still
    // there, or they could not have been serialised into the URL.
    //
    // The refill has to be INSIDE the block. After such a reload the inputs are
    // empty, so a retry that only clicked again would submit an empty form and
    // fail validation instead.
    //
    // It cannot double-send: a retry only happens when the previous click did
    // nothing whatsoever.
    //
    // Do not swap this for a longer sleep. The delay is not a known quantity, so
    // any number here is a guess with a worse failure mode than a retry.
    await expect(async () => {
      await page.fill(contactFormSelectors.nameInput, testConstants.defaultUserName);
      await page.fill(contactFormSelectors.emailInput, email);
      await page.fill(contactFormSelectors.messageTextarea, message);

      // These values travel to the server, so a fill that quietly did not take
      // would otherwise surface as a confusing send failure rather than as itself.
      expect(await page.inputValue(contactFormSelectors.nameInput)).toEqual(testConstants.defaultUserName);
      expect(await page.inputValue(contactFormSelectors.emailInput)).toEqual(email);
      expect(await page.inputValue(contactFormSelectors.messageTextarea)).toEqual(message);

      await page.click('button[type="submit"]');

      // Short, because an unhandled click shows up as this assertion expiring and
      // the whole attempt should be cheap to abandon. The budget that matters is
      // toPass's, and it stays well inside the 30s test timeout.
      await expect(page.locator('h1')).toContainText(contactSentConfirmationH1Default, { timeout: 3000 });
    }).toPass({ timeout: 15000 });
  });
});
