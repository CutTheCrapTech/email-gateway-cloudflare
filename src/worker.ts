import type { ForwardableEmailMessage } from "@cloudflare/workers-types";
import { validateEmailAlias } from "email-alias-core";

/**
 * Defines the structure of the environment variables required by the worker.
 */
export interface Env {
  /**
   * A JSON string mapping secret keys to destination email addresses.
   * e.g., '{"secret1":"user1@example.com", "secret2":"user2@example.com"}'
   */
  EMAIL_SECRET_MAPPING: string;

  /**
   * A JSON string for miscellaneous options.
   * e.g., '{"default_email_address":"default@example.com", "ignore_email_checks":["test@example.com"]}'
   */
  EMAIL_OPTIONS: string;

  /** The domain for which email aliases are managed (e.g., "example.com"). */
  DOMAIN: string;
}

/**
 * Defines the structure of the EMAIL_OPTIONS environment variable.
 */
interface EmailOptions {
  default_email_address: string;
  ignore_email_checks?: string[];
}

/**
 * Safely forwards email with error logging
 */
async function safeForward(
  message: ForwardableEmailMessage,
  destination: string,
): Promise<void> {
  try {
    await message.forward(destination);
  } catch (error) {
    console.error(`Failed to forward email to ${destination}:`, error);
    // If forward fails, we can't do much else - just log it
  }
}

export default {
  /**
   * The main entry point for the Cloudflare Email Worker.
   * This function is triggered for each incoming email.
   */
  async email(
    message: ForwardableEmailMessage,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    // Input validation
    if (!message.to || !message.from) {
      message.setReject("Invalid email message: missing to/from fields.");
      return;
    }

    if (!env.EMAIL_OPTIONS) {
      console.error("EMAIL_OPTIONS environment variable is not set");
      message.setReject("Configuration error: EMAIL_OPTIONS not configured.");
      return;
    }

    let options: EmailOptions;
    try {
      options = JSON.parse(env.EMAIL_OPTIONS);
    } catch (error) {
      console.error("Failed to parse EMAIL_OPTIONS:", error);
      message.setReject("Configuration error: Invalid EMAIL_OPTIONS JSON.");
      return;
    }

    const { default_email_address, ignore_email_checks = [] } = options;

    if (!default_email_address) {
      message.setReject(
        "Configuration error: No default email address specified.",
      );
      return;
    }

    if (ignore_email_checks.includes(message.from)) {
      console.log(
        `Sender ${message.from} is in the ignore list. Forwarding to default address.`,
      );
      await safeForward(message, default_email_address);
      return;
    }

    if (!env.EMAIL_SECRET_MAPPING) {
      console.error("EMAIL_SECRET_MAPPING is not set");
      console.log(
        "No secret mapping configured. Forwarding to default address.",
      );
      await safeForward(message, default_email_address);
      return;
    }

    let secretKeyMap: Record<string, string>;
    try {
      secretKeyMap = JSON.parse(env.EMAIL_SECRET_MAPPING);
    } catch (error) {
      console.error("Failed to parse EMAIL_SECRET_MAPPING:", error);
      console.log(
        "Invalid secret mapping JSON. Forwarding to default address.",
      );
      await safeForward(message, default_email_address);
      return;
    }

    try {
      const destinationEmail = await validateEmailAlias({
        keysRecipientMap: secretKeyMap,
        fullAlias: message.to,
      });

      if (destinationEmail) {
        console.log(
          `Forwarding email for alias ${message.to} to ${destinationEmail}`,
        );
        await safeForward(message, destinationEmail);
      } else {
        console.log(
          `No valid destination email for alias ${message.to}. Forward to default address ${default_email_address}.`,
        );
        await safeForward(message, default_email_address);
      }
    } catch (error) {
      console.error(
        `Error validating alias ${message.to} with a secret:`,
        error,
      );
      console.log(`Forward to default address ${default_email_address}.`);
      await safeForward(message, default_email_address);
    }
  },
};
