import type { EmailMessage } from "@cloudflare/workers-types";
import { validateEmailAlias } from "email-alias-core";
import { sanitizeHtml, sanitizeTextLinks } from "email-scrubber-core";
import PostalMime from "postal-mime";

/**
 * Defines the structure of the environment variables required by the worker.
 */
export interface Env {
  /** The single email address to forward the sanitized emails to. */
  FORWARD_EMAIL: string;
  /** The secret key used for HMAC signature verification. Must match the key used for alias generation. */
  SECRET_KEY: string;
  /** The domain for which email aliases are managed (e.g., "example.com"). */
  DOMAIN: string;
}

export default {
  /**
   * The main entry point for the Cloudflare Email Worker.
   * This function is triggered for each incoming email.
   */
  async email(
    message: EmailMessage,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    // 1. Verify the HMAC signature of the recipient email alias.
    // This is a critical security step to ensure the email is from a legitimate,
    // generated alias and not from a spammer guessing addresses on your domain.
    const isSignatureValid = await validateEmailAlias({
      secretKey: env.SECRET_KEY,
      fullAlias: message.to,
    });
    if (!isSignatureValid) {
      message.setReject(
        "Invalid recipient address. The alias signature is not valid.",
      );
      console.log(`Rejected email to invalid address: ${message.to}`);
      return;
    }

    try {
      // 3. Parse the raw email stream into structured data.
      // We cannot modify the email and use `message.forward()`, so we must
      // deconstruct it, sanitize it, and send it as a new email.
      const parser = new PostalMime();
      const email = await parser.parse(message.raw);

      // 4. Sanitize the email content.
      const sanitizedHtml = email.html ? sanitizeHtml(email.html) : undefined;
      const sanitizedText = email.text
        ? sanitizeTextLinks(email.text)
        : undefined;

      // 5. Send the sanitized email via an external sending service (MailChannels).
      // This is the standard pattern for sending modified emails from Cloudflare Workers.
      // The `personalizations` object also supports DKIM for custom domains.
      const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: env.FORWARD_EMAIL }] }],
          from: {
            email: message.from,
            name: email.from?.name || message.from.split("@")[0],
          },
          subject: email.subject || "No Subject",
          content: [
            ...(sanitizedText
              ? [{ type: "text/plain", value: sanitizedText }]
              : []),
            ...(sanitizedHtml
              ? [{ type: "text/html", value: sanitizedHtml }]
              : []),
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `Failed to send email via MailChannels. Status: ${response.status}. Body: ${errorBody}`,
        );
        // Even if sending fails, we can't `reject` here as the original message
        // has already been acknowledged and processed. We log the error instead.
      } else {
        console.log(
          `Successfully processed and forwarded email from ${message.from} to ${env.FORWARD_EMAIL}`,
        );
      }
    } catch (error) {
      console.error("Failed to process or forward email:", error);
      message.setReject("Failed to process email due to an internal error.");
    }
  },
};
