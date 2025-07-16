# Email Alias Extensions

**A browser extension for Firefox & Chrome that generates secure, verifiable email aliases for your custom domain.**

This project provides a browser extension that allows you to quickly generate unique email aliases on the fly. It is built on top of the [`email-alias-core`](../email-alias-core/) library and is designed for users who own a custom domain with a catch-all email address configured.

## Features

- **Secure Alias Generation**: Generate strong, unique email aliases directly in your browser using cryptographic algorithms.
- **Resilient & Recoverable**: Uses the "Key Ring Model" so that losing a key is not a catastrophic event.
- **Tracker-Free Emails**: Designed to work with services like [Cloudflare Workers](#integration-with-cloudflare-workers) to clean email trackers.
- **Cross-Browser Support**: Works seamlessly on [Chrome](https://chromewebstore.google.com/detail/email-alias-generator/ghhkompkfhenihpidldalcocbfplkdgm) & [Firefox](https://addons.mozilla.org/en-US/firefox/addon/email-alias-generator-hmac/) with manifest v3.
- **Guided Setup**: An easy-to-use options page helps you generate and back up your secret key with secure random generation.
- **Context Menu & Shortcuts**: Quickly generate aliases from any webpage or with customizable keyboard shortcuts.
- **Toast Notifications**: Real-time feedback with success/error notifications for better user experience.
- **Improved Error Handling**: Comprehensive error handling and user-friendly error messages.
- **Enhanced UI**: Modern, responsive design with dark mode support and improved accessibility.

## Security and Recovery: The "Key Ring Model"

This extension uses a **"Key Ring Model"** to provide a balance of high security and user-friendly recovery.

- **Your Worker is the Key Ring**: The Cloudflare Worker is designed to hold multiple secret keys (e.g., `SECRET_1`, `SECRET_2`). It can cryptographically validate incoming emails against any key on its ring.
- **Your Extension Holds One Key**: The browser extension only ever stores one "active" key at a time, which it uses to generate new aliases.
- **Graceful Recovery**: If you ever lose the key stored in your browser (e.g., by clearing your browser data or moving to a new computer and you haven't backed up your key to a password manager), **your old aliases will continue to work perfectly**. To recover and continue to be able to generate new aliases, you simply use the extension's "Generate New Key" feature and add the new key to your Worker's configuration (and your password manager, please don't lose it this time). This makes recovery a minor inconvenience, not a catastrophic failure.

### What Happens If I Lose My Key?

- **You WILL NOT lose emails.** Aliases generated with old keys will still be validated by the worker and delivered to your inbox.
- **To fix it:** Go to the extension's Options page, generate a new key, and add it as a new secret variable to your Cloudflare Worker deployment.

### What Happens If a Key is Stolen?

- **The Risk**: If an attacker steals a key, they can generate aliases that your worker will see as valid, potentially sending you sophisticated spam/phishing emails.
- **The Solution**: This is why it is **critical** to store your keys securely in a password manager. If you suspect a key is compromised, you should immediately **deactivate it**. To do this, simply remove the compromised secret from your Worker's environment variables in the Cloudflare dashboard. The change will take effect automatically without needing to change any code. **All** emails generated with that **deactivated key** will no longer be delivered, protecting you from the attacker.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v22 or later recommended)
- [npm](https://www.npmjs.com/) (v9 or later)

### Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/CutTheCrapTech/email-gateway-cloudflare.git
    cd email-gateway-cloudflare/
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Run quality checks:
    ```bash
    pnpm run check
    ```

### Build

To build the extensions for Chrome and Firefox:

```bash
pnpm run build
```

For development, run all quality checks:

```bash
pnpm run format  # Format code
pnpm run lint    # Check code quality
pnpm run test    # Run tests
pnpm run type-check  # TypeScript type checking
```

## Browser Installation

### Chrome

1.  Navigate to `chrome://extensions`.
2.  Enable **Developer mode**.
3.  Click **Load unpacked** and select `dist/chrome`.

### Firefox

1.  Navigate to `about:debugging`.
2.  Click **This Firefox** > **Load Temporary Add-on**.
3.  Select `dist/firefox/manifest.json`.

## Usage

1.  **Configure Settings**:
    - Open the extension's **Options** page.
    - Enter your domain (e.g., `example.com`).
    - Click **"Generate New Key"** to create a cryptographically secure secret key.
    - **CRITICAL:** Use the provided buttons to copy the key and save it immediately to a secure password manager (like Bitwarden or 1Password).
    - Check the box confirming you have backed up the key.
    - Click **Save**.

2.  **Deploy to Cloudflare**:
    - Add the generated key as a new secret variable to your Cloudflare Worker's configuration (e.g., `SECRET_1`, `SECRET_2`).
    - Deploy your worker.

3.  **Generate Aliases**:
    - Click the extension icon in the toolbar.
    - Enter a label (e.g., `shopping`) and source (e.g., `amazon.com`).
    - Click **Generate** and copy the alias.
    - Success notifications will confirm when aliases are generated and copied.

4.  **Context Menu**:
    - Right-click on any webpage to generate an alias for the current domain.
    - The dialog will auto-fill the source based on the current website.

5.  **Keyboard Shortcuts**:
    - **Open Dialog**: `Ctrl+Shift+E` - Opens the alias generator popup
    - **Fill Current Field**: `Ctrl+Shift+U` - Generates and fills email input on the current page
    - **Quick Generate**: `Ctrl+Shift+Y` - Generates an alias and copies it to clipboard
    - Shortcuts can be customized in your browser's extension settings.

6.  **Enhanced Features**:
    - **Toast Notifications**: Get real-time feedback for successful operations and errors.
    - **Auto-fill Detection**: The extension detects email fields and can auto-fill them.
    - **Dark Mode**: Automatically adapts to your browser's theme preference.

## Integration with Cloudflare Workers

This extension pairs perfectly with a Cloudflare Workers setup to:

- Validate incoming emails against your "Key Ring".
- Clean email trackers for enhanced privacy.
- Forward emails to your primary address.
- Eliminate spam even when using catch-all addresses.

For more information on setting up the worker, see the [`cloudflare-worker` documentation](../cloudflare-worker/README.md).

## Development

This project uses a modern TypeScript monorepo structure with comprehensive tooling:

### CSS Architecture

The CSS has been modularized for better maintainability:

- `css/variables.css` - CSS custom properties and color themes
- `css/base.css` - Typography and basic layout
- `css/forms.css` - Form elements and inputs
- `css/buttons.css` - Button styles and variants
- `css/components.css` - Reusable UI components
- `css/layout.css` - Grid, flexbox utilities, and responsive design
- `css/popup.css` - Popup-specific styles
- `css/shortcuts.css` - Keyboard shortcut related styles
- `css/toast.css` - Toast notification system
- `css/dialog.css` - Modal dialog styles

### Quality Assurance

- **TypeScript**: Full type safety across the codebase
- **Testing**: Comprehensive test suite with Vitest
- **Linting**: Code quality enforced with Biome
- **Formatting**: Consistent code style with Biome formatter
- **CI/CD**: Automated checks on all commits

### Running Tests

```bash
pnpm test              # Run all tests
pnpm run test:watch    # Run tests in watch mode
pnpm run type-check    # TypeScript type checking
pnpm run lint          # Code quality checks
pnpm run format        # Code formatting
```

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss the changes.

### Before submitting:

1. Ensure all tests pass: `pnpm test`
2. Run type checking: `pnpm run type-check`
3. Format code: `pnpm run format`
4. Fix any linting issues: `pnpm run lint:fix`
5. Test the build: `pnpm run build`
