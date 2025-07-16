# Testing Documentation

This document describes the comprehensive testing strategy for the email-alias-extensions project.

## Test Structure

### 1. API Tests (`extensions/src/__tests__/api.test.ts`)

- Tests the core API functions for generating and validating email aliases.

### 2. API Integration Tests (`extensions/src/__tests__/api.integration.test.ts`)

- Tests the integration of API functions with external services or complex scenarios.

### 3. Background Alias Generator Tests (`extensions/src/__tests__/background-alias-generator.test.ts`)

- Tests the logic for generating aliases in the background script.

### 4. Background Tests (`extensions/src/__tests__/background.test.ts`)

- Tests the logic for background script.

### 5. Content Tests (`extensions/src/__tests__/content.test.ts`)

- Tests the functionality related to the email field detection.

### 6. Domain Tests (`extensions/src/__tests__/domain.test.ts`)

- Tests the functionality of domain detection.

### 7. Options Tests (`extensions/src/__tests__/options.test.ts`)

- Tests the functionality of the extension's options page.

### 8. Popup Tests (`extensions/src/__tests__/popup.test.ts`)

- Tests the logic for extension popup.

### 9. Storage Tests (`extensions/src/__tests__/storage.test.ts`)

- Tests the data storage and retrieval mechanisms of the extension.

## Running Tests

```bash
# Run all tests
pnpm run test

# Run specific test file
pnpm run test extensions/src/__tests__/api.test.ts

# Run tests with verbose output
pnpm run test -- --verbose

# Run tests in watch mode
pnpm run test -- --watch
```

## Cross-Environment Verification

The extensions have been tested and verified to work consistently across:

### Browser Extensions

- **Chrome Extensions**: Uses `globalThis.crypto` or `window.crypto`
- **Firefox Extensions**: Uses `globalThis.crypto` or `self.crypto`
- **Compatibility**: Manifest V2 and V3 compatible

## Continuous Integration

The test suite is designed to run in CI/CD environments:

- Uses `NODE_OPTIONS='--experimental-vm-modules'` for ES modules
- All tests are deterministic and environment-independent
- No external dependencies or network calls required

## Debugging Failed Tests

If tests fail in your environment:

1. **Check Test Vectors**: Compare your results with the verified vectors
2. **Environment Logs**: Enable verbose logging to see crypto implementation details

### Common Issues

- **Import Errors**: Ensure proper ES module configuration

## Test Coverage

The test suite covers:

- ✅ All public API functions
- ✅ Error handling and edge cases
- ✅ Cross-environment compatibility
- ✅ Performance characteristics
- ✅ Security properties (deterministic HMAC)
- ✅ Unicode and special character handling
- ✅ Concurrent operation safety

## Security Testing

- **HMAC Consistency**: Verified identical HMAC-SHA256 signatures across environments
- **Deterministic Output**: Same inputs always produce same outputs
- **No Timing Attacks**: All operations use constant-time crypto primitives
- **Secret Key Isolation**: Different keys produce different, unrelated outputs

## Regression Testing

The verified test vectors serve as regression tests. Any change that breaks these vectors indicates a breaking change in the crypto implementation or algorithm.

## Future Testing Considerations

- **Additional Browsers**: Test vectors can verify Safari, Edge compatibility
- **Mobile Environments**: React Native, Capacitor compatibility testing
