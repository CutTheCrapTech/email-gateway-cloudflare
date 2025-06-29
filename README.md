# email-gateway-cloudflare

A project containing a Cloudflare Worker for secure email forwarding and sanitization, and a Cloudflare Pages Function for generating email aliases. It integrates [`email-alias-core`](https://github.com/your-username/email-alias-core) and [`email-sanitizer`](https://github.com/your-username/email-sanitizer) to form a complete private email gateway on Cloudflare.

## Features

-   **Secure Email Forwarding:** Uses HMAC-based email aliases to verify incoming emails, preventing unauthorized use of your email domain.
-   **Email Sanitization:** Strips known tracking pixels and cleans URLs in incoming emails to enhance privacy.
-   **Alias Generation:** A simple Cloudflare Pages Function provides an endpoint to generate new email aliases on demand.
-   **Cloudflare Native:** Built to run entirely on the Cloudflare serverless platform (Workers and Pages).
-   **Infrastructure as Code:** Designed to be deployed via Terraform.

## Architecture

This project consists of two main components:

1.  **Cloudflare Worker (`worker/`):** This is the core of the email gateway. It's responsible for:
    -   Receiving all emails sent to your domain.
    -   Validating the recipient alias using `email-alias-core`.
    -   Sanitizing the email content (HTML and text) using `email-sanitizer`.
    -   Forwarding the clean, validated email to your real inbox.

2.  **Cloudflare Pages Function (`functions/`):** This is a simple API endpoint that generates new email aliases.
    -   It takes a `service` name as a query parameter.
    -   It uses `email-alias-core` to generate a new, valid email alias for that service.
    -   This can be used to build a simple web UI or for programmatic alias creation.

## Deployment

The final built artifacts from this repository are designed to be consumed by an Infrastructure as Code (IaC) setup, such as Terraform, to deploy the resources to Cloudflare.

The release process is automated via GitHub Actions, which builds the worker and function scripts and attaches them to a GitHub Release. Your Terraform configuration can then pull these assets directly.

## Development

### Prerequisites

-   Node.js and npm
-   A local `git` client

### Building

To build the project locally, install the dependencies and run the build script:

```bash
npm install
npm run build
```

This will generate the bundled JavaScript files in the `dist/` directory.

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
