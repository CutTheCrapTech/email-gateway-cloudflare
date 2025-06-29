# email-alias-core

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![npm version](https://img.shields.io/npm/v/email-alias-core.svg)

A zero-dependency library to create and verify secure email aliases for custom domains.

---

## Core Concept

`email-alias-core` allows you to generate unique, secure, and verifiable email aliases for your custom domain. Instead of using your real email address for online services, you can generate an alias like `shop-amazon-a1b2c3d4@your-domain.com`.

The system is "verifiable" because it uses a secret key and HMAC-SHA256 to generate a cryptographic signature for each alias. This means your email infrastructure (e.g., a Cloudflare Worker) can instantly verify if an incoming email is addressed to a legitimately generated alias, effectively stopping spam and phishing attempts sent to guessed addresses.

This library provides the core functions to `generate` new aliases and `validate` existing ones.

## Why Use This System vs. a Simple Catch-All?

A common way to create aliases is with a "catch-all" address (`*@your-domain.com`), which forwards all mail to your inbox. While simple, this approach has a major vulnerability: it becomes a magnet for spam. Spammers run dictionary attacks, sending mail to common names like `info@`, `contact@`, and `billing@` at thousands of domains. With a catch-all, you receive all of this junk mail.

This HMAC-based system solves that problem at the source. An alias is only considered valid if its signature can be cryptographically verified with your secret key. When a spammer sends an email to a guessed address like `billing-random-characters@your-domain.com`, the signature will not match. Your email infrastructure (e.g., a Cloudflare Worker) will reject the email before it ever has a chance to reach your inbox.

This provides the convenience of on-the-fly alias creation without the massive spam vulnerability of a traditional catch-all.

## Features

- **Secure:** Uses HMAC-SHA256 with a secret key you control.
- **Zero-Dependency:** Runs in any modern JavaScript environment (Node.js, Deno, Browsers, Cloudflare Workers) without any external packages.
- **Isomorphic:** The same code works on the server for validation and on the client for generation.
- **Flexible:** Allows for categorization of aliases using multiple parts (e.g., `['type', 'service']`).
- **MIT Licensed:** Free to use for any project, commercial or open source.

## Installation

```bash
npm install email-alias-core
```

or

```bash
yarn add email-alias-core
```

## Usage

The library exports two main functions: `generateEmailAlias` and `validateEmailAlias`.

```javascript
import { generateEmailAlias, validateEmailAlias } from 'email-alias-core';

const config = {
  secretKey: 'a-very-secret-key-that-is-long-enough',
  domain: 'example.com',
};

// --- Generating an Alias ---

async function createAlias() {
  const alias = await generateEmailAlias({
    ...config,
    aliasParts: ['shop', 'amazon'],
  });
  console.log(alias);
  // Example output: shop-amazon-a1b2c3d4@example.com
}

// --- Validating an Alias ---

async function checkAlias(incomingAlias) {
  const isValid = await validateEmailAlias({
    ...config,
    fullAlias: incomingAlias,
  });

  if (isValid) {
    console.log(`'${incomingAlias}' is a legitimate alias.`);
  } else {
    console.log(`'${incomingAlias}' is NOT a valid alias. Rejecting email.`);
  }
}

createAlias();
checkAlias('shop-amazon-a1b2c3d4@example.com');
checkAlias('shop-amazon-ffffffff@example.com');
```

## API

### `generateEmailAlias(options)`

Returns a `Promise<string>` with the full email alias.

- `options` `<Object>`
  - `secretKey` `<string>`: **Required.** Your master secret key.
  - `aliasParts` `<string[]>`: **Required.** An array of strings to form the identifiable part of the alias (e.g., `['shop', 'amazon']`).
  - `domain` `<string>`: **Required.** Your custom domain (e.g., 'example.com').
  - `hashLength` `<number>`: _Optional._ The length of the HMAC signature. **Defaults to 8.**

### `validateEmailAlias(options)`

Returns a `Promise<boolean>` indicating if the alias is valid.

- `options` `<Object>`
  - `secretKey` `<string>`: **Required.** Your master secret key.
  - `fullAlias` `<string>`: **Required.** The full email alias to validate.
  - `hashLength` `<number>`: _Optional._ The length of the hash in the alias. **Defaults to 8.** Must match the length used during generation.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to check the [issues page](https://github.com/karteekiitg/email-alias-core/issues).
