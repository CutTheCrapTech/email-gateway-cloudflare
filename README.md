# email-gateway-cloudflare

A Cloudflare Worker for secure email forwarding. It integrates [`email-alias-core`](https://github.com/CutTheCrapTech/email-alias-core) to form a private email gateway on Cloudflare.

## Features

- **Secure Email Forwarding:** Uses HMAC-based email aliases to verify incoming emails, preventing unauthorized use of your email domain.
- **Cloudflare Native:** Built to run entirely on the Cloudflare serverless platform.
- **Infrastructure as Code:** Designed to be deployed via Terraform.

## Architecture

This project consists of a Cloudflare Worker that is the core of the email gateway. It's responsible for:

- Receiving all emails sent to your domain.
- Validating the recipient alias using `email-alias-core`.
- Forwarding the validated email to your real inbox.

### A Note on Email Sanitization

This project was intended to integrate the [`email-sanitizer`](https://github.com/CutTheCrapTech/email-sanitizer) library to strip tracking pixels and clean URLs from incoming emails. However, Cloudflare Email Workers do not currently support modifying the body of an email. Once this feature becomes available, `email-sanitizer` will be integrated.

## Deployment

The final built artifacts from this repository are designed to be consumed by an Infrastructure as Code (IaC) setup, such as Terraform, to deploy the resources to Cloudflare.

The release process is automated via GitHub Actions, which builds the worker script and attaches it to a GitHub Release. Your Terraform configuration can then pull this asset directly.

## Development

### Prerequisites

- Node.js and npm
- A local `git` client

### Building

To build the project locally, install the dependencies and run the build script:

```bash
npm install
npm run build
```

This will generate the bundled JavaScript files in the `dist/` directory.

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
