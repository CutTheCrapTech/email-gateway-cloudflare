# Continuous Integration (CI) and Continuous Deployment (CD)

This project utilizes GitHub Actions for its CI/CD pipelines, ensuring code quality, automated testing, and streamlined deployments.

## Core CI Workflow (`.github/workflows/ci.yaml`)

The main CI workflow runs on every push to `main` and `feature/**` branches, and on every pull request targeting `main`. Its primary responsibilities include:

-   **Checkout Repository**: Fetches the latest code.
-   **Install pnpm**: Ensures the correct package manager is available.
-   **Setup Node.js**: Configures the Node.js environment with caching for `pnpm` dependencies.
-   **Install Dependencies**: Installs all project dependencies using `pnpm install --frozen-lockfile`.
-   **Run Comprehensive CI Checks**: Executes the `pnpm run ci` command, which typically includes:
    -   Type checking
    -   Linting
    -   Unit and integration tests
    -   Build verification

## Changeset Check Workflow (`.github/workflows/check-changesets.yaml`)

This workflow runs on pull requests to `main` and helps maintain proper versioning and changelog generation. It:

-   Detects if user-facing code changes are present in a pull request.
-   Checks if a corresponding [Changeset](https://github.com/changesets/changesets) has been added.
-   Comments on the pull request to remind contributors to add a changeset if needed.

## Versioning Workflow (`.github/workflows/version.yaml`)

This workflow is responsible for versioning packages based on changesets and creating release pull requests. It triggers on:

-   Manual dispatch (`workflow_dispatch`).
-   Pull requests closed to `main`.
-   Pushes to `main`.

It uses the `changesets/action` to:

-   Increment package versions.
-   Update `CHANGELOG.md` files.
-   Create a "Version packages" pull request (or commit directly on `main` after PR merge).

## Publishing Workflow (`.github/workflows/publish.yaml`)

This workflow handles the publication of packages and deployments. It is primarily triggered manually via `workflow_dispatch` and can perform the following actions:

-   **Create GitHub Releases**: Generates new GitHub releases for published packages.
-   **Publish to npm**: Publishes updated packages to the npm registry.
-   **Publish Browser Extensions**: Calls a reusable workflow (`publish-extensions.yaml`) to deploy browser extensions.
-   **Deploy Cloudflare Workers**: Calls a reusable workflow (`publish-worker.yaml`) to deploy Cloudflare Workers to specified environments (e.g., production, staging).

This workflow leverages the `changesets/action` for publishing and orchestrates the deployment of different application components.

**`workflow_dispatch` Inputs:**
- `create_releases` (boolean, default: `true`): Whether to create GitHub releases.
- `publish_npm` (boolean, default: `true`): Whether to publish to npm.
- `publish_extensions` (boolean, default: `false`): Whether to publish browser extensions.
- `publish_worker` (boolean, default: `false`): Whether to deploy Cloudflare Worker.

## Publish Extensions Workflow (`.github/workflows/publish-extensions.yaml`)

This reusable workflow is called by the `publish.yaml` workflow (or can be triggered manually via `workflow_dispatch`). It is responsible for publishing browser extensions. Key features include:

-   **Package Filtering**: Allows filtering extensions to publish based on package name.
-   **Force Publish**: Option to force publication even if no changes are detected.
-   **Environment Variables**: Utilizes secrets for API keys and client credentials for different browser stores (e.g., Firefox, Chrome).

**`workflow_dispatch` Inputs:**
- `package_filter` (string, optional): Package name filter (e.g., 'my-extension').
- `force_publish` (boolean, default: `false`): Force publish even if no changes detected.

## Deploy Workers Workflow (`.github/workflows/publish-worker.yaml`)

This reusable workflow is called by the `publish.yaml` workflow (or can be triggered manually via `workflow_dispatch`). It is responsible for deploying Cloudflare Workers. Key features include:

-   **Environment Selection**: Allows specifying the deployment environment (e.g., `production`, `staging`).
-   **Package Filtering**: Allows filtering workers to deploy based on package name.
-   **Force Deploy**: Option to force deployment even if no changes are detected.
-   **Environment Variables**: Utilizes secrets for Cloudflare API token and account ID.

**`workflow_dispatch` Inputs:**
- `environment` (choice, default: `production`): Deployment environment (`production` or `staging`).
- `package_filter` (string, optional): Package name filter (e.g., 'my-worker').
- `force_deploy` (boolean, default: `false`): Force deploy even if no changes detected.
