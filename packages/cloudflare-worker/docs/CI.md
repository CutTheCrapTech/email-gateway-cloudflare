# Continuous Integration (CI) Setup

This document explains the CI/CD setup for the email-gateway-cloudflare project.

## Overview

The project uses a comprehensive CI pipeline that ensures code quality, type safety, and functionality before any code is merged or released.

## Scripts

### Development Scripts

- `pnpm run check` - Runs all quality checks without building (fast feedback for development)
- `pnpm run type-check:all` - Checks TypeScript types for both source and test files
- `pnpm run lint` - Checks code quality and formatting
- `pnpm run test` - Runs the full test suite

### CI/CD Scripts

- `pnpm run ci` - Runs complete CI pipeline (type check + lint + test + build)
- `pnpm run prepublishOnly` - Automatically runs before publishing to npm

## GitHub Actions Workflows

### 1. Continuous Integration (`.github/workflows/ci.yaml`)

**Trigger:** Every push and pull request to `main` branch

**Steps:**

1. Checkout code
2. Setup Node.js LTS
3. Install dependencies with `pnpm install --frozen-lockfile`
4. Run comprehensive CI checks with `pnpm run ci`

This workflow ensures that:

- TypeScript types are correct for both source and test files
- Code follows formatting and quality standards
- All tests pass
- Code builds successfully

### 2. Release (`.github/workflows/release.yaml`)

**Trigger:** Manual workflow dispatch

**Steps:**

1. Checkout code with full history
2. Setup Node.js LTS
3. Install dependencies with `pnpm install --frozen-lockfile`
4. Run comprehensive CI checks with `pnpm run ci`
5. Create semantic release with automated versioning

## TypeScript Configuration

The project uses two TypeScript configurations:

### Source Code (`tsconfig.json`)

- Strict type checking enabled
- Excludes test files to prevent test-specific types from affecting production build
- Optimized for production code quality

### Test Files (`tsconfig.test.json`)

- Extends main config but with relaxed settings for test convenience
- Allows `noUncheckedIndexedAccess: false` for easier array access in tests
- Allows `noPropertyAccessFromIndexSignature: false` for `process.env` access
- Disables unused variable checks (common in test mocks)

## Why This Setup?

### Problem Solved

Previously, IDE errors in test files weren't caught by command-line TypeScript checks because test files were excluded from the main `tsconfig.json`. This caused:

- Silent type errors in tests
- Inconsistent development experience
- Potential runtime failures

### Solution

1. **Separate TypeScript configs** - Source and test files have appropriate type checking
2. **Comprehensive CI script** - Single command runs all necessary checks
3. **GitHub Actions integration** - Automated quality gates
4. **Clear documentation** - Team understands the setup

## Running Checks Locally

```bash
# Quick development check (no build)
pnpm run check

# Full CI pipeline (includes build)
pnpm run ci

# Individual checks
pnpm run type-check          # Source files only
pnpm run type-check:test     # Test files only
pnpm run type-check:all      # Both source and test files
pnpm run lint                # Code quality
pnpm run test                # Test suite
pnpm run build               # Compile TypeScript
```

## Best Practices

1. **Always run `pnpm run check` before committing** - Catches issues early
2. **Use `pnpm run ci` before creating PRs** - Ensures full pipeline passes
3. **Fix linting issues with `pnpm run lint:fix`** - Automatic fixes where possible
4. **Check both source and test types** - Prevents deployment surprises

## Troubleshooting

### TypeScript Errors Only in IDE

- Ensure you're using the latest TypeScript version
- Check if errors are in test files (they now get checked separately)
- Run `pnpm run type-check:all` to see command-line output

### CI Failures

- Run `pnpm run ci` locally to reproduce
- Check each step individually:
  - `pnpm run type-check:all`
  - `pnpm run lint`
  - `pnpm run test`
  - `pnpm run build`

### Linting Issues

- Run `pnpm run lint:fix` for auto-fixable issues
- Some issues require manual fixes (check the output)
- Use `pnpm run lint:unsafe_fix` for more aggressive fixes (review changes carefully)
