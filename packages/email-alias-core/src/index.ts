/**
 * @license MIT
 * @copyright 2025 karteekiitg
 */

// Import our universal crypto implementation
import { getCryptoInstance } from "./crypto.js";

/**
 * Options for the {@link generateEmailAlias} function.
 * @public
 */
interface GenerateOptions {
  /**
   * The master secret key for HMAC generation.
   */
  secretKey: string;
  /**
   * An array of strings to form the identifiable part of the alias.
   * These will be joined by a hyphen.
   * @example `['shop', 'amazon']`
   */
  aliasParts: string[];
  /**
   * The custom domain for the alias.
   * @example `example.com`
   */
  domain: string;
  /**
   * The desired length of the hexadecimal hash signature.
   * @defaultValue 8
   */
  hashLength?: number;
}

/**
 * Options for the {@link validateEmailAlias} function.
 * @public
 */
interface ValidateOptions {
  /**
   * The keysRecipientMap is a map of key to recipient emails which is used for validation.
   */
  keysRecipientMap: Record<string, string>;
  /**
   * The full email alias to validate.
   * @example `shop-amazon-a1b2c3d4@example.com`
   */
  fullAlias: string;
  /**
   * The length of the hash used in the alias. Must match the length used during generation.
   * @defaultValue 8
   */
  hashLength?: number;
}

/**
 * The core cryptographic function to generate an HMAC-SHA-256 signature.
 * @internal
 */
async function _getHmacSignature(
  secretKey: string,
  data: string,
): Promise<ArrayBuffer> {
  const crypto = getCryptoInstance();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", key, encoder.encode(data));
}

/**
 * Converts an ArrayBuffer to a hexadecimal string.
 * @internal
 */
function _bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generates a verifiable, HMAC-based email alias for a custom domain.
 *
 * @remarks
 * This function is deterministic. Given the same inputs, it will always produce
 * the same output. It is safe to use in any modern JavaScript environment that
 * supports the Web Crypto API.
 *
 * @param options - The options object for generating the alias. See {@link GenerateOptions}.
 * @returns A promise that resolves to the full, generated email alias.
 * @throws An error if `aliasParts` is an empty array.
 *
 * @public
 */
export async function generateEmailAlias({
  secretKey,
  aliasParts,
  domain,
  hashLength = 8,
}: GenerateOptions): Promise<string> {
  if (!aliasParts || aliasParts.length === 0) {
    throw new Error("The `aliasParts` array cannot be empty.");
  }
  if (aliasParts.some((part: string) => typeof part !== "string")) {
    throw new Error("All elements in `aliasParts` must be strings.");
  }

  const localPartPrefix = aliasParts.join("-");
  const signatureBuffer = await _getHmacSignature(secretKey, localPartPrefix);
  const fullHash = _bufferToHex(signatureBuffer);

  // Get first 2 chars of the key as hex
  const keyHint = _bufferToHex(
    new TextEncoder().encode(secretKey).slice(0, 1),
  ).substring(0, 2); // First byte as 2 hex chars

  // Combine key hint + truncated hash
  const truncatedHash = fullHash.substring(0, hashLength - 2); // Reduce by 2 to make room
  const finalHash = keyHint + truncatedHash;

  return `${localPartPrefix}-${finalHash}@${domain}`;
}

/**
 * Validates a verifiable email alias against a secret key.
 *
 * @remarks
 * This function performs the same HMAC signature generation as `generateEmailAlias`
 * and compares the result to the hash in the provided alias.
 * It will gracefully return `false` for any malformed alias string.
 *
 * @param options - The options object for validating the alias. See {@link ValidateOptions}.
 * @returns A promise that resolves to `true` if the alias is valid, and `false` otherwise.
 *
 * @public
 */
export async function validateEmailAlias({
  keysRecipientMap,
  fullAlias,
  hashLength = 8,
}: ValidateOptions): Promise<string> {
  if (!fullAlias || typeof fullAlias !== "string") {
    return "";
  }

  // Regex to parse the alias into its three main components:
  const aliasRegex = new RegExp(`^(.*)-([a-f0-9]{${hashLength}})@(.+)$`);
  const match = fullAlias.match(aliasRegex);
  if (!match) {
    return "";
  }

  // Extract the parts with proper null checking
  const localPartPrefix = match[1];
  const providedHash = match[2];

  // Additional safety check (though this should never happen given our regex)
  if (!localPartPrefix || !providedHash) {
    return "";
  }

  // Extract key hint from first 2 chars
  const keyHint = providedHash.substring(0, 2);
  const actualHash = providedHash.substring(2);

  // Find keys that match this hint
  const candidateKeys = Object.keys(keysRecipientMap).filter((key) => {
    const keyFirstByte = _bufferToHex(
      new TextEncoder().encode(key).slice(0, 1),
    ).substring(0, 2);
    return keyFirstByte === keyHint;
  });

  // Test only the candidate keys (usually 0-2 keys instead of 20!)
  for (const secretKey of candidateKeys) {
    const signatureBuffer = await _getHmacSignature(secretKey, localPartPrefix);
    const fullHash = _bufferToHex(signatureBuffer);
    const expectedHash = fullHash.substring(0, hashLength - 2);

    if (expectedHash === actualHash) {
      const recipient = keysRecipientMap[secretKey];
      if (typeof recipient === "string") {
        return recipient;
      }
      return "";
    }
  }

  return "";
}

/**
 * Generates a cryptographically secure, URL-safe random string.
 *
 * @remarks
 * This function works in browser, Node.js, and Cloudflare Workers environments.
 * It generates random bytes and encodes them as a URL-safe base64 string.
 *
 * @param length - The desired length of the random string in characters.
 * @returns A random URL-safe string.
 * @throws An error if `length` is not a positive integer or if the crypto API is unavailable.
 *
 * @public
 */
export function generateSecureRandomString(length: number): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error("Length must be a positive integer.");
  }

  // Calculate the number of bytes needed to generate a string of the desired length
  // Base64 encoding produces 4 characters for every 3 bytes, so we need ceil(length * 3/4) bytes
  // But we generate a bit more to account for URL-safe replacements and padding removal
  const bytesNeeded = Math.ceil((length * 3) / 4) + 2;

  // Get crypto object with getRandomValues - it's available on the main crypto object
  const crypto = getCryptoInstance();
  const randomBytes = new Uint8Array(bytesNeeded);
  crypto.getRandomValues(randomBytes);

  // Convert to base64 - handle different environments
  let base64: string;
  if (typeof Buffer !== "undefined") {
    // Node.js environment
    base64 = Buffer.from(randomBytes).toString("base64");
  } else if (typeof btoa !== "undefined") {
    // Browser/Cloudflare Workers environment
    base64 = btoa(String.fromCharCode(...randomBytes));
  } else {
    throw new Error("Base64 encoding not available in this environment");
  }

  // Make URL-safe: replace + with -, / with _, and remove padding =
  const urlSafe = base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  // Return the requested length
  return urlSafe.substring(0, length);
}
