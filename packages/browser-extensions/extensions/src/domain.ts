import browser from "webextension-polyfill";
import { loadSettings } from "./storage";

/**
 * Extracts a clean domain name from a URL to be used as the 'source'.
 * Returns the part immediately before the TLD (top-level domain).
 * @param url The URL to extract domain from (optional, defaults to current page)
 * @returns The extracted domain name (e.g., "google", "amazonaws") or an empty string.
 */
export function extractDomainForSource(url?: string): string {
  try {
    let hostname: string;

    if (url) {
      // If URL is provided, parse it
      const urlObj = new URL(url);
      hostname = urlObj.hostname;
    } else {
      // Use current page's hostname
      hostname = window.location.hostname;
    }

    // Remove common subdomains like 'www.'
    const domain = hostname.replace(/^(www\.)/, "");
    const parts = domain.split(".");

    // For domains like "example.com" -> return "example"
    // For domains like "s3.amazonaws.com" -> return "amazonaws"
    // For domains like "subdomain.example.co.uk" -> return "example"
    if (parts.length >= 2) {
      return parts[parts.length - 2] || "";
    }

    return parts[0] || "";
  } catch (error) {
    console.error("Error extracting domain for source:", error);
    return "";
  }
}

/**
 * Gets the default label for alias generation.
 * First tries to get from stored settings, falls back to 'marketing'.
 * @returns Promise that resolves to the default label string
 */
export async function getDefaultLabel(): Promise<string> {
  try {
    // Try to get from browser storage if available
    if (typeof browser !== "undefined" && browser.storage) {
      const settings = await loadSettings();
      if (settings.defaultLabel && typeof settings.defaultLabel === "string") {
        return settings.defaultLabel;
      }
    }

    // Fall back to default
    return "marketing";
  } catch (error) {
    console.error("Error getting default label:", error);
    return "marketing";
  }
}
