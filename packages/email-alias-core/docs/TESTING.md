# Testing Documentation

This document describes the comprehensive testing strategy for the email-alias-core library, which is designed to work consistently across Node.js, Cloudflare Workers, and browser extensions.

## Test Structure

### 1. Core Functionality Tests (`src/__tests__/index.test.ts`)

- Tests the main `generateEmailAlias`, `validateEmailAlias`, and `generateSecureRandomString` functions
- Validates input handling, error cases, and edge cases
- Ensures deterministic behavior and proper validation logic
- Tests URL-safe random string generation across different lengths and scenarios

### 2. Crypto Implementation Tests (`src/__tests__/crypto.test.ts`)

- Tests the universal crypto module that works across different environments
- Validates proper fallback behavior for different JavaScript environments
- Ensures Web Crypto API is properly detected and used

### 3. Cross-Environment Consistency Tests (`src/__tests__/cross-environment.test.ts`)

- Verifies that the same inputs produce identical outputs across environments
- Tests edge cases like Unicode characters, special characters, and long inputs
- Validates performance consistency and concurrent operations
- Ensures `generateSecureRandomString` produces URL-safe strings consistently across all environments

### 4. Verified Test Vectors (`src/__tests__/test-vectors.test.ts`)

- Contains known test vectors with expected outputs
- Critical for verifying cross-environment compatibility
- These vectors must produce identical results in all target environments

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test src/__tests__/crypto.test.ts

# Run tests with verbose output
npm test -- --verbose

# Run tests in watch mode
npm test -- --watch
```

## Cross-Environment Verification

The library has been tested and verified to work consistently across:

### Node.js Environment

- **Tested Version**: Node.js v22.14.0
- **Platform**: macOS ARM64
- **Crypto Implementation**: Node.js built-in `webcrypto` from `node:crypto`

### Cloudflare Workers

- **Crypto Implementation**: Built-in Web Crypto API via `globalThis.crypto`
- **Compatibility**: Verified with Workers Runtime API

### Browser Extensions

- **Chrome Extensions**: Uses `globalThis.crypto` or `window.crypto`
- **Firefox Extensions**: Uses `globalThis.crypto` or `self.crypto`
- **Compatibility**: Manifest V2 and V3 compatible

## Verified Test Vectors

The following test vectors have been verified to produce identical results across all supported environments:

### Basic Case

```javascript
{
  secretKey: "test-secret-key-123",
  aliasParts: ["service", "provider"],
  domain: "example.com",
  hashLength: 8,
  expectedAlias: "service-provider-74e423d7@example.com"
}
```

### Multi-part Alias

```javascript
{
  secretKey: "another-key-456",
  aliasParts: ["shop", "amazon", "electronics"],
  domain: "test.com",
  hashLength: 12,
  expectedAlias: "shop-amazon-electronics-615c8da60c8d@test.com"
}
```

### Short Hash

```javascript
{
  secretKey: "short-hash-key",
  aliasParts: ["news", "tech"],
  domain: "newsletter.com",
  hashLength: 6,
  expectedAlias: "news-tech-73e26c@newsletter.com"
}
```

### Long Hash

```javascript
{
  secretKey: "long-hash-key-for-testing",
  aliasParts: ["social", "media"],
  domain: "social.net",
  hashLength: 16,
  expectedAlias: "social-media-6cc7df94be59dd17@social.net"
}
```

### Special Characters

```javascript
{
  secretKey: "special-chars-key",
  aliasParts: ["test-123", "service_name", "with.dots"],
  domain: "special.example.org",
  hashLength: 10,
  expectedAlias: "test-123-service_name-with.dots-730329e43d@special.example.org"
}
```

### Random String Generation

The `generateSecureRandomString` function has been tested with various scenarios:

#### Length Testing

```javascript
// Test various lengths
[1, 5, 10, 20, 32, 64, 100, 1000].forEach((length) => {
  const result = generateSecureRandomString(length);
  expect(result).toHaveLength(length);
  expect(result).toMatch(/^[A-Za-z0-9_-]*$/); // URL-safe characters only
});
```

#### URL-Safe Encoding

```javascript
{
  description: "URL-safe base64 without padding",
  input: 32,
  expectations: [
    "No + characters (replaced with -)",
    "No / characters (replaced with _)",
    "No = padding characters",
    "Only A-Z, a-z, 0-9, -, _ characters"
  ]
}
```

#### Uniqueness and Entropy

```javascript
{
  description: "Statistical uniqueness test",
  iterations: 1000,
  length: 32,
  expectations: [
    "All generated strings are unique",
    "Good character distribution",
    "No single character dominates (>20% frequency)"
  ]
}
```

## Crypto Implementation Details

The library uses a sophisticated crypto detection system that supports both SubtleCrypto and getRandomValues:

1. **Modern Browsers/Workers**: Uses `globalThis.crypto.subtle` and `globalThis.crypto.getRandomValues`
2. **Older Browsers**: Falls back to `window.crypto.subtle` and `window.crypto.getRandomValues`
3. **Web Workers**: Uses `self.crypto.subtle` and `self.crypto.getRandomValues`
4. **Node.js 16+**: Uses `require("node:crypto").webcrypto` for both subtle crypto and random values
5. **Older Node.js**: Falls back to `require("crypto").webcrypto`

## Performance Benchmarks

Based on testing in Node.js v22.14.0:

- **Alias Generation**: ~0.04ms per alias on average
- **Alias Validation**: ~0.06ms per alias on average
- **Random String Generation**: ~0.01ms per string (32 chars) on average
- **Memory Usage**: Minimal, no memory leaks detected
- **Concurrent Operations**: Handles 100+ concurrent operations efficiently

## Testing in Different Environments

### Node.js Testing

```bash
# Standard Node.js testing
npm test

