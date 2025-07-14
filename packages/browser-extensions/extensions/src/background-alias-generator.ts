import { generateEmailAlias } from "./api";
import { extractDomainForSource, getDefaultLabel } from "./domain";
import { ApiError } from "./errors";

/**
 * Generates an email alias for use in background scripts.
 * This is a simplified version that uses default values.
 * @returns Promise that resolves to the generated email alias
 */
export async function generateAliasForBackground(): Promise<string> {
  try {
    const defaultLabel = await getDefaultLabel();
    const domain = extractDomainForSource();

    return await generateEmailAlias([defaultLabel, domain]);
  } catch (error) {
    if (error instanceof Error) {
      throw new ApiError(error.message);
    }
    throw new ApiError("Failed to generate alias");
  }
}

/**
 * Enhanced version that takes tab URL for better source extraction.
 * @param tabUrl The URL of the current tab
 * @returns Promise that resolves to the generated email alias
 */
export async function generateAliasForBackgroundWithUrl(
  tabUrl?: string,
): Promise<string> {
  try {
    const defaultLabel = await getDefaultLabel();
    const domain = extractDomainForSource(tabUrl);

    return await generateEmailAlias([defaultLabel, domain]);
  } catch (error) {
    if (error instanceof Error) {
      throw new ApiError(error.message);
    }
    throw new ApiError("Failed to generate alias");
  }
}
