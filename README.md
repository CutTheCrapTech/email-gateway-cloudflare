# Email Gateway

This monorepo contains the core components for a secure, verifiable email alias system designed for custom domains. It allows you to generate unique email aliases on the fly, protecting your real email address from spam and tracking.

## Packages

This repository is a monorepo managed by npm workspaces and includes the following packages:

| Package                                                        | Description                                                                              |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [`packages/browser-extensions`](./packages/browser-extensions) | Browser extensions for Firefox & Chrome that generates secure, verifiable email aliases. |
| [`packages/cloudflare-worker`](./packages/cloudflare-worker)   | A Cloudflare Worker that acts as the email gateway, validating and forwarding emails.    |
| [`packages/email-alias-core`](./packages/email-alias-core)     | A zero-dependency library for creating and verifying the HMAC-based email aliases.       |

## Features

- **Secure Alias Generation**: Cryptographically secure aliases using HMAC-SHA256.
- **Spam Protection**: Your email gateway (Cloudflare Worker) rejects emails sent to non-verified aliases, effectively stopping spam from dictionary attacks.
- **Cross-Browser Support**: Browser extensions for both Chrome and Firefox.
- **Easy Development**: A unified development environment with shared tooling and commands.
- **CI/CD Integration**: Automated checks for code quality, testing, and building.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v22 or later)
- [pnpm](https://pnpm.io/) (v10 or later)

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/CutTheCrapTech/email-gateway-cloudflare.git
    cd email-gateway-cloudflare
    ```

2.  Install dependencies from the root of the monorepo:
    ```bash
    pnpm install
    ```

## Development

This monorepo uses pnpm workspaces to manage the packages. Commands can be run for all packages from the root directory.

### Available Scripts

The following scripts are available in the root `package.json` and can be run with `pnpm run <script_name>`:

| Script            | Description                                                                       |
| ----------------- | --------------------------------------------------------------------------------- |
| `version`         | Bumps versions via changesets and then runs post-versioning steps.                |
| `postversion`     | Runs the 'postversion' script in all packages (e.g., to sync manifest versions).  |
| `publish`         | Runs changeset publish.                                                           |
| `clean`           | Clean build artifacts in `dist/` directories.                                     |
| `build`           | Clean and build all packages.                                                     |
| `type-check`      | Check TypeScript types for source files only.                                     |
| `type-check:test` | Check TypeScript types for test files only.                                       |
| `type-check:all`  | Check TypeScript types for both source and test files.                            |
| `format`          | Format code using Biome.                                                          |
| `lint`            | Check code quality and formatting using Biome.                                    |
| `lint:fix`        | Fix auto-fixable linting issues.                                                  |
| `lint:unsafe_fix` | Fix auto-fixable linting issues including unsafe fixes.                           |
| `lint:ci`         | Run Biome in CI mode (stricter).                                                  |
| `test`            | Run tests for all packages.                                                       |
| `check`           | Run all checks (types, lint, tests) - for development.                            |
| `check:ci`        | Run all checks (types, lint, tests) for CI/CD.                                    |
| `ci`              | Run all CI checks including build - for CI/CD.                                    |
| `validate`        | Run all CI checks including build - for dev - similar to CI above but sequential. |
| `upgrade`         | Upgrades dependencies using pnpm.                                                 |

## Project Structure

```
email-gateway-cloudflare/
├── packages/
│   ├── browser-extensions/ # Browser extension source
│   ├── cloudflare-worker/  # Cloudflare worker source
│   └── email-alias-core/   # Core library source
├── .github/                # GitHub Actions workflows
└── ...
```

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to check the [issues page](https://github.com/CutTheCrapTech/email-gateway-cloudflare/issues). Please open an issue first to discuss the changes.

### Before submitting:

1. Ensure everything passes using: `pnpm run validate`
2. Create a changeset: `npx changeset`
