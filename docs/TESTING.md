# Testing Documentation

This document describes the comprehensive testing strategy for the `email-gateway-cloudflare` project, a Cloudflare Worker that processes incoming emails and forwards them based on validated aliases.

## Test Structure

The test suite is located in `src/__tests__/worker.test.ts` and focuses on unit and integration testing of the email worker's logic.

### Key Components Tested:

-   **Input Validation**: Ensures that incoming email messages have the required `to` and `from` fields.
-   **Configuration Handling**: Verifies that the worker correctly parses and validates environment variables (`EMAIL_OPTIONS`, `EMAIL_SECRET_MAPPING`).
-   **Ignore List**: Tests that emails from senders in the `ignore_email_checks` list are forwarded to the default address without further processing.
-   **Email Alias Validation**:
    -   Mocks the `email-alias-core` library to isolate the worker's logic.
    -   Tests the successful validation of an email alias and subsequent forwarding to the correct destination.
    -   Tests the fallback mechanism, ensuring that emails are forwarded to the default address if the alias is invalid or validation fails.
-   **Error Handling**: Checks that the worker gracefully handles errors during email forwarding and configuration parsing.

## Mocking Dependencies

To ensure focused unit tests, the following dependencies are mocked:

-   **`email-alias-core`**: The `validateEmailAlias` function is mocked to simulate different validation outcomes (success, failure, `null`/`undefined` return). This allows testing of the worker's response to the validation logic without depending on the actual implementation of the core library.
-   **`console` methods**: `console.log`, `console.error`, and `console.warn` are suppressed during tests to keep the test output clean.

## Running Tests

```bash
# Run all tests
npm test

# Run tests with verbose output
npm test -- --verbose

# Run tests in watch mode
npm test -- --watch
```

## Test Scenarios

The test suite covers a variety of scenarios to ensure the worker's reliability:

-   **Successful Flow**: An email with a valid alias is correctly forwarded to the destination address.
-   **Fallback to Default**:
    -   The alias validation returns `null` or `undefined`.
    -   The `EMAIL_SECRET_MAPPING` is missing or invalid.
    -   The sender is on the ignore list.
-   **Configuration Errors**:
    -   `EMAIL_OPTIONS` is missing or contains invalid JSON.
    -   `default_email_address` is not specified.
-   **Input Errors**: The incoming email is missing the `to` or `from` field.
-   **Forwarding Failures**: The test checks that errors from the `message.forward()` are caught and logged appropriately.

## Continuous Integration

The test suite is an integral part of the CI pipeline defined in `.github/workflows/ci.yaml`. Every push and pull request triggers the `npm run ci` command, which includes running the full test suite. This ensures that no code that breaks the existing functionality is merged.
