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
  defaultEmailAddress: string,
): Promise<void> {
  try {
    await message.forward(destination);
  } catch (error) {
    console.error(`Failed to forward email to ${destination}:`, error);
    if (destination !== defaultEmailAddress) {
      console.log(
        `Attempting to forward to default address ${defaultEmailAddress} after initial failure.`,
      );
      try {
        await message.forward(defaultEmailAddress);
      } catch (defaultForwardError) {
        console.error(
          `Failed to forward email to default address ${defaultEmailAddress}:`,
          defaultForwardError,
        );
      }
    }
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
      console.error("Invalid email message: missing to/from fields.");
      return;
    }

    if (!env.EMAIL_OPTIONS) {
      console.error("EMAIL_OPTIONS environment variable is not set");
      return;
    }

    let options: EmailOptions;
    try {
      options = JSON.parse(env.EMAIL_OPTIONS);
    } catch (error) {
      console.error("Failed to parse EMAIL_OPTIONS:", error);
      return;
    }

    const { default_email_address, ignore_email_checks = [] } = options;

    if (!default_email_address) {
      console.error("Configuration error: No default email address specified.");
      return;
    }

    if (ignore_email_checks.includes(message.to)) {
      console.log(
        `Recipient ${message.to} is in the ignore list. Forwarding to default address.`,
      );
      await safeForward(message, default_email_address, default_email_address);
      return;
    }

    if (!env.EMAIL_SECRET_MAPPING) {
      console.error("EMAIL_SECRET_MAPPING is not set. Cannot process email.");
      return;
    }

    let secretKeyMap: Record<string, string>;
    try {
      secretKeyMap = JSON.parse(env.EMAIL_SECRET_MAPPING);
    } catch (error) {
      console.error("Failed to parse EMAIL_SECRET_MAPPING:", error);
      return;
    }

    try {
      const destinationEmail = await validateEmailAlias({
        keysRecipientMap: secretKeyMap,
        fullAlias: message.to,
      });

      if (destinationEmail && destinationEmail !== "") {
        console.log(
          `Forwarding email for alias ${message.to} to ${destinationEmail}`,
        );
        await safeForward(message, destinationEmail, default_email_address);
      } else {
        console.error(`No valid destination email for alias ${message.to}.`);
        return;
      }
    } catch (error) {
      console.error(
        `Error validating alias ${message.to} with a secret:`,
        error,
      );
      return;
    }
  },
};
