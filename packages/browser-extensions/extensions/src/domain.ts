import psl from "psl";
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

    // Use psl to properly extract the domain name
    const parsed = psl.parse(domain);
    if (!parsed || parsed.error) {
      // Fallback to simple split if psl fails
      const parts = domain.split(".");
      if (parts.length >= 2) {
        return parts[parts.length - 2] || "";
      }
      return parts[0] || "";
    }

    // If there's an sld (normal case), return it
    if (parsed.sld) {
      return parsed.sld;
    }

    // If no sld but there's a subdomain, it means the domain is a public suffix
    if (parsed.subdomain) {
      return parsed.subdomain.split(".")[0] || "";
    }

    // Final fallback: split the original domain and take second-to-last part
    const parts = domain.split(".");
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
