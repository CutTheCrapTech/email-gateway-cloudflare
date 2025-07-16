import { generateEmailAlias as coreGenerateAlias } from "email-alias-core";
import { ApiError } from "./errors";
import { loadSettings } from "./storage";

export { ApiError };

/**
 * Generates an email alias by orchestrating settings retrieval and calling the core library.
 *
 * This function performs the following steps:
 * 1. Validates the incoming alias parts array.
 * 2. Loads the user's domain and token from browser storage.
 * 3. Validates that the settings are configured.
 * 4. Calls the `email-alias-core` library to perform the cryptographic generation.
 * 5. Returns the generated alias string.
 *
 * @param aliasParts - An array of strings to be joined for the alias (e.g., ['shopping', 'amazon']).
 * @returns A promise that resolves to the generated email alias string.
 * @throws {ApiError} - Throws a custom error if settings are missing, the parts are invalid,
 *                      or if the core library fails.
 */
export async function generateEmailAlias(
  aliasParts: string[],
): Promise<string> {
  // 1. Validate the input array and its contents
  if (!aliasParts || aliasParts.length !== 2) {
    throw new ApiError(
      "Invalid input: exactly two parts (Label and Source) are required.",
    );
  }
  if (aliasParts.some((part) => !part || part.trim() === "")) {
    throw new ApiError("Both Label and Source fields are required.");
  }

  // 2. Load settings from storage
  const settings = await loadSettings();
  const { domain, token } = settings;

  // 3. Validate that the settings are configured
  if (!domain || !token) {
    throw new ApiError(
      "Domain and Token are not configured. Please go to the extension options to set them up.",
    );
  }

  try {
    // 4. Call the core library to generate the alias.
    const result = await coreGenerateAlias({
      aliasParts, // Pass the array directly
      domain,
      secretKey: token,
    });

    return result;
  } catch (error: unknown) {
    // 5. Catch potential errors from the core library and re-throw as an ApiError
    console.error("Error during alias generation from core library:", error);

    // Safe error message extraction
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";

    // Throw a new ApiError with the extracted message
    throw new ApiError(`Failed to generate alias: ${errorMessage}`);
  }
}