# Test with different Node.js versions using nvm
nvm use 16 && npm test
nvm use 18 && npm test
nvm use 20 && npm test
```

### Cloudflare Workers Testing

```bash
# Use wrangler for local development
wrangler dev

# Deploy to Workers for testing
wrangler deploy
```

### Browser Extension Testing

1. Load the extension in Chrome/Firefox developer mode
2. Open developer console
3. Run the test vectors manually
4. Verify identical outputs

## Continuous Integration

The test suite is designed to run in CI/CD environments:

- Uses `NODE_OPTIONS='--experimental-vm-modules'` for ES modules
- All tests are deterministic and environment-independent
- No external dependencies or network calls required

## Debugging Failed Tests

If tests fail in your environment:

1. **Check Node.js Version**: Ensure Node.js 16+ for Web Crypto API support
2. **Verify Crypto Implementation**: Run the environment info test
3. **Check Test Vectors**: Compare your results with the verified vectors
4. **Environment Logs**: Enable verbose logging to see crypto implementation details

### Common Issues

- **Missing Web Crypto API**: Upgrade to Node.js 16+
- **Import Errors**: Ensure proper ES module configuration
- **Different Hash Results**: Indicates crypto implementation differences

## Test Coverage

The test suite covers:

- ✅ All public API functions (`generateEmailAlias`, `validateEmailAlias`, `generateSecureRandomString`)
- ✅ Error handling and edge cases
- ✅ Cross-environment compatibility
- ✅ Performance characteristics
- ✅ Security properties (deterministic HMAC, cryptographically secure random generation)
- ✅ Unicode and special character handling
- ✅ Concurrent operation safety
- ✅ URL-safe string encoding and character set validation

## Security Testing

- **HMAC Consistency**: Verified identical HMAC-SHA256 signatures across environments
- **Deterministic Output**: Same inputs always produce same outputs for aliases
- **Cryptographic Randomness**: `generateSecureRandomString` uses cryptographically secure random number generation
- **No Timing Attacks**: All operations use constant-time crypto primitives
- **Secret Key Isolation**: Different keys produce different, unrelated outputs
- **URL-Safe Encoding**: Random strings are guaranteed to be URL-safe without encoding

## Regression Testing

The verified test vectors serve as regression tests. Any change that breaks these vectors indicates a breaking change in the crypto implementation or algorithm.

## Future Testing Considerations

- **Deno Support**: Test vectors ready for Deno environment verification
- **Web Assembly**: Prepared for WebAssembly crypto implementations
- **Additional Browsers**: Test vectors can verify Safari, Edge compatibility
- **Mobile Environments**: React Native, Capacitor compatibility testing
- **Random String Applications**: Testing integration with password generation, session tokens, and API keys
