# email-alias-core

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![npm version](https://img.shields.io/npm/v/email-alias-core.svg)

A zero-dependency library to create and verify secure email aliases for custom domains.

---

## Core Concept

`email-alias-core` allows you to generate unique, secure, and verifiable email aliases for your custom domain. Instead of using your real email address for online services, you can generate an alias like `shop-amazon-74e423d7@your-domain.com`.

**Note:** The alias format now includes a key prefix for efficient validation:
`<aliasParts>-<keyPrefix>-<hash>@domain.com`
where `keyPrefix` is the first 2 hex chars of the secret key, and `hash` is the truncated HMAC signature.

The system is "verifiable" because it uses a secret key and HMAC-SHA256 to generate a cryptographic signature for each alias. This means your email infrastructure (e.g., a Cloudflare Worker) can instantly verify if an incoming email is addressed to a legitimately generated alias, effectively stopping spam and phishing attempts sent to guessed addresses.

This library provides the core functions to `generate` new aliases, `validate` existing ones, and `generate secure random strings` for various use cases.

## Why Use This System vs. a Simple Catch-All?

A common way to create aliases is with a "catch-all" address (`*@your-domain.com`), which forwards all mail to your inbox. While simple, this approach has a major vulnerability: it becomes a magnet for spam. Spammers run dictionary attacks, sending mail to common names like `info@`, `contact@`, and `billing@` at thousands of domains. With a catch-all, you receive all of this junk mail.

This HMAC-based system solves that problem at the source. An alias is only considered valid if its signature can be cryptographically verified with your secret key. When a spammer sends an email to a guessed address like `billing-random-characters@your-domain.com`, the signature will not match. Your email infrastructure (e.g., a Cloudflare Worker) will reject the email before it ever has a chance to reach your inbox.

This provides the convenience of on-the-fly alias creation without the massive spam vulnerability of a traditional catch-all.

## Features

- **Secure:** Uses HMAC-SHA256 with a secret key you control and cryptographically secure random generation.
- **Zero-Dependency:** Runs in any modern JavaScript environment (Node.js, Deno, Browsers, Cloudflare Workers) without any external packages.
- **Isomorphic:** The same code works on the server for validation and on the client for generation.
- **Flexible:** Allows for categorization of aliases using multiple parts (e.g., `['type', 'service']`).
- **URL-Safe:** Generates URL-safe random strings perfect for tokens, keys, and identifiers.
- **MIT Licensed:** Free to use for any project, commercial or open source.

## Installation

```bash
npm install email-alias-core
```

or

```bash
yarn add email-alias-core
```

or

```bash
pnpm install email-alias-core
```

## Usage

The library exports three main functions: `generateEmailAlias`, `validateEmailAlias`, and `generateSecureRandomString`.

```javascript
import {
  generateEmailAlias,
  validateEmailAlias,
  generateSecureRandomString,
} from "email-alias-core";

const config = {
  secretKey: "a-very-secret-key-that-is-long-enough",
  domain: "example.com",
};

// --- Generating an Alias ---

async function createAlias() {
  const alias = await generateEmailAlias({
    ...config,
    aliasParts: ["shop", "amazon"],
  });
  console.log(alias);
  // Example output: shop-amazon-74e423d7@example.com
}

// --- Validating an Alias ---
// NOTE: validateEmailAlias now takes a keysRecipientMap object, not a single secretKey.

async function checkAlias(incomingAlias) {
  // You can map multiple keys to recipients if you rotate keys or support multiple users.
  const keysRecipientMap = {
    "a-very-secret-key-that-is-long-enough": "user@example.com",
    // ...add more keys if needed
  };

  const recipient = await validateEmailAlias({
    keysRecipientMap,
    fullAlias: incomingAlias,
    // hashLength is optional, defaults to 8
  });

  if (recipient) {
    console.log(`'${incomingAlias}' is a legitimate alias for: ${recipient}`);
  } else {
    console.log(`'${incomingAlias}' is NOT a valid alias. Rejecting email.`);
  }
}

// --- Generating Secure Random Strings ---

function createRandomStrings() {
  // Generate a random API key
  const apiKey = generateSecureRandomString(32);
  console.log(`API Key: ${apiKey}`);
  // Example output: API Key: a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6

  // Generate a session token
  const sessionToken = generateSecureRandomString(64);
  console.log(`Session Token: ${sessionToken}`);

  // Use in email alias generation
  const randomService = generateSecureRandomString(8);
  // This could be used as a unique identifier for services
}

createAlias();
checkAlias("shop-amazon-74e423d7@example.com");
checkAlias("shop-amazon-ffffffff@example.com");
createRandomStrings();
```

## API

### `generateEmailAlias(options)`

Returns a `Promise<string>` with the full email alias.

- `options` `<Object>`
  - `secretKey` `<string>`: **Required.** Your master secret key.
  - `aliasParts` `<string[]>`: **Required.** An array of strings to form the identifiable part of the alias (e.g., `['shop', 'amazon']`).
  - `domain` `<string>`: **Required.** Your custom domain (e.g., 'example.com').
  - `hashLength` `<number>`: _Optional._ The length of the HMAC signature (including key prefix). **Defaults to 8.**

**Alias format:**
`<aliasParts>-<keyPrefix><hash>@domain.com`
where `keyPrefix` is the first 2 hex chars of the secret key, and `hash` is the truncated HMAC signature.

### `validateEmailAlias(options)`

Returns a `Promise<string>` with the recipient value if valid, or an empty string if invalid.

- `options` `<Object>`
  - `keysRecipientMap` `<Record<string, string>>`: **Required.** An object mapping secret keys to recipient identifiers (e.g., email addresses or user IDs).
  - `fullAlias` `<string>`: **Required.** The full email alias to validate.
  - `hashLength` `<number>`: _Optional._ The length of the hash in the alias. **Defaults to 8.** Must match the length used during generation.

**Note:**
This function now supports efficient validation with multiple keys by using the key prefix embedded in the alias.

### `generateSecureRandomString(length)`

Returns a `string` containing a cryptographically secure, URL-safe random string.

- `length` `<number>`: **Required.** The desired length of the random string in characters.

**Features:**

- Uses cryptographically secure random number generation (`crypto.getRandomValues`)
- Produces URL-safe base64 encoded strings (using `-` and `_` instead of `+` and `/`)
- No padding characters (`=`) included
- Works consistently across Node.js, browsers, and Cloudflare Workers
- Perfect for API keys, session tokens, unique identifiers, and secure random components

**Example:**

```javascript
// Generate different length strings
const shortId = generateSecureRandomString(8); // e.g., "a1B2c3D4"
const apiKey = generateSecureRandomString(32); // e.g., "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6"
const sessionToken = generateSecureRandomString(64); // 64-character secure token

// Use in alias generation for unique service identifiers
const uniqueService = generateSecureRandomString(6);
const alias = await generateEmailAlias({
  secretKey: "your-secret-key",
  aliasParts: ["temp", uniqueService],
  domain: "example.com",
});
```
